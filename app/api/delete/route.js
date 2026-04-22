const cloudinary = require('cloudinary').v2;
import { NextResponse } from 'next/server';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const public_id = searchParams.get('public_id');
  const resource_type = searchParams.get('resource_type') || 'image';

  try {
    if (!public_id) {
      return NextResponse.json({ error: 'Missing public_id' }, { status: 400 });
    }

    const res = await cloudinary.uploader.destroy(public_id, { resource_type });
    return NextResponse.json(res);
  } catch (error) {
    console.error("Delete API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
