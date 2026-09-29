import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'ap-south-1' });

export interface PresignInput {
  orgId: string;
  formId: string;
  fieldId: string;
  fileName: string;
  mimeType: string;
}

/** A key an admin's browser can't guess by incrementing a counter, and that sorts by org/form for easy lifecycle rules. */
export function buildSubmissionFileKey({ orgId, formId, fieldId, fileName }: PresignInput): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
  return `submissions/${orgId}/${formId}/${fieldId}/${crypto.randomUUID()}-${safeName}`;
}

export async function createPresignedUploadUrl(input: PresignInput & { sizeBytes: number }) {
  const bucket = process.env.SUBMISSIONS_BUCKET_NAME;
  const key = buildSubmissionFileKey(input);

  // If STORAGE_DRIVER is explicitly local or no S3 bucket is configured, use local API
  if (process.env.STORAGE_DRIVER === 'local' || !bucket) {
    return {
      uploadUrl: `/api/uploads/local?key=${encodeURIComponent(key)}`,
      s3Key: key,
    };
  }

  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: input.mimeType,
    });

    // 5 minutes expiry allows reasonable upload time for documents & images
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    return { uploadUrl, s3Key: key };
  } catch (err) {
    console.warn('[s3] Failed to generate S3 presigned URL, falling back to local upload endpoint:', err);
    return {
      uploadUrl: `/api/uploads/local?key=${encodeURIComponent(key)}`,
      s3Key: key,
    };
  }
}

/** For the submission detail page — an admin's browser gets a URL that expires quickly rather than a permanently-public S3 link. */
export async function createPresignedDownloadUrl(s3Key: string, expiresInSeconds = 300): Promise<string> {
  const bucket = process.env.SUBMISSIONS_BUCKET_NAME;

  if (process.env.STORAGE_DRIVER === 'local' || !bucket) {
    return `/api/uploads/local?key=${encodeURIComponent(s3Key)}`;
  }

  try {
    const command = new GetObjectCommand({ Bucket: bucket, Key: s3Key });
    return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
  } catch (err) {
    console.warn('[s3] Failed to generate S3 download URL, falling back to local endpoint:', err);
    return `/api/uploads/local?key=${encodeURIComponent(s3Key)}`;
  }
}

