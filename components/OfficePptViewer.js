'use client';
import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';

export default function OfficePptViewer({ url, isVisible, isFullscreen }) {

  const [isIframeLoading, setIsIframeLoading] = useState(true);

  // Encode the URL for Microsoft
  const encodedUrl = encodeURIComponent(url);
  const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}&wdAr=0`;


  useEffect(() => {
    if (!isVisible) {
      setIsIframeLoading(true);
    }
  }, [isVisible]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: '#000',
        overflow: isFullscreen ? 'hidden' : 'auto',
        p: isFullscreen ? 0 : { xs: 1, md: 1.5, lg: 2 } // Reduced padding to maximize height
      }}



    >
      <Box
        sx={{
          width: '100%',
          maxWidth: isFullscreen ? 'none' : '100%', // Allow full width to maximize resolution

          height: isVisible ? (isFullscreen ? '96vh' : 'calc(100vh - 80px)') : 0,
          minHeight: isVisible ? (isFullscreen ? '96vh' : '600px') : 0,



          position: 'relative',
          boxShadow: isFullscreen ? 'none' : '0 30px 100px rgba(0,0,0,1)',
          bgcolor: '#1e293b',
          transition: 'all 0.3s ease'
        }}

      >
        {/* Loading Overlay */}
        {isIframeLoading && (
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{
              position: 'absolute', inset: 0, zIndex: 10,
              bgcolor: '#0a0b0e',
              gap: 2
            }}
          >
            <CircularProgress size={40} thickness={4} />
            <Typography variant="body2" sx={{ fontWeight: 800, color: 'white', opacity: 0.7 }}>
              Connecting to Microsoft Render Engine...
            </Typography>
          </Stack>
        )}

        <iframe
          src={viewerUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          allowFullScreen
          onLoad={() => setIsIframeLoading(false)}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block'
          }}
          title="Microsoft Office Online Viewer"
        />
      </Box>
    </Box>
  );
}
