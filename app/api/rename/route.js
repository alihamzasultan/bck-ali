const cloudinary = require('cloudinary').v2;
import { NextResponse } from 'next/server';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export async function PUT(request) {
  try {
    const { old_id, new_name, resource_type } = await request.json();
    
    const folder = old_id.split('/').slice(0, -1).join('/');
    let finalName = new_name;

    // Preserve extension for raw files like PDFs
    if (resource_type === 'raw' && old_id.includes('.')) {
      const ext = old_id.split('.').pop();
      if (!finalName.toLowerCase().endsWith(`.${ext.toLowerCase()}`)) {
        finalName = `${finalName}.${ext}`;
      }
    }

    const new_id = `${folder}/${finalName}`;
    const res = await cloudinary.uploader.rename(old_id, new_id, { resource_type: resource_type || 'image' });
    
    return NextResponse.json(res);
  } catch (error) {
    console.error("Rename API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
