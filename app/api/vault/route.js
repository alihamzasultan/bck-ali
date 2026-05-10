const cloudinary = require('cloudinary').v2;
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rootPath = process.env.ROOT_FOLDER || "BCH-FILES";

  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new Error("Missing Cloudinary configuration in .env.local");
    }

    // Use Cloudinary Search API for more reliable and up-to-date results
    const searchResponse = await cloudinary.search
      .expression(`folder:"${rootPath}"`)
      .sort_by('created_at', 'desc')
      .max_results(500)
      .execute();

    files = searchResponse.resources.map(item => {
      const baseName = item.public_id.split('/').pop();
      // For images/videos, we append the format to get the "natural" filename
      // For raw files, the public_id usually already contains the extension in our upload logic
      const name = (item.resource_type === 'image' || item.resource_type === 'video') && item.format 
          ? `${baseName}.${item.format}` 
          : baseName;
      
      return {
          ...item,
          name: name
      };
    });
    
    // Filter out internal system folders like USB-SYNC
    const filteredFiles = files.filter(f => !f.public_id.includes('/USB-SYNC/'));

    return NextResponse.json({
      path: rootPath,
      folders: [], // No folders in flat architecture
      files: filteredFiles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    });

  } catch (error) {
    console.error("[Vault API] Error:", error);
    return NextResponse.json({ 
        error: error.message
    }, { status: 500 });
  }
}

