'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Box, IconButton, Typography, CircularProgress } from '@mui/material';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure the worker for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function PdfViewer({ url, onFallback, isFullscreen }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [pageDimensions, setPageDimensions] = useState(null);
  const containerRef = useRef(null);

  const [showControls, setShowControls] = useState(true);
  const hideControlsTimer = useRef(null);

  // Use ResizeObserver to keep the container size in sync
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setContainerSize({ width, height });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => setShowControls(false), 2500);
  };

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function onPageLoadSuccess(page) {
    const { originalWidth, originalHeight } = page;
    setPageDimensions({ width: originalWidth, height: originalHeight });
  }

  const goToPrevPage = () => setPageNumber((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber((prev) => Math.min(prev + 1, numPages));

  // Calculate the optimal width/height to fit the page entirely within the container
  const getFitDimensions = () => {
    if (!containerSize.width || !containerSize.height || !pageDimensions) return {};

    const containerRatio = containerSize.width / containerSize.height;
    const pageRatio = pageDimensions.width / pageDimensions.height;

    let finalWidth, finalHeight;

    if (pageRatio > containerRatio) {
      // Page is wider than container ratio -> constrain by width
      finalWidth = containerSize.width * scale;
    } else {
      // Page is taller than container ratio -> constrain by height
      finalHeight = containerSize.height * scale;
    }

    return { width: finalWidth, height: finalHeight };
  };

  const fitDims = getFitDimensions();

  return (
    <Box
      onMouseMove={handleMouseMove}
      onClick={handleMouseMove}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: '#0f172a',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* TOOLBAR */}
      <Box sx={{
        position: 'absolute',
        bottom: isFullscreen ? 50 : 30,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: isFullscreen ? 2 : 1.2,
        px: isFullscreen ? 4 : 2.5,
        borderRadius: 999,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.15)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        justifyContent: 'center',
        opacity: showControls ? 1 : 0,
        pointerEvents: showControls ? 'auto' : 'none',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <IconButton size="small" onClick={goToPrevPage} disabled={pageNumber <= 1} sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
          <ChevronLeft size={20} />
        </IconButton>

        <Typography variant="body2" sx={{ color: 'white', minWidth: '90px', textAlign: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
          {pageNumber} / {numPages || '--'}
        </Typography>

        <IconButton size="small" onClick={goToNextPage} disabled={pageNumber >= numPages} sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
          <ChevronRight size={20} />
        </IconButton>

        <Box sx={{ width: '1px', height: 20, backgroundColor: 'rgba(255,255,255,0.2)', mx: 1 }} />

        <IconButton size="small" onClick={() => setScale(s => Math.max(0.2, s - 0.1))} sx={{ color: 'white' }}>
          <ZoomOut size={16} />
        </IconButton>
        <Typography variant="body2" sx={{ color: 'white', fontWeight: 800, width: 40, textAlign: 'center', fontSize: '0.8rem' }}>
          {Math.round(scale * 100)}%
        </Typography>
        <IconButton size="small" onClick={() => setScale(s => Math.min(3.0, s + 0.1))} sx={{ color: 'white' }}>
          <ZoomIn size={16} />
        </IconButton>

        <Box sx={{ width: '1px', height: 20, backgroundColor: 'rgba(255,255,255,0.2)', mx: 1 }} />
        
        <IconButton size="small" onClick={() => setScale(1.0)} sx={{ color: 'white', '&:hover': { color: '#6366f1' } }}>
          <Maximize2 size={16} />
        </IconButton>
      </Box>

      <Box 
        ref={containerRef}
        sx={{
          flex: 1,
          width: '100%',
          height: '100%',
          overflow: 'hidden', // Disable all scrolling
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center', // Center vertically
          p: isFullscreen ? 0 : 2,
          boxSizing: 'border-box'
        }}
      >
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={(err) => onFallback && onFallback(err)}
          loading={
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <CircularProgress size={40} sx={{ color: '#6366f1' }} />
              <Typography sx={{ color: 'rgba(255,255,255,0.5)', mt: 2, fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                Loading Presentation...
              </Typography>
            </Box>
          }
        >
          <Box sx={{ 
            boxShadow: '0 30px 100px rgba(0,0,0,0.8)', 
            backgroundColor: 'white',
            lineHeight: 0,
            transition: 'all 0.3s ease'
          }}>
            <Page
              pageNumber={pageNumber}
              {...fitDims}
              onLoadSuccess={onPageLoadSuccess}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              loading={null}
            />
          </Box>
        </Document>
      </Box>
    </Box>
  );
}
