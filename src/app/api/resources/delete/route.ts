import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const { fileUrl } = await request.json();

    if (!fileUrl) {
      return NextResponse.json({ error: "No file URL provided" }, { status: 400 });
    }

    // Extract the filename from the URL
    const filename = fileUrl.split('/').pop();
    if (!filename) {
      return NextResponse.json({ error: "Invalid file URL" }, { status: 400 });
    }

    const path = join(process.cwd(), 'public', 'uploads', filename);

    // Delete the file
    try {
      await unlink(path);
    } catch (e) {
      console.warn("File already deleted or not found on disk:", path);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
