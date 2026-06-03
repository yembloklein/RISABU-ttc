import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

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

// Increase body size limit to 50MB for large files
export const config = {
  api: {
    bodyParser: false,
  },
};
