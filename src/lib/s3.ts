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

/**
 * Validates that storage configuration satisfies production requirements.
 * In production, STORAGE_DRIVER MUST be 's3' and SUBMISSIONS_BUCKET_NAME must be present.
 */
export function validateStorageConfig(): { driver: 's3' | 'local'; bucket: string | undefined } {
  const isProduction = process.env.NODE_ENV === 'production';
  const driver = (process.env.STORAGE_DRIVER || (isProduction ? 's3' : 'local')).toLowerCase();
  const bucket = process.env.SUBMISSIONS_BUCKET_NAME;

  if (isProduction) {
    if (driver === 'local') {
      throw new Error(
        'Invalid storage configuration: STORAGE_DRIVER cannot be set to "local" in production. ' +
        'Local container filesystem is ephemeral across pod replicas. Please set STORAGE_DRIVER=s3.',
      );
    }
    if (driver !== 's3') {
      throw new Error(
        `Invalid storage configuration: Unsupported STORAGE_DRIVER "${driver}" in production. Must be "s3".`,
      );
    }
    if (!bucket) {
      throw new Error(
        'Invalid storage configuration: SUBMISSIONS_BUCKET_NAME is required in production when STORAGE_DRIVER=s3.',
      );
    }
  }

  return { driver: driver as 's3' | 'local', bucket };
}

export async function createPresignedUploadUrl(input: PresignInput & { sizeBytes: number }) {
  const { driver, bucket } = validateStorageConfig();
  const key = buildSubmissionFileKey(input);
  const isProduction = process.env.NODE_ENV === 'production';

  // In non-production, if driver is local or bucket is not configured, fall back to local dev upload API
  if (driver === 'local' || !bucket) {
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
    if (isProduction) {
      console.error('[s3] Failed to generate S3 presigned upload URL in production:', err);
      throw new Error(
        'Storage service error: Failed to generate presigned upload URL. ' +
        (err instanceof Error ? err.message : String(err)),
      );
    }

    console.warn('[s3] Failed to generate S3 presigned URL in development, falling back to local upload endpoint:', err);
    return {
      uploadUrl: `/api/uploads/local?key=${encodeURIComponent(key)}`,
      s3Key: key,
    };
  }
}

/** For the submission detail page — an admin's browser gets a URL that expires quickly rather than a permanently-public S3 link. */
export async function createPresignedDownloadUrl(s3Key: string, expiresInSeconds = 300): Promise<string> {
  const { driver, bucket } = validateStorageConfig();
  const isProduction = process.env.NODE_ENV === 'production';

  if (driver === 'local' || !bucket) {
    return `/api/uploads/local?key=${encodeURIComponent(s3Key)}`;
  }

  try {
    const command = new GetObjectCommand({ Bucket: bucket, Key: s3Key });
    return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
  } catch (err) {
    if (isProduction) {
      console.error('[s3] Failed to generate S3 presigned download URL in production:', err);
      throw new Error(
        'Storage service error: Failed to generate presigned download URL. ' +
        (err instanceof Error ? err.message : String(err)),
      );
    }

    console.warn('[s3] Failed to generate S3 download URL in development, falling back to local endpoint:', err);
    return `/api/uploads/local?key=${encodeURIComponent(s3Key)}`;
  }
}
