'use client';
import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';

export default function OfficePptViewer({ url, isVisible }) {
  const [isIframeLoading, setIsIframeLoading] = useState(true);

  // Encode the URL for Microsoft
  const encodedUrl = encodeURIComponent(url);
  const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;

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
        overflow: 'auto',
        p: 0
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: '1200px', // Optional: centers on ultra-wide TVs
          height: isVisible ? { xs: '600px', md: '800px', lg: '85vh' } : 0,
          minHeight: isVisible ? '600px' : 0,
          position: 'relative',
          boxShadow: '0 30px 100px rgba(0,0,0,1)',
          bgcolor: '#1e293b',
          transition: 'height 0.3s'
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
