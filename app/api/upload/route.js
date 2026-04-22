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
    const path = formData.get('path');

    if (!file || !path) {
      return NextResponse.json({ error: 'Missing file or path' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const fileName = file.name;
    const ext = fileName.split('.').pop().toLowerCase();
    
    let resourceType = 'raw';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) resourceType = 'image';
    if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) resourceType = 'video';

    const publicId = resourceType === 'raw' ? fileName : fileName.replace(/\.[^/.]+$/, "");

    // Use a promise to handle the stream upload if needed, 
    // or just convert buffer to base64 for simplicity in this small app.
    const base64File = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`;

    const res = await cloudinary.uploader.upload(base64File, {
      folder: path,
      public_id: publicId,
      resource_type: resourceType
    });

    return NextResponse.json(res);
  } catch (error) {
    console.error("Upload API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
