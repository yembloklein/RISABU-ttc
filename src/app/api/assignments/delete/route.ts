import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const { fileUrl } = await request.json();

    if (!fileUrl) {
      return NextResponse.json({ error: "No file URL provided" }, { status: 400 });
    }

    // fileUrl is like /submissions/[unitId]/[filename]
    // We need to map this to public/submissions/[unitId]/[filename]
    const relativePath = fileUrl.startsWith('/') ? fileUrl.substring(1) : fileUrl;
    const path = join(process.cwd(), 'public', relativePath);

    // Delete the file
    try {
      await unlink(path);
    } catch (e) {
      console.warn("Assignment file already deleted or not found on disk:", path);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Assignment Delete API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
