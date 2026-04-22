'use client';

import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Box, IconButton, Typography, CircularProgress } from '@mui/material';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure the worker for PDF.js - Next.js needs this to process the PDFs in a web worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function PdfViewer({ url, onFallback }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimer = React.useRef(null);

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => setShowControls(false), 2500);
  };

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function onDocumentLoadError(error) {
    console.error("Failed to load PDF:", error);
    // If it fails to load as a PDF, it wasn't a valid PDF file. Fallback!
    if (onFallback) onFallback(error);
  }

  const goToPrevPage = () => setPageNumber((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber((prev) => Math.min(prev + 1, numPages));

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
        position: 'relative'
      }}
    >
      {/* TOOLBAR */}
      <Box sx={{ 
        position: 'absolute',
        bottom: 30,
        zIndex: 50,
        display: 'flex', 
        alignItems: 'center', 
        gap: 2, 
        p: 1.5, 
        px: 3,
        borderRadius: 999,
        backgroundColor: 'rgba(15, 23, 42, 0.8)', 
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        justifyContent: 'center',
        opacity: showControls ? 1 : 0,
        pointerEvents: showControls ? 'auto' : 'none',
        transition: 'opacity 0.3s'
      }}>
        <IconButton size="small" onClick={goToPrevPage} disabled={pageNumber <= 1} sx={{ color: 'white' }}>
          <ChevronLeft />
        </IconButton>
        
        <Typography variant="body2" sx={{ color: 'white', minWidth: '100px', textAlign: 'center', fontWeight: 800 }}>
          Page {pageNumber} of {numPages || '--'}
        </Typography>

        <IconButton size="small" onClick={goToNextPage} disabled={pageNumber >= numPages} sx={{ color: 'white' }}>
          <ChevronRight />
        </IconButton>

        <Box sx={{ width: '1px', height: 24, backgroundColor: 'rgba(255,255,255,0.2)', mx: 1 }} />

        <IconButton size="small" onClick={() => setScale(s => Math.max(0.5, s - 0.2))} sx={{ color: 'white' }}>
          <ZoomOut size={16} />
        </IconButton>
        <Typography variant="body2" sx={{ color: 'white', fontWeight: 800, width: 40, textAlign: 'center' }}>
          {Math.round(scale * 100)}%
        </Typography>
        <IconButton size="small" onClick={() => setScale(s => Math.min(3.0, s + 0.2))} sx={{ color: 'white' }}>
          <ZoomIn size={16} />
        </IconButton>
      </Box>

      {/* DOCUMENT VIEWER */}
      <Box sx={{ 
        flex: 1, 
        width: '100%', 
        overflow: 'auto', 
        display: 'flex', 
        justifyContent: 'center',
        p: 2
      }}>
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 10 }}>
              <CircularProgress size={40} sx={{ color: '#6366f1' }} />
              <Typography sx={{ color: 'text.secondary', mt: 2 }}>Loading PDF document...</Typography>
            </Box>
          }
        >
          <Box sx={{ boxShadow: '0 20px 50px rgba(0,0,0,0.5)', backgroundColor: 'white' }}>
            <Page 
              pageNumber={pageNumber} 
              scale={scale} 
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Box>
        </Document>
      </Box>
    </Box>
  );
}
