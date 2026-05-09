import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const studentId = formData.get('studentId') as string;
    const unitId = formData.get('unitId') as string;

    if (!file || !studentId || !unitId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Define the upload directory: public/submissions/[unitId]
    const uploadDir = join(process.cwd(), 'public', 'submissions', unitId);
    
    // Ensure the directory exists
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {}

    // Generate a filename: studentId_timestamp_originalName
    const safeName = file.name.replace(/\s+/g, '_');
    const filename = `${studentId}_${Date.now()}_${safeName}`;
    const path = join(uploadDir, filename);

    // Write the file
    await writeFile(path, buffer);
    
    // Return the relative URL
    const fileUrl = `/submissions/${unitId}/${filename}`;

    return NextResponse.json({ success: true, fileUrl, fileName: file.name });
  } catch (error: any) {
    console.error("Assignment Upload API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
