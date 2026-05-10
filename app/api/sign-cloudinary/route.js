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
    const body = await request.json();
    const { paramsToSign } = body;

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    return NextResponse.json({ 
        signature,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME
    });
  } catch (error) {
    console.error("[Sign API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
