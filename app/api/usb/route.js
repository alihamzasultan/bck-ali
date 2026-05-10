import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);
const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        let drivePath = '';
        let driveLetter = '';

        if (process.platform === 'win32') {
            // --- Windows Detection ---
            const { stdout } = await execAsync('powershell "Get-WmiObject Win32_Volume | Where-Object { $_.DriveType -eq 2 } | Select-Object -ExpandProperty DriveLetter"');
            driveLetter = stdout.trim();
            if (driveLetter) drivePath = driveLetter + '\\';
        } else {
            // --- Linux / Android / Mac Detection ---
            // Common mount points for USBs on Linux/Android
            const mountPoints = ['/storage', '/media', '/mnt'];
            for (const base of mountPoints) {
                if (fs.existsSync(base)) {
                    const dirs = await readdirAsync(base);
                    // Filter out internal storage (usually 'emulated' or 'self')
                    const usbDir = dirs.find(d => !['emulated', 'self', 'sdcard'].includes(d.toLowerCase()));
                    if (usbDir) {
                        drivePath = path.join(base, usbDir);
                        driveLetter = usbDir;
                        break;
                    }
                }
            }
        }
        
        if (!drivePath) {
            return NextResponse.json({ 
                connected: false,
                message: "No USB drive detected." 
            });
        }

        // 2. List files in the detected path
        const entries = await readdirAsync(drivePath);
        
        const allowedExtensions = ['.pptx', '.pdf', '.docx', '.jpg', '.jpeg', '.png', '.webp', '.mp4', '.webm'];
        
        const files = await Promise.all(entries.map(async (name) => {
            const ext = name.toLowerCase().substring(name.lastIndexOf('.'));
            if (allowedExtensions.includes(ext)) {
                try {
                    const filePath = path.join(drivePath, name);
                    const stats = await statAsync(filePath);
                    
                    return {
                        name,
                        public_id: `usb_${name}`,
                        resource_type: ext.match(/\.(mp4|webm)$/) ? 'video' : 
                                       ext.match(/\.(jpg|jpeg|png|webp)$/) ? 'image' : 'raw',
                        secure_url: `/api/usb/stream?file=${encodeURIComponent(filePath)}`,
                        lastModified: stats.mtimeMs,
                        size: stats.size,
                        isLocal: true,
                        filePath
                    };
                } catch (e) {
                    return null;
                }
            }
            return null;
        }));

        const filteredFiles = files.filter(f => f !== null).sort((a, b) => b.lastModified - a.lastModified);

        return NextResponse.json({
            connected: true,
            drive: driveLetter,
            files: filteredFiles
        });

    } catch (error) {
        console.error("USB Detection Error:", error);
        return NextResponse.json({ error: "Failed to scan for USB drives" }, { status: 500 });
    }
}
