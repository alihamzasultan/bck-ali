const cloudinary = require('cloudinary').v2;
import { NextResponse } from 'next/server';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export async function GET(request) {
  try {
    console.log(`[Diagnostic] Testing connection... Cloud: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    
    // 1. Ping test
    const pingRes = await cloudinary.api.ping();
    console.log(`[Diagnostic] Ping Result:`, pingRes);

    // 2. check BCH-FILES subfolders
    let subfoldersMsg = "";
    try {
        const sub = await cloudinary.api.subfolders("BCH-FILES");
        subfoldersMsg = `Subfolders found: ${sub.folders.map(f => f.name).join(', ')}`;
    } catch (e) {
        subfoldersMsg = `Error listing subfolders: ${e.message}`;
    }

    // 3. Just list resources overall to see if anything exists
    const someFiles = await cloudinary.api.resources({ type: 'upload', prefix: 'BCH-FILES/', max_results: 5 });
    
    return NextResponse.json({ 
        success: true, 
        ping: pingRes.status,
        subfolders_test: subfoldersMsg,
        sample_files: someFiles.resources.map(f => ({ id: f.public_id, type: f.resource_type }))
    });

  } catch (error) {
    console.error("[Diagnostic] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
