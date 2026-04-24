const cloudinary = require('cloudinary').v2;
import { NextResponse } from 'next/server';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const path = formData.get('path') || process.env.ROOT_FOLDER || "BCH-FILES";

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const ext = fileName.split('.').pop().toLowerCase();
    
    let resourceType = 'raw';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) resourceType = 'image';
    if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) resourceType = 'video';

    // Sanitize the filename but preserve the extension for 'raw' types
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9\-_]/g, '_');
    const sanitizedPublicId = resourceType === 'raw' 
      ? `${nameWithoutExt}.${ext}` 
      : nameWithoutExt;



    // Cloudinary upload using buffer
    const uploadResponse = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: path,
          public_id: sanitizedPublicId,
          resource_type: resourceType,
        },

        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    return NextResponse.json(uploadResponse);
  } catch (error) {
    console.error("Upload API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

