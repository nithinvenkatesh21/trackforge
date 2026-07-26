import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUploadUrl } from "@/lib/storage";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { fileName, fileType, fileSize, category } = await req.json();

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: "fileName and fileType are required" },
        { status: 400 }
      );
    }

    // Size limit enforcement
    const isBundleOrAsset = category === "bundle" || category === "marketplace";
    const maxSizeBytes = isBundleOrAsset
      ? 200 * 1024 * 1024 // 200 MB
      : 50 * 1024 * 1024; // 50 MB

    if (fileSize && fileSize > maxSizeBytes) {
      const maxMb = isBundleOrAsset ? 200 : 50;
      return NextResponse.json(
        { error: `File size exceeds maximum allowed limit of ${maxMb} MB` },
        { status: 400 }
      );
    }

    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `uploads/${Date.now()}-${randomUUID()}-${sanitizedFileName}`;

    const uploadUrl = await getUploadUrl(key, fileType);

    return NextResponse.json({ uploadUrl, key });
  } catch (error) {
    console.error("Presign upload error:", error);
    return NextResponse.json(
      { error: "Failed to generate presigned upload URL" },
      { status: 500 }
    );
  }
}
