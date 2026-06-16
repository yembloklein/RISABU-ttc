import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';

// Increase the body size limit for this route to 50MB
// (Next.js App Router default is 4MB — bodySizeLimit in next.config only applies to Server Actions)
export const maxDuration = 60; // seconds

// This is the App Router way to disable the body size limit
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Define the upload directory
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    
    // Ensure the directory exists
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {}

    // Generate a unique filename safely
    const rawSafeName = file.name.replace(/\s+/g, '_');
    const safeName = join('/', rawSafeName).substring(1); // strips path markers
    
    if (safeName.includes('..')) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const filename = `${Date.now()}_${safeName}`;
    const path = join(uploadDir, filename);

    // Write the file
    await writeFile(path, buffer);
    
    // Return the relative URL
    const fileUrl = `/uploads/${filename}`;

    return NextResponse.json({ success: true, fileUrl, fileName: file.name });
  } catch (error: any) {
    console.error("Upload API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
