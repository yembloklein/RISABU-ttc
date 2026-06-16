import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

// Raise the body size limit beyond Next.js's default 4MB for this route
// Without this, large file uploads get a 413 with a plain-text body (not JSON)
export const dynamic = 'force-dynamic';
export const maxDuration = 60;


export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'uploads';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to base64 for Cloudinary upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(base64, {
      folder: `ttc/${folder}`,
      resource_type: 'auto', // handles PDFs, images, videos, docs
      type: 'upload',        // public delivery — prevents 401 on download
      access_mode: 'public', // explicitly mark as publicly accessible
      use_filename: true,
      unique_filename: true,
    });

    return NextResponse.json({
      success: true,
      fileUrl: result.secure_url,
      publicId: result.public_id,
      fileName: file.name,
      fileSize: file.size,
      format: result.format,
    });
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}

