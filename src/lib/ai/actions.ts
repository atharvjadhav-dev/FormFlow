'use server';

import { requireOrgAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import type { AiGenerationOptions, AiGenerationResult } from './types';
import { callAiModelForFormSchema } from './provider';
import { processAiModelOutput, AiSchemaValidationError } from './validator';

const AI_GENERATION_RATE_LIMIT = {
  limit: 12, // 12 requests
  windowSeconds: 60, // per 60 seconds
};

/**
 * Server action: generates a structured FormSchema from a natural language prompt.
 *
 * 1. Authenticates current user & tenant.
 * 2. Enforces sliding-window rate limit.
 * 3. Invokes server-side AI provider (OpenAI / Gemini / dev fallback).
 * 4. Strictly validates, normalizes, and remaps UUIDs and conditions.
 * 5. Returns candidate schema for client-side preview (does NOT write to database).
 */
export async function generateFormSchemaAction(
  prompt: string,
  options?: AiGenerationOptions,
): Promise<AiGenerationResult> {
  try {
    // 1. Tenant Authentication Boundary
    const { userId, orgId } = await requireOrgAuth();

    // 2. Validate input prompt
    const cleanPrompt = (prompt || '').trim();
    if (cleanPrompt.length < 3) {
      return {
        success: false,
        error: 'Please describe the form you would like to generate (at least 3 characters).',
      };
    }
    if (cleanPrompt.length > 1000) {
      return {
        success: false,
        error: 'Prompt is too long. Please keep your description under 1000 characters.',
      };
    }

    // 3. Sliding-window rate limit per user/org
    const rateLimitKey = `ai_gen:${orgId}:${userId}`;
    const rateLimitResult = await checkRateLimit(
      rateLimitKey,
      AI_GENERATION_RATE_LIMIT.limit,
      AI_GENERATION_RATE_LIMIT.windowSeconds,
    );

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        error: 'Generation rate limit reached. Please wait a moment before trying again.',
      };
    }

    // 4. Call AI provider server-side
    const rawSchema = await callAiModelForFormSchema(cleanPrompt, options);

    // 5. Validation, Normalization & Fresh UUID / Reference Remapping Pipeline
    const processedSchema = processAiModelOutput(rawSchema);

    // 6. Minimal observability (never log prompts, sensitive data, or keys)
    console.log(
      `[ai-generation] Success: org=${orgId} fieldsCount=${processedSchema.fields.length}`,
    );

    return {
      success: true,
      schema: processedSchema,
    };
  } catch (err: any) {
    console.error('[ai-generation] Error during schema generation:', err);

    // Mask internal errors, API keys, and stack traces
    if (err?.name === 'AiSchemaValidationError' || err instanceof AiSchemaValidationError) {
      return {
        success: false,
        error: err.message || 'Generated form was invalid. Please try a more specific description.',
      };
    }

    const message = String(err?.message || '').toLowerCase();

    if (message.includes('not authenticated') || message.includes('unauthorized')) {
      return {
        success: false,
        error: 'Please sign in to generate forms with AI.',
      };
    }

    if (message.includes('rate limit')) {
      return {
        success: false,
        error: 'AI service rate limit reached. Please wait a moment before trying again.',
      };
    }

    if (message.includes('timed out') || message.includes('timeout')) {
      return {
        success: false,
        error: 'AI generation timed out. Please try again.',
      };
    }

    if (message.includes('unavailable') || message.includes('not configured') || message.includes('configuration error')) {
      return {
        success: false,
        error: 'AI service is currently unavailable. Please try again later.',
      };
    }

    return {
      success: false,
      error: err?.message && !err.message.includes('key')
        ? err.message
        : "Couldn't generate the form. Try again.",
    };
  }
}
