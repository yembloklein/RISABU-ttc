import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const { fileUrl } = await request.json();

    if (!fileUrl) {
      return NextResponse.json({ error: "No file URL provided" }, { status: 400 });
    }

    // Block path traversal attempts
    if (fileUrl.includes('..')) {
      return NextResponse.json({ error: "Invalid path traversal attempt" }, { status: 400 });
    }

    // Normalize and restrict target to the school_documents folder only
    const relativePath = fileUrl.startsWith('/') ? fileUrl.substring(1) : fileUrl;
    if (!relativePath.startsWith('school_documents/')) {
      return NextResponse.json({ error: "Access denied to target directory" }, { status: 403 });
    }

    const path = join(process.cwd(), 'public', relativePath);

    // Delete the file
    try {
      await unlink(path);
    } catch (e) {
      console.warn("File already deleted or not found on disk:", path);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("School Documents Delete API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
