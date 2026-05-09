import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';

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

    // Generate a unique filename
    const filename = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
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
