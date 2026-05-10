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

    let files = [];
    const resourceTypes = ['image', 'video', 'raw'];
    
    const results = await Promise.all(resourceTypes.map(async (rtype) => {
        try {
            let allFiles = [];
            let nextCursor = null;

            do {
                const res = await cloudinary.api.resources({
                    resource_type: rtype,
                    type: 'upload',
                    prefix: rootPath + '/',
                    max_results: 500,
                    next_cursor: nextCursor
                });
                
                const mapped = res.resources.map(item => {
                    const baseName = item.public_id.split('/').pop();
                    const name = (rtype === 'image' || rtype === 'video') && item.format 
                        ? `${baseName}.${item.format}` 
                        : baseName;
                    
                    return {
                        ...item,
                        resource_type: rtype,
                        name: name
                    };
                });

                
                allFiles = allFiles.concat(mapped);
                nextCursor = res.next_cursor;
            } while (nextCursor);

            return allFiles;
        } catch (e) {
            return [];
        }
    }));
    
    files = results.flat();
    
    // Filter out internal system folders like USB-SYNC
    const filteredFiles = files.filter(f => !f.public_id.includes('/USB-SYNC/'));

    return NextResponse.json({
      path: rootPath,
      folders: [], // No folders in flat architecture
      files: filteredFiles.sort((a, b) => a.name.localeCompare(b.name))
    });

  } catch (error) {
    console.error("[Vault API] Error:", error);
    return NextResponse.json({ 
        error: error.message
    }, { status: 500 });
  }
}

