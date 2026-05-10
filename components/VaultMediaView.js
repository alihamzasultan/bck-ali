'use client';
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Stack, CircularProgress, alpha } from '@mui/material';
import { Cpu, CloudLightning, FileText, Sparkles, ShieldCheck, RotateCw } from 'lucide-react';
import { SlideRenderer } from '@kandiforge/pptx-renderer';
import dynamic from 'next/dynamic';

const PdfViewer = dynamic(() => import('./PdfViewer'), {
  ssr: false,
});

const OfficePptViewer = dynamic(() => import('./OfficePptViewer'), {
  ssr: false,
});


export default function VaultMediaView({ 
  file, 
  isFullscreen, 
  pptxData, 
  renderStrategy, 
  currentSlide, 
  onSlideChange 
}) {
  const [pdfError, setPdfError] = useState(null);

  // Reset fallback state when a new file is clicked
  useEffect(() => {
    setPdfError(null);
  }, [file]);

  if (!file) return null;

  const { resource_type, secure_url, name } = file;
  const isPptx = name.toLowerCase().endsWith('.pptx');
  const isDocx = name.toLowerCase().endsWith('.docx');
  const isPptOrDoc = isPptx || isDocx;
  const isDocument = resource_type === 'raw' || isPptOrDoc;

  // Decision logic for PPTX:
  // If it's a cloud file and we have a secure_url, we use Microsoft Server Rendering for best fidelity
  // If it's a local file, we MUST use Client Rendering because Microsoft cannot reach our local IP.
  const useServerRender = renderStrategy === 'server' && secure_url && !secure_url.includes('localhost') && !secure_url.includes('api/usb/stream');

  return (
    <Box 
      sx={{ 
        width: '100%', 
        height: '100%', 
        flex: 1,
        overflow: 'hidden',
        display: 'flex', 
        flexDirection: 'column'
      }}
    >
      <Box sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        p: isFullscreen ? 0 : (isDocument ? 0 : 2),
        pt: isFullscreen ? 1 : (isDocument ? 0 : 2),

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
                maxWidth: isFullscreen ? '100%' : '80%', 
                maxHeight: isFullscreen ? '100%' : '80%', 
                objectFit: 'contain',
                boxShadow: isFullscreen ? 'none' : '0 20px 50px rgba(0,0,0,0.5)',
                transition: 'all 0.3s ease'
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
            <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              {isPptx ? (
                useServerRender ? (
                  <OfficePptViewer url={secure_url} isVisible={!!file} isFullscreen={isFullscreen} />
                ) : pptxData ? (
                  <Box sx={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ 
                        flex: 1, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        bgcolor: '#0f172a',
                        overflow: 'hidden'
                    }}>
                        <Box sx={{ 
                            width: '90%', 
                            height: '90%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            boxShadow: '0 30px 100px rgba(0,0,0,0.8)'
                        }}>
                            <SlideRenderer 
                                slide={pptxData.slides[currentSlide]} 
                            />
                        </Box>
                    </Box>

                    {/* Local Navigation Toolbar */}
                    <Box sx={{
                        position: 'absolute',
                        bottom: isFullscreen ? 40 : 20,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        p: 1.2,
                        px: 3,
                        borderRadius: 999,
                        backgroundColor: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                    }}>
                        <Button 
                            disabled={currentSlide === 0}
                            onClick={() => onSlideChange(prev => Math.max(0, prev - 1))}
                            sx={{ color: 'white', minWidth: 40, fontWeight: 900 }}
                        >
                            PREV
                        </Button>
                        <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '0.9rem' }}>
                            {currentSlide + 1} / {pptxData.slides.length}
                        </Typography>
                        <Button 
                            disabled={currentSlide === pptxData.slides.length - 1}
                            onClick={() => onSlideChange(prev => Math.min(pptxData.slides.length - 1, prev + 1))}
                            sx={{ color: 'white', minWidth: 40, fontWeight: 900 }}
                        >
                            NEXT
                        </Button>
                    </Box>
                  </Box>
                ) : (
                  <Stack 
                    alignItems="center" 
                    justifyContent="center" 
                    spacing={3}
                    sx={{ 
                        height: '100%', 
                        width: '100%',
                        bgcolor: 'rgba(15, 23, 42, 0.4)',
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
                            {useServerRender ? 'Optimizing Cloud Asset...' : 'Syncing for High-Fidelity View...'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', maxWidth: 450, mx: 'auto', lineHeight: 1.6 }}>
                            {useServerRender 
                                ? 'Preparing your cloud presentation for professional display.' 
                                : 'Temporarily synchronizing your local file to the Cloud Vault for maximum professional fidelity.'}
                        </Typography>
                    </Box>

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ opacity: 0.4 }}>
                        <ShieldCheck size={14} color="#10b981" />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#10b981' }}>
                            SECURE CLOUD SYNC ACTIVE
                        </Typography>
                    </Stack>
                  </Stack>
                )
              ) : isDocx ? (
                  <OfficePptViewer url={secure_url} isVisible={!!file} isFullscreen={isFullscreen} />
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
