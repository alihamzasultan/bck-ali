import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('file');

    if (!filePath) {
        return new Response('File path is required', { status: 400 });
    }

    try {
        // Security check: ensure the file exists
        if (!fs.existsSync(filePath)) {
            return new Response('File not found', { status: 404 });
        }

        const fileBuffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        
        let contentType = 'application/octet-stream';
        if (ext === '.pdf') contentType = 'application/pdf';
        else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.png') contentType = 'image/png';
        else if (ext === '.mp4') contentType = 'video/mp4';
        else if (ext === '.webp') contentType = 'image/webp';

        return new Response(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `inline; filename="${path.basename(filePath)}"`
            }
        });

    } catch (error) {
        console.error("Stream Error:", error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
