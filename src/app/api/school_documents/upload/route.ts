import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Sanitize type parameter
    const safeType = basename(type);
    if (!safeType || safeType.includes('..') || safeType.includes('/') || safeType.includes('\\')) {
      return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Define the upload directory: public/school_documents/[type]
    const uploadDir = join(process.cwd(), 'public', 'school_documents', safeType);
    
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
    const fileUrl = `/school_documents/${safeType}/${filename}`;

    return NextResponse.json({ success: true, fileUrl, fileName: file.name });
  } catch (error: any) {
    console.error("School Documents Upload API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
