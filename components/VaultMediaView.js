'use client';
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Stack, CircularProgress, alpha } from '@mui/material';
import { Cpu, CloudLightning, FileText, Sparkles, ShieldCheck, RotateCw } from 'lucide-react';
import dynamic from 'next/dynamic';

const PdfViewer = dynamic(() => import('./PdfViewer'), {
  ssr: false,
});

const OfficePptViewer = dynamic(() => import('./OfficePptViewer'), {
  ssr: false,
});


export default function VaultMediaView({ file, isFullscreen, isSyncing, onSync }) {
  const [pdfError, setPdfError] = useState(null);

  // Reset fallback state when a new file is clicked
  useEffect(() => {
    setPdfError(null);
  }, [file]);

  if (!file) return null;

  const { resource_type, secure_url, name } = file;
  const isPptOrDoc = name.toLowerCase().endsWith('.pptx') || name.toLowerCase().endsWith('.docx');
  const isDocument = resource_type === 'raw' || isPptOrDoc;

  return (
    <Box 
      sx={{ 
        width: '100%', 
        height: '100%', 
        flex: 1,
        overflow: isDocument ? 'auto' : 'hidden',
        display: 'flex', 
        flexDirection: 'column'
      }}
    >
      <Box sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        p: isFullscreen ? 0 : (isDocument ? 0 : 2),
        pt: isFullscreen ? 10 : (isDocument ? 0 : 2),
        width: '100%',
        height: '100%',
        minHeight: 0,
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

          {isDocument && (
            <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
              {isPptOrDoc ? (
                secure_url ? (
                  <OfficePptViewer url={secure_url} isVisible={!!file} />
                ) : (
                  <Stack 
                    alignItems="center" 
                    justifyContent="center" 
                    spacing={3}
                    sx={{ 
                        height: '600px', 
                        width: '100%',
                        bgcolor: 'rgba(15, 23, 42, 0.4)',
                        borderRadius: 4,
                        border: '1px dashed rgba(255,255,255,0.1)',
                        p: 4,
                        textAlign: 'center'
                    }}
                  >
                    <Box sx={{ 
                        width: 80, height: 80, 
                        borderRadius: '24px', 
                        bgcolor: 'rgba(59, 130, 246, 0.1)', 
                        display: 'grid', placeItems: 'center',
                        mb: 1,
                        position: 'relative'
                    }}>
                        <CircularProgress size={40} thickness={4} sx={{ color: '#3b82f6' }} />
                        <Box sx={{ position: 'absolute', top: -5, right: -5 }}>
                            <Sparkles size={20} color="#60a5fa" fill="#60a5fa" style={{ opacity: 0.6 }} />
                        </Box>
                    </Box>
                    
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 900, mb: 1, color: 'white' }}>
                            {isSyncing ? 'Uploading for High-Fidelity Viewing...' : 'High-Fidelity Engine Ready'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', maxWidth: 450, mx: 'auto', lineHeight: 1.6 }}>
                            {isSyncing ? 
                                'Securely transmitting your presentation to the Microsoft Render Engine. This only happens once per session.' : 
                                'Your presentation has been optimized. Connecting to the render engine...'}
                        </Typography>
                    </Box>

                    {!isSyncing && (
                        <Button 
                            variant="contained"
                            onClick={onSync}
                            startIcon={<RotateCw size={18} />}
                            sx={{ 
                                borderRadius: 3, 
                                px: 4, py: 1.5,
                                bgcolor: '#3b82f6',
                                fontWeight: 800,
                                fontSize: '0.9rem',
                                boxShadow: '0 10px 30px rgba(59, 130, 246, 0.4)',
                                '&:hover': { bgcolor: '#2563eb' }
                            }}
                        >
                            Retry Sync
                        </Button>
                    )}

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ opacity: 0.4 }}>
                        <ShieldCheck size={14} />
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>SECURE CLOUD RENDERING ACTIVE</Typography>
                    </Stack>
                  </Stack>
                )
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
