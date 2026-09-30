import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), 'uploads');

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

export async function PUT(req: Request) {
  // Reject local disk storage in production environments
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { message: 'Local file upload endpoint is disabled in production. Configure STORAGE_DRIVER=s3.' },
      { status: 403 },
    );
  }

  try {
    const url = new URL(req.url);
    const key = url.searchParams.get('key');
    if (!key) {
      return NextResponse.json({ message: 'Missing key parameter' }, { status: 400 });
    }

    // Sanitize path to prevent directory traversal
    const safeKey = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(UPLOAD_DIR, safeKey);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const arrayBuffer = await req.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

    return NextResponse.json(
      { ok: true, key: safeKey },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  } catch (err) {
    console.error('[local-upload] Failed to store file:', err);
    return NextResponse.json({ message: 'Failed to write file' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  // Reject local disk retrieval in production environments
  if (process.env.NODE_ENV === 'production') {
    return new Response('Local file retrieval is disabled in production. Configure STORAGE_DRIVER=s3.', {
      status: 403,
    });
  }

  try {
    const url = new URL(req.url);
    const key = url.searchParams.get('key');
    if (!key) {
      return new Response('Missing key', { status: 400 });
    }

    const safeKey = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(UPLOAD_DIR, safeKey);

    if (!fs.existsSync(filePath)) {
      return new Response('File not found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const ext = path.extname(fileName).toLowerCase();
    const contentType = MIME_MAP[ext] ?? 'application/octet-stream';

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('[local-upload] Failed to retrieve file:', err);
    return new Response('Error retrieving file', { status: 500 });
  }
}
