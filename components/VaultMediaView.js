'use client';
import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import dynamic from 'next/dynamic';

const PdfViewer = dynamic(() => import('./PdfViewer'), {
  ssr: false,
});

const OfficePptViewer = dynamic(() => import('./OfficePptViewer'), {
  ssr: false,
});


export default function VaultMediaView({ file, isFullscreen }) {
  const [pdfError, setPdfError] = useState(null);

  // Reset fallback state when a new file is clicked
  useEffect(() => {
    setPdfError(null);
  }, [file]);

  if (!file) return null;

  const { resource_type, secure_url, name } = file;

  const isDocument = resource_type === 'raw';

  return (
    <Box 
      sx={{ 
        width: '100%', 
        height: '100%', 
        overflow: isDocument ? 'auto' : 'hidden', // Allow scrolling for documents
        display: 'flex', 
        flexDirection: 'column'
      }}
    >
      <Box sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        p: isFullscreen ? 0 : (isDocument ? 0 : 2), // No padding for documents to maximize width
        pt: isFullscreen ? 10 : (isDocument ? 0 : 2),
        width: '100%',
        height: isDocument ? 'auto' : '100%', // Allow documents to set their own height
        minHeight: isDocument ? '100%' : 'none',
        overflow: 'visible'
      }}>
        <Box sx={{ 
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1
        }}>
          {resource_type === 'image' && (
            <Box 
              component="img"
              src={secure_url}
              alt={name}
              sx={{ 
                maxWidth: '100%', 
                maxHeight: '100%', 
                objectFit: 'contain',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
              }}
            />
          )}

          {resource_type === 'video' && (
            <video 
              controls 
              style={{ maxWidth: '100%', maxHeight: '100%' }}
              src={secure_url}
            >
              Your browser does not support the video tag.
            </video>
          )}

          {resource_type === 'raw' && (
            <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
              {name.toLowerCase().endsWith('.pptx') || name.toLowerCase().endsWith('.docx') ? (
                <OfficePptViewer url={secure_url} isVisible={!!file} />
              ) : !pdfError ? (
                <PdfViewer 
                    url={secure_url} 
                    isFullscreen={isFullscreen}
                    onFallback={(err) => setPdfError(err?.message || 'Unknown error loading PDF')} 
                />
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', p: 4 }}>
                    <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                        Preview not available for this file type
                    </Typography>
                    <Typography variant="body2" color="error" sx={{ mt: 1, maxWidth: 400, textAlign: 'center' }}>
                        Reason: {pdfError}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, color: 'rgba(255,255,255,0.3)' }}>
                        {name}
                    </Typography>
                    <a 
                        href={secure_url} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ 
                            display: 'inline-block',
                            marginTop: '20px',
                            padding: '12px 32px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '12px',
                            fontWeight: 900,
                            boxShadow: '0 10px 20px rgba(59, 130, 246, 0.3)'
                        }}
                    >
                        Download Asset
                    </a>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
);
}
