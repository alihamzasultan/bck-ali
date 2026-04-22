'use client';
import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import dynamic from 'next/dynamic';

const PdfViewer = dynamic(() => import('./PdfViewer'), {
  ssr: false,
});


export default function VaultMediaView({ file }) {
  const [pdfError, setPdfError] = useState(null);

  // Reset fallback state when a new file is clicked
  useEffect(() => {
    setPdfError(null);
  }, [file]);

  if (!file) return null;

  const { resource_type, secure_url, name } = file;

  return (
    <Box 
      sx={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 2,
        overflow: 'hidden'
      }}
    >
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
        <Box sx={{ width: '100%', height: '100%' }}>
          {!pdfError ? (
            <PdfViewer 
                url={secure_url} 
                onFallback={(err) => setPdfError(err?.message || 'Unknown error loading PDF')} 
            />
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography variant="h6" color="text.secondary">
                    Preview not available for this file type
                </Typography>
                <Typography variant="body2" color="error" sx={{ mt: 1, maxWidth: 400, textAlign: 'center' }}>
                    Reason: {pdfError}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {name}
                </Typography>
                <a 
                    href={secure_url} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ 
                        display: 'inline-block',
                        marginTop: '20px',
                        padding: '10px 24px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '12px',
                        fontWeight: 800
                    }}
                >
                    Download Asset
                </a>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
