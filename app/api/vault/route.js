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
  const path = searchParams.get('path') || process.env.ROOT_FOLDER || "BCH-FILES";

  console.log(`[Vault API] DEBUG: Request received for path: "${path}"`);
  console.log(`[Vault API] DEBUG: Config - Cloud: ${process.env.CLOUDINARY_CLOUD_NAME}, Key: ${process.env.CLOUDINARY_API_KEY ? 'Present' : 'Missing'}`);

  try {
    // Check if config is actually set
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new Error("Missing Cloudinary configuration in .env.local");
    }

    // Fetch Resources Recursively
    let files = [];
    try {
        console.log(`[Vault API] DEBUG: Fetching ALL resources starting with "${path}/"...`);
        const resourceTypes = ['image', 'video', 'raw'];
        const results = await Promise.all(resourceTypes.map(async (rtype) => {
            try {
                let allFiles = [];
                let nextCursor = null;

                // Handle pagination if more than 500 files exist
                do {
                    const res = await cloudinary.api.resources({
                        resource_type: rtype,
                        type: 'upload',
                        prefix: path + '/',
                        max_results: 500,
                        next_cursor: nextCursor
                    });
                    
                    const mapped = res.resources.map(item => ({
                        ...item,
                        resource_type: rtype,
                        // Show the full subpath as the name so they know where it is, or just the basename
                        name: item.public_id.replace(`${path}/`, '')
                    }));
                    
                    allFiles = allFiles.concat(mapped);
                    nextCursor = res.next_cursor;
                } while (nextCursor);

                return allFiles;
            } catch (e) {
                console.log(`[Vault API] INFO: No ${rtype} resources found or error: ${e.message}`);
                return [];
            }
        }));
        
        // Combine all and we don't filter out nested folders anymore!
        files = results.flat();
        console.log(`[Vault API] DEBUG: Found ${files.length} total files.`);
    } catch (resourceErr) {
        console.log(`[Vault API] ERROR: Global resources fetch error: ${resourceErr.message}`);
    }

    // Fetch Subfolders
    let folders = [];
    try {
        console.log(`[Vault API] DEBUG: Fetching subfolders for "${path}"...`);
        const subfoldersRes = await cloudinary.api.sub_folders(path);
        folders = subfoldersRes.folders.map(f => ({
            name: f.name,
            path: f.path
        }));
    } catch (folderErr) {
        console.log(`[Vault API] INFO: No subfolders found or error: ${folderErr.message}`);
    }

    return NextResponse.json({
      path,
      folders: folders.sort((a, b) => a.name.localeCompare(b.name)),
      files: files.sort((a, b) => a.name.localeCompare(b.name))
    });

  } catch (error) {
    console.error("[Vault API] CRITICAL ERROR:", error);
    return NextResponse.json({ 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
