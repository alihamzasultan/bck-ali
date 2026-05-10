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
    try {
      // Primary: Use Cloudinary Search API for reliable and up-to-date results
      const searchResponse = await cloudinary.search
        .expression(`folder:${rootPath}/*`)
        .sort_by('created_at', 'desc')
        .max_results(500)
        .execute();

      files = searchResponse.resources.map(item => {
        const baseName = item.public_id.split('/').pop();
        const name = (item.resource_type === 'image' || item.resource_type === 'video') && item.format 
            ? `${baseName}.${item.format}` 
            : baseName;
        
        return {
            ...item,
            name: name
        };
      });
    } catch (searchError) {
      console.warn("Cloudinary Search API failed, falling back to Resources API:", searchError.message);
      
      // Fallback: Manual listing if Search API is disabled on account
      const resourceTypes = ['image', 'video', 'raw'];
      const results = await Promise.all(resourceTypes.map(async (rtype) => {
          try {
              const res = await cloudinary.api.resources({
                  resource_type: rtype,
                  type: 'upload',
                  prefix: rootPath + '/',
                  max_results: 500
              });
              return res.resources.map(item => {
                  const baseName = item.public_id.split('/').pop();
                  const name = (rtype === 'image' || rtype === 'video') && item.format 
                      ? `${baseName}.${item.format}` 
                      : baseName;
                  return { ...item, resource_type: rtype, name };
              });
          } catch (e) { return []; }
      }));
      files = results.flat();
    }
    
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

