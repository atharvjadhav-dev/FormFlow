import fs from 'fs';
import path from 'path';
import type { AiGenerationOptions, RawAiFormSchema } from './types';
import { processAiModelOutput, AiSchemaValidationError } from './validator';

function getEnvKey(name: string): string | undefined {
  if (process.env.NODE_ENV === 'production') {
    return process.env[name]?.trim();
  }

  // In non-production environments, check process.env first
  if (process.env[name] !== undefined) {
    return process.env[name]?.trim();
  }

  // Fallback to local .env disk file only for local development
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(new RegExp(`^${name}=(.*)$`, 'm'));
      if (match && match[1]) {
        const val = match[1].trim().replace(/^["']|["']$/g, '');
        if (val) {
          return val;
        }
      }
    }
  } catch {}

  return undefined;
}

export const AI_SYSTEM_PROMPT = `You are FormFlow Studio's AI Form Generation Engine.
Your task is to convert a user's natural language request into a valid, production-grade FormFlow form schema JSON.

CRITICAL INSTRUCTIONS:
1. Output ONLY a valid JSON object matching the requested schema. Do not output conversational text or markdown code fences if possible.
2. Supported field types ONLY:
   - "text" (single line text like Name, Title)
   - "email" (email address)
   - "phone" (phone number)
   - "number" (numbers, quantities, age, salary, GPA)
   - "date" (date picker)
   - "dropdown" (select one from list)
   - "radio" (multiple choice single select)
   - "checkbox" (multi-select checkboxes)
   - "textarea" (multi-line text, comments, details)
   - "file" (documents, resume, PDF uploads)
   - "image" (photo, ID card, image uploads)
   - "heading" (section headers to organize form sections)
   - "paragraph" (instructional text or notes)
   - "divider" (visual separator)
3. Grid Widths ONLY:
   - 12 (full width)
   - 6 (half width)
   - 4 (one-third width)
   - 8 (two-thirds width)
   - 3 (one-fourth width)
   - 9 (three-fourths width)
   Use 12-column grid pairs smartly (e.g., First Name width 6 + Last Name width 6; City width 4 + State width 4 + Zip width 4).
4. Conditional Logic:
   Use conditional logic ("visibleIf") ONLY when genuinely helpful (e.g., "Do you require financial assistance?" -> Yes / No; if Yes, show "Annual Family Income" and "Assistance Details").
   CRITICAL DEPENDENCY RULES:
   - The dependency source field MUST appear BEFORE the dependent field in the fields array.
   - A field can NEVER depend on itself.
   - Do NOT depend on heading, paragraph, or divider fields.
   - Supported operators: "equals", "not_equals", "contains", "not_contains", "is_empty", "is_not_empty".
5. For choice fields ("dropdown", "radio", "checkbox"), provide realistic "options" (array of strings).
6. Essential fields must have required: true. Optional fields must have required: false. Layout fields (heading, paragraph, divider) must have required: false.
7. Output JSON structure:
{
  "title": "Clear Form Title",
  "description": "Short description of the form's purpose",
  "fields": [
    {
      "id": "temp_id_1",
      "type": "heading",
      "label": "Section Heading",
      "width": 12,
      "required": false
    },
    {
      "id": "temp_id_2",
      "type": "text",
      "label": "Full Name",
      "placeholder": "Jane Doe",
      "width": 12,
      "required": true
    },
    {
      "id": "temp_id_3",
      "type": "radio",
      "label": "Do you need special accommodations?",
      "options": ["Yes", "No"],
      "width": 12,
      "required": true
    },
    {
      "id": "temp_id_4",
      "type": "textarea",
      "label": "Accommodation Details",
      "placeholder": "Please describe your needs...",
      "width": 12,
      "required": false,
      "visibleIf": {
        "conditions": [
          { "fieldId": "temp_id_3", "operator": "equals", "value": "Yes" }
        ],
        "combinator": "and"
      }
    }
  ]
}`;

function buildUserPrompt(userPrompt: string, options?: AiGenerationOptions): string {
  const parts: string[] = [`Form description: "${userPrompt.trim()}"`];

  if (options?.fieldCountPreference && options.fieldCountPreference !== 'auto') {
    switch (options.fieldCountPreference) {
      case 'compact':
        parts.push('Desired size: Compact (around 5 to 8 fields).');
        break;
      case 'standard':
        parts.push('Desired size: Standard (around 9 to 15 fields).');
        break;
      case 'detailed':
        parts.push('Desired size: Comprehensive/Detailed (16 or more fields).');
        break;
    }
  }

  if (options?.stylePreference && options.stylePreference !== 'standard') {
    parts.push(`Style preference: ${options.stylePreference}.`);
  }

  if (options?.requiredPreference && options.requiredPreference !== 'smart') {
    if (options.requiredPreference === 'all') {
      parts.push('Field requirements: Mark all user input fields as required.');
    } else if (options.requiredPreference === 'minimal') {
      parts.push('Field requirements: Keep required fields to an absolute minimum.');
    }
  }

  parts.push('Generate a complete, structured JSON FormSchema now.');
  return parts.join('\n');
}

/**
 * Extracts and parses JSON from model responses, handling potential markdown wrappers.
 */
function extractJsonFromModelResponse(text: string): unknown {
  const clean = text.trim();
  // Strip markdown code fences if present (e.g. ```json ... ```)
  const jsonMatch = clean.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const target = jsonMatch ? jsonMatch[1].trim() : clean;

  try {
    return JSON.parse(target);
  } catch (err) {
    // If direct parse failed, try finding first '{' and last '}'
    const start = target.indexOf('{');
    const end = target.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const extracted = target.slice(start, end + 1);
      return JSON.parse(extracted);
    }
    throw new Error('AI output was not valid JSON.');
  }
}

/**
 * Deterministic fallback generator for development, testing, or when API keys are not provided.
 */
export function generateDeterministicFallbackForm(
  userPrompt: string,
  options?: AiGenerationOptions,
): RawAiFormSchema {
  const promptLower = userPrompt.toLowerCase();

  if (promptLower.includes('scholarship') || promptLower.includes('college') || promptLower.includes('student')) {
    return {
      title: 'College Scholarship Application',
      description: 'Apply for academic and financial assistance scholarships for the upcoming academic year.',
      fields: [
        { id: 'sec_personal', type: 'heading', label: 'Personal Information', width: 12, required: false },
        { id: 'first_name', type: 'text', label: 'First Name', placeholder: 'Jane', width: 6, required: true },
        { id: 'last_name', type: 'text', label: 'Last Name', placeholder: 'Doe', width: 6, required: true },
        { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane.doe@university.edu', width: 6, required: true },
        { id: 'phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', width: 6, required: true },
        { id: 'dob', type: 'date', label: 'Date of Birth', width: 6, required: true },
        { id: 'sec_academic', type: 'heading', label: 'Academic Background', width: 12, required: false },
        { id: 'institution', type: 'text', label: 'College / University', placeholder: 'State University', width: 6, required: true },
        { id: 'major', type: 'text', label: 'Major / Degree Program', placeholder: 'Computer Science', width: 6, required: true },
        { id: 'gpa', type: 'number', label: 'Current Cumulative GPA', placeholder: '3.85', width: 6, required: true },
        { id: 'grad_year', type: 'dropdown', label: 'Expected Graduation Year', options: ['2026', '2027', '2028', '2029'], width: 6, required: true },
        { id: 'sec_financial', type: 'heading', label: 'Financial Background', width: 12, required: false },
        {
          id: 'financial_aid_needed',
          type: 'radio',
          label: 'Do you require need-based financial assistance?',
          options: ['Yes', 'No'],
          width: 12,
          required: true,
        },
        {
          id: 'annual_income',
          type: 'dropdown',
          label: 'Annual Household Income',
          options: ['Under $30,000', '$30,000 - $60,000', '$60,000 - $100,000', 'Over $100,000'],
          width: 6,
          required: true,
          visibleIf: {
            conditions: [{ fieldId: 'financial_aid_needed', operator: 'equals', value: 'Yes' }],
            combinator: 'and',
          },
        },
        {
          id: 'financial_statement',
          type: 'textarea',
          label: 'Explanation of Financial Need',
          placeholder: 'Briefly explain any circumstances or hardship...',
          width: 12,
          required: true,
          visibleIf: {
            conditions: [{ fieldId: 'financial_aid_needed', operator: 'equals', value: 'Yes' }],
            combinator: 'and',
          },
        },
        { id: 'sec_docs', type: 'heading', label: 'Supporting Documents', width: 12, required: false },
        { id: 'transcript', type: 'file', label: 'Official Academic Transcript (PDF)', width: 6, required: true },
        { id: 'resume', type: 'file', label: 'Resume / Curriculum Vitae', width: 6, required: false },
        {
          id: 'income_proof',
          type: 'file',
          label: 'Income Verification Document (W-2 or Tax Return)',
          width: 12,
          required: true,
          visibleIf: {
            conditions: [{ fieldId: 'financial_aid_needed', operator: 'equals', value: 'Yes' }],
            combinator: 'and',
          },
        },
      ],
    };
  }

  if (promptLower.includes('job') || promptLower.includes('resume') || promptLower.includes('career') || promptLower.includes('hiring')) {
    return {
      title: 'Job Application',
      description: 'Submit your profile and resume for open positions.',
      fields: [
        { id: 'sec_applicant', type: 'heading', label: 'Applicant Details', width: 12, required: false },
        { id: 'full_name', type: 'text', label: 'Full Name', placeholder: 'Alex Smith', width: 6, required: true },
        { id: 'email', type: 'email', label: 'Email Address', placeholder: 'alex.smith@example.com', width: 6, required: true },
        { id: 'phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 123-4567', width: 6, required: true },
        { id: 'linkedin', type: 'text', label: 'LinkedIn Profile URL', placeholder: 'https://linkedin.com/in/...', width: 6, required: false },
        { id: 'sec_experience', type: 'heading', label: 'Professional Experience', width: 12, required: false },
        { id: 'role_applied', type: 'dropdown', label: 'Role Applied For', options: ['Software Engineer', 'Product Designer', 'Product Manager', 'Data Analyst'], width: 6, required: true },
        { id: 'years_experience', type: 'number', label: 'Years of Experience', placeholder: '4', width: 6, required: true },
        {
          id: 'requires_sponsorship',
          type: 'radio',
          label: 'Will you now or in the future require visa sponsorship?',
          options: ['Yes', 'No'],
          width: 12,
          required: true,
        },
        {
          id: 'sponsorship_details',
          type: 'textarea',
          label: 'Visa Status & Sponsorship Details',
          placeholder: 'Please specify your current visa category...',
          width: 12,
          required: true,
          visibleIf: {
            conditions: [{ fieldId: 'requires_sponsorship', operator: 'equals', value: 'Yes' }],
            combinator: 'and',
          },
        },
        { id: 'sec_resume', type: 'heading', label: 'Resume & Documents', width: 12, required: false },
        { id: 'resume_file', type: 'file', label: 'Resume / CV (PDF)', width: 6, required: true },
        { id: 'cover_letter', type: 'textarea', label: 'Cover Letter / Note to Hiring Manager', placeholder: 'Why are you excited about this role?', width: 12, required: false },
      ],
    };
  }

  if (promptLower.includes('event') || promptLower.includes('registration') || promptLower.includes('conference')) {
    return {
      title: 'Event Registration',
      description: 'Register your attendance and preferences for the upcoming conference.',
      fields: [
        { id: 'sec_attendee', type: 'heading', label: 'Attendee Information', width: 12, required: false },
        { id: 'name', type: 'text', label: 'Full Name', placeholder: 'Sarah Connor', width: 6, required: true },
        { id: 'email', type: 'email', label: 'Work Email', placeholder: 'sarah@company.com', width: 6, required: true },
        { id: 'company', type: 'text', label: 'Organization / Company', placeholder: 'Acme Corp', width: 6, required: false },
        { id: 'job_title', type: 'text', label: 'Job Title', placeholder: 'Director of Technology', width: 6, required: false },
        { id: 'ticket_tier', type: 'dropdown', label: 'Ticket Tier', options: ['Standard Pass', 'VIP Conference Pass', 'Student / Academic'], width: 12, required: true },
        { id: 'sec_preferences', type: 'heading', label: 'Attendance Preferences', width: 12, required: false },
        {
          id: 'has_dietary_needs',
          type: 'radio',
          label: 'Do you have dietary restrictions or preferences?',
          options: ['Yes', 'No'],
          width: 12,
          required: true,
        },
        {
          id: 'dietary_restrictions',
          type: 'checkbox',
          label: 'Select Dietary Requirements',
          options: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher', 'Nut Allergy'],
          width: 12,
          required: true,
          visibleIf: {
            conditions: [{ fieldId: 'has_dietary_needs', operator: 'equals', value: 'Yes' }],
            combinator: 'and',
          },
        },
        { id: 'notes', type: 'textarea', label: 'Special Accommodation Requests', placeholder: 'Any accessibility or special requirements...', width: 12, required: false },
      ],
    };
  }

  // Generic intelligent form structure tailored to the user's prompt
  const titleWords = userPrompt.split(' ').slice(0, 5).join(' ');
  const cleanTitle = titleWords.length > 0 ? titleWords.charAt(0).toUpperCase() + titleWords.slice(1) : 'Form Request';

  return {
    title: cleanTitle.endsWith('Form') ? cleanTitle : `${cleanTitle} Form`,
    description: `Form generated to collect structured responses for: ${userPrompt.slice(0, 100)}`,
    fields: [
      { id: 'sec_general', type: 'heading', label: 'General Information', width: 12, required: false },
      { id: 'contact_name', type: 'text', label: 'Your Name', placeholder: 'John Doe', width: 6, required: true },
      { id: 'contact_email', type: 'email', label: 'Email Address', placeholder: 'john@example.com', width: 6, required: true },
      { id: 'contact_phone', type: 'phone', label: 'Phone Number', placeholder: '+1 555-0199', width: 6, required: false },
      { id: 'request_type', type: 'dropdown', label: 'Category / Inquiry Type', options: ['General Inquiry', 'Support Request', 'Feedback', 'Other'], width: 6, required: true },
      { id: 'sec_details', type: 'heading', label: 'Detailed Information', width: 12, required: false },
      { id: 'details_message', type: 'textarea', label: 'Details / Description', placeholder: 'Provide full details here...', width: 12, required: true },
      {
        id: 'has_attachment',
        type: 'radio',
        label: 'Do you want to upload a supporting file?',
        options: ['Yes', 'No'],
        width: 12,
        required: true,
      },
      {
        id: 'upload_document',
        type: 'file',
        label: 'Supporting Document',
        width: 12,
        required: false,
        visibleIf: {
          conditions: [{ fieldId: 'has_attachment', operator: 'equals', value: 'Yes' }],
          combinator: 'and',
        },
      },
    ],
  };
}

/**
 * Server-side AI generation function.
 *
 * 1. Checks provider configuration (OpenAI, Gemini).
 * 2. Executes request with timeout protection.
 * 3. Extracts raw JSON.
 * 4. Runs validation, normalization, and UUID remapping pipeline.
 * 5. Returns validated, clean FormSchema.
 */
export async function callAiModelForFormSchema(
  userPrompt: string,
  options?: AiGenerationOptions,
): Promise<RawAiFormSchema> {
  const geminiKey = getEnvKey('GEMINI_API_KEY') || getEnvKey('GOOGLE_API_KEY');
  const openaiKey = getEnvKey('OPENAI_API_KEY');
  const userContent = buildUserPrompt(userPrompt, options);

  // 1. Google Gemini Integration (Primary)
  if (geminiKey) {
    const defaultModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-pro-latest'];
    const candidateModels = process.env.GEMINI_MODEL
      ? Array.from(new Set([process.env.GEMINI_MODEL, ...defaultModels]))
      : defaultModels;

    let lastError: Error | null = null;

    for (const model of candidateModels) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 35000);

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${AI_SYSTEM_PROMPT}\n\n${userContent}` }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.3,
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const status = response.status;
          if (status === 429) {
            throw new Error('AI provider rate limit reached. Please wait a moment.');
          }
          if (status === 503 || status === 404) {
            lastError = new Error(`Model ${model} returned ${status}`);
            continue;
          }
          throw new Error(`AI service responded with status ${status}`);
        }

        const json = await response.json();
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          throw new Error('AI returned an empty response.');
        }

        const parsed = extractJsonFromModelResponse(rawText);
        return parsed as RawAiFormSchema;
      } catch (err: any) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
          throw new Error('AI generation timed out. Please try again.');
        }
        lastError = err;
        if (err.message?.includes('rate limit')) {
          throw err;
        }
      }
    }

    if (lastError) {
      console.warn('[ai-provider] Gemini API call failed:', lastError.message);
      if (!openaiKey) {
        if (process.env.MOCK_AI === 'true' || process.env.NODE_ENV === 'test' || process.env.NODE_ENV !== 'production') {
          console.warn('[ai-provider] Falling back to deterministic mock generator in non-production environment');
          return generateDeterministicFallbackForm(userPrompt, options);
        }
        throw lastError;
      }
    }
  }

  // 2. OpenAI Integration (Optional Backup)
  if (openaiKey) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: AI_SYSTEM_PROMPT },
            { role: 'user', content: userContent },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('AI provider rate limit reached. Please wait a moment.');
        }
        throw new Error(`AI service responded with status ${response.status}`);
      }

      const json = await response.json();
      const rawText = json.choices?.[0]?.message?.content;
      if (!rawText) {
        throw new Error('AI returned an empty response.');
      }

      const parsed = extractJsonFromModelResponse(rawText);
      return parsed as RawAiFormSchema;
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('AI generation timed out. Please try again.');
      }
      console.warn('[ai-provider] OpenAI call error:', err.message);
      if (process.env.MOCK_AI === 'true' || process.env.NODE_ENV === 'test' || process.env.NODE_ENV !== 'production') {
        return generateDeterministicFallbackForm(userPrompt, options);
      }
      throw err;
    }
  }

  // 3. Fallback / Test / Development Mode
  const isMockAllowed =
    process.env.MOCK_AI === 'true' ||
    process.env.NODE_ENV === 'test' ||
    (process.env.NODE_ENV !== 'production' && !geminiKey && !openaiKey);

  if (!openaiKey && !geminiKey) {
    if (isMockAllowed) {
      return generateDeterministicFallbackForm(userPrompt, options);
    }
    throw new Error('AI service configuration error: No AI provider credentials configured. In production, GEMINI_API_KEY (or OPENAI_API_KEY) must be provided.');
  }

  if (isMockAllowed) {
    return generateDeterministicFallbackForm(userPrompt, options);
  }

  throw new Error('AI service is currently unavailable. All configured providers failed to generate a response.');
}
