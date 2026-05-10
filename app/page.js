'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { parsePPTX, SlideRenderer } from '@kandiforge/pptx-renderer';
import { useFileSystem } from '@/hooks/useFileSystem';
import { VaultService } from '@/services/VaultService';
import VaultMediaView from '@/components/VaultMediaView';
import VaultActions from '@/components/VaultActions';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
  TextField,
  Alert,
  Tooltip,
  Backdrop,
  Fade,
  alpha,
  Snackbar,
  Grid,
  Card,
  CardActionArea,
  InputAdornment,
  Chip
} from '@mui/material';


import {
  FileText,
  Search,
  Upload,
  Plus,
  Cloud,
  X,
  Maximize,
  Minimize,
  Image as ImageIcon,
  Film,
  FolderOpen,
  Smartphone,
  ArrowLeft,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Filter,
  Folder
} from 'lucide-react';

const ROOT_FOLDER = "BCH-FILES";

export default function Home() {
  // --- Core State ---
  const [viewMode, setViewMode] = useState('cloud'); // 'local' | 'cloud'
  const [usbFiles, setUsbFiles] = useState([]);
  const [isUsbDetecting, setIsUsbDetecting] = useState(false);
  const [usbDrive, setUsbDrive] = useState(null);

  const {
    dirHandle,
    files: localFiles,
    connectFolder,
    saveFile,
    refreshFiles
  } = useFileSystem();

  // --- Vault State ---
  const [vaultFiles, setVaultFiles] = useState([]);
  const [isVaultLoading, setIsVaultLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // --- Selection & Viewer State ---
  const [selectedFile, setSelectedFile] = useState(null);
  const [pptxData, setPptxData] = useState(null);
  const [slideImageUrls, setSlideImageUrls] = useState([]);
  const [renderStrategy, setRenderStrategy] = useState('server');
  const [isRasterizing, setIsRasterizing] = useState(false);
  const [rasterProgress, setRasterProgress] = useState({ done: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [error, setError] = useState(null);

  // --- UI State ---
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const hideControlsTimer = useRef(null);

  const stageRef = useRef(null);
  const fileInputRef = useRef(null);
  const [localSyncCache, setLocalSyncCache] = useState({});

  // --- Auto-Hide Controls Logic ---
  const handleStageMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      setShowControls(false);
    }, 2500);
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await stageRef.current?.requestFullscreen().catch(e => console.error(e));
    } else {
      await document.exitFullscreen().catch(e => console.error(e));
    }
  };

  const handleCloseViewer = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (e) {
        console.error("Exit fullscreen error:", e);
      }
    }
    setSelectedFile(null);
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // --- Derived State ---
  const isCloud = viewMode === 'cloud';
  const displayFiles = isCloud ? vaultFiles : (usbFiles.length > 0 ? usbFiles : localFiles);
  const selectedFileName = selectedFile?.name ?? '';
  const isPptx = selectedFileName.toLowerCase().endsWith('.pptx');

  // --- USB Detection ---
  const fetchUsbFiles = async () => {
    if (viewMode === 'cloud') return;
    setIsUsbDetecting(true);
    try {
        const resp = await fetch('/api/usb');
        const data = await resp.json();
        if (data.connected) {
            setUsbFiles(data.files);
            setUsbDrive(data.drive);
        } else {
            setUsbFiles([]);
            setUsbDrive(null);
        }
        setIsUsbDetecting(false);
    } catch (err) {
        console.error("USB detection failed:", err);
        setIsUsbDetecting(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'local') fetchUsbFiles();
  }, [viewMode]);

  // --- Filtering Logic ---
  const filteredFiles = useMemo(() => {
    let result = displayFiles;
    if (searchQuery) {
      result = result.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (activeFilter !== 'all') {
      result = result.filter(f => {
        if (activeFilter === 'presentation') return f.name.toLowerCase().endsWith('.pptx');
        if (activeFilter === 'document') return f.name.toLowerCase().match(/\.(pdf|docx|doc|xlsx|xls|pptx|ppt)$/i);
        if (activeFilter === 'image') return f.resource_type === 'image';
        if (activeFilter === 'video') return f.resource_type === 'video';
        return true;
      });
    }
    return result;
  }, [displayFiles, searchQuery, activeFilter]);

  // --- Vault Effects ---
  useEffect(() => {
    fetchVault();
  }, []);

  const fetchVault = async () => {
    setIsVaultLoading(true);
    try {
      const data = await VaultService.getVault(ROOT_FOLDER);
      setVaultFiles(data.files);
      setIsVaultLoading(false);
    } catch (err) {
      console.error("Vault fetch error:", err);
      setError("Failed to connect to BCH Vault.");
      setIsVaultLoading(false);
    }
  };

  // --- Media Loading Logic ---
  useEffect(() => {
    async function loadFile() {
      if (!selectedFile) {
        resetViewer();
        return;
      }

      setError(null);
      setCurrentSlide(0);

      // If it's a Cloud file, we can render it directly
      if (isCloud) {
        setPptxData(null);
        setSlideImageUrls([]);
        if (selectedFile.secure_url) setRenderStrategy('server');
        return;
      }

      // If it's a USB file, we check if it's a document that needs High-Fidelity Sync
      const isDocument = selectedFileName.toLowerCase().match(/\.(pptx|docx|pdf)$/);
      
      if (isDocument) {
        setIsLoading(true);
        try {
          // 1. Check if we already synced this file in this session
          const cacheKey = `${selectedFile.name}_${selectedFile.size}`;
          if (localSyncCache[cacheKey]) {
            setSelectedFile(prev => ({ ...prev, secure_url: localSyncCache[cacheKey] }));
            setRenderStrategy('server');
            setIsLoading(false);
            return;
          }

          // 2. Not cached? Fetch the file blob and upload it
          const resp = await fetch(selectedFile.secure_url);
          const blob = await resp.blob();
          const file = new File([blob], selectedFile.name, { type: blob.type });

          // 3. Upload to a special "USB-SYNC" folder
          const uploadResp = await VaultService.uploadFile(`${ROOT_FOLDER}/USB-SYNC`, file);
          
          // 4. Update cache and state
          setLocalSyncCache(prev => ({ ...prev, [cacheKey]: uploadResp.secure_url }));
          setSelectedFile(prev => ({ ...prev, secure_url: uploadResp.secure_url }));
          setRenderStrategy('server');
          setIsLoading(false);
        } catch (err) {
          console.error('On-the-fly sync failed:', err);
          setError('Failed to sync file to Cloud Vault for rendering.');
          setIsLoading(false);
        }
      } else {
        // For non-documents (images/videos) from USB, we just use the local stream URL
        setRenderStrategy('server');
      }
    }
    loadFile();
  }, [selectedFile?.public_id, isCloud]);

  const resetViewer = () => {
    setPptxData(null);
    setRenderStrategy('server');
    setSlideImageUrls((prev) => {
      prev?.forEach((u) => {
        try { URL.revokeObjectURL(u); } catch { }
      });
      return [];
    });
    setIsRasterizing(false);
    setRasterProgress({ done: 0, total: 0 });
    setIsLoading(false);
    setCurrentSlide(0);
    setError(null);
  };

  const handleVaultAction = async (action, ...args) => {
    try {
      if (action === 'rename') {
        await VaultService.renameAsset(...args);
      } else if (action === 'delete') {
        if (isCloud) {
          await VaultService.deleteAsset(...args);
        } else {
          // Local delete is more complex with File System API, usually we just don't support it in this demo
          console.warn("Delete not supported for local files yet");
        }
        setSelectedFile(null);
      } else if (action === 'upload') {
        const [file] = args;
        if (isCloud) {
          await VaultService.uploadFile(ROOT_FOLDER, file);
        } else {
          if (dirHandle) await saveFile(file, file.name);
        }
        fetchVault();
        return;
      }
      fetchVault();
    } catch (err) {
      setError("Action failed: " + err.message);
    }
  };

  const handleSidebarUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', bgcolor: '#020617' }}>
      {/* Main Area */}
      <Box component="main" sx={{ flex: 1, pt: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        
        {/* Header / Gallery Controls */}
        {!selectedFile && (
          <Box sx={{ p: { xs: 2, md: 4 }, pb: 0 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 4 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: alpha('#3b82f6', 0.1), display: 'grid', placeItems: 'center', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  {isCloud ? <FolderOpen size={24} color="#3b82f6" /> : <Smartphone size={24} color="#10b981" />}
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: 'white', letterSpacing: -0.5 }}>
                    {isCloud ? 'BCH Asset Vault' : 'USB Drive Access'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                    {isCloud ? `${vaultFiles.length} resources in Repository / Root` : (dirHandle ? `${localFiles.length} resources detected on drive` : 'Connect an external drive to begin')}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={2}>
                <Box sx={{ 
                  display: 'flex', 
                  bgcolor: 'rgba(255,255,255,0.05)', 
                  p: 0.5, 
                  borderRadius: 3,
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <Button 
                    onClick={() => setViewMode('cloud')}
                    sx={{ 
                      borderRadius: 2.5, px: 3, 
                      bgcolor: isCloud ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                      color: isCloud ? '#3b82f6' : 'rgba(255,255,255,0.4)',
                      fontWeight: 800, fontSize: '0.75rem'
                    }}
                  >
                    Cloud
                  </Button>
                  <Button 
                    onClick={() => setViewMode('local')}
                    sx={{ 
                      borderRadius: 2.5, px: 3,
                      bgcolor: !isCloud ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                      color: !isCloud ? '#10b981' : 'rgba(255,255,255,0.4)',
                      fontWeight: 800, fontSize: '0.75rem'
                    }}
                  >
                    USB
                  </Button>
                </Box>
                
                <Button 
                  variant="contained"
                  onClick={handleSidebarUpload}
                  disabled={!isCloud && !dirHandle}
                  startIcon={<Plus size={18} />}
                  sx={{ 
                    borderRadius: 3, 
                    px: 3, py: 1.2,
                    bgcolor: isCloud ? '#3b82f6' : '#10b981',
                    fontWeight: 800,
                    boxShadow: isCloud ? '0 8px 24px rgba(59, 130, 246, 0.3)' : '0 8px 24px rgba(16, 185, 129, 0.3)',
                    '&:hover': { bgcolor: isCloud ? '#2563eb' : '#059669' }
                  }}
                >
                  Upload Asset
                </Button>
              </Stack>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 4 }}>
              <TextField
                placeholder={isCloud ? "Search repository..." : "Search USB drive..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ 
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(15, 23, 42, 0.5)',
                    borderRadius: 3,
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&.Mui-focused fieldset': { borderColor: isCloud ? '#3b82f6' : '#10b981' }
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} color="rgba(255,255,255,0.3)" />
                    </InputAdornment>
                  )
                }}
              />
              <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
                {['all', 'presentation', 'document', 'image', 'video'].map((filter) => (
                  <Chip
                    key={filter}
                    label={filter.charAt(0).toUpperCase() + filter.slice(1)}
                    onClick={() => setActiveFilter(filter)}
                    sx={{ 
                      borderRadius: 2,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      fontSize: '0.65rem',
                      letterSpacing: 0.5,
                      bgcolor: activeFilter === filter ? (isCloud ? '#3b82f6' : '#10b981') : 'rgba(255,255,255,0.05)',
                      color: activeFilter === filter ? 'white' : 'rgba(255,255,255,0.5)',
                      border: '1px solid',
                      borderColor: activeFilter === filter ? (isCloud ? '#3b82f6' : '#10b981') : 'rgba(255,255,255,0.1)',
                      '&:hover': { bgcolor: activeFilter === filter ? (isCloud ? '#2563eb' : '#059669') : 'rgba(255,255,255,0.1)' }
                    }}
                  />
                ))}
              </Stack>
            </Stack>
          </Box>
        )}

        <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden', p: selectedFile ? 0 : { xs: 2, md: 4 }, pt: 0 }}>
          {!selectedFile ? (
            <Box sx={{ height: '100%', overflowY: 'auto', pr: 1, '&::-webkit-scrollbar': { width: 6 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 10 } }}>
              {isVaultLoading ? (
                <Stack alignItems="center" justifyContent="center" sx={{ height: '40vh' }}>
                  <CircularProgress size={40} thickness={4} sx={{ color: isCloud ? '#3b82f6' : '#10b981' }} />
                </Stack>
              ) : !isCloud && !dirHandle && !usbDrive ? (
                <Stack alignItems="center" justifyContent="center" sx={{ height: '60vh', textAlign: 'center' }}>
                  <Box sx={{ 
                    p: { xs: 4, md: 8 }, 
                    borderRadius: 8, 
                    border: '2px dashed rgba(255,255,255,0.1)', 
                    maxWidth: 550, 
                    bgcolor: 'rgba(255,255,255,0.01)',
                    backdropFilter: 'blur(10px)',
                    position: 'relative',
                    overflow: 'visible' // Ensure icons don't get cut off
                  }}>
                    <Box sx={{ 
                      width: 100, 
                      height: 100, 
                      borderRadius: '30px', // Squircle look
                      bgcolor: 'rgba(16, 185, 129, 0.05)', 
                      display: 'grid', 
                      placeItems: 'center', 
                      mx: 'auto', 
                      mb: 4,
                      mt: 1, // Space from top
                      border: '1px solid rgba(16, 185, 129, 0.1)',
                      position: 'relative'
                    }}>
                      {isUsbDetecting ? (
                        <>
                          <CircularProgress size={50} thickness={2} sx={{ color: '#10b981', position: 'absolute' }} />
                          <Smartphone size={32} color="#10b981" style={{ opacity: 0.5 }} />
                        </>
                      ) : (
                        <Smartphone size={44} color="#10b981" />
                      )}
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 900, mb: 1.5, color: 'white', letterSpacing: -0.5 }}>
                      {isUsbDetecting ? 'Scanning Hardware...' : 'Connect USB Drive'}
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.5)', mb: 5, px: 2, lineHeight: 1.6 }}>
                      {isUsbDetecting 
                        ? 'Searching for removable storage. Ensure your drive is connected to a high-speed port.' 
                        : 'Access your presentations directly from your hardware. The BCH Vault will automatically index your drive.'}
                    </Typography>
                    <Stack direction="row" spacing={2.5} justifyContent="center">
                      <Button 
                        variant="contained" 
                        onClick={fetchUsbFiles}
                        disabled={isUsbDetecting}
                        startIcon={<RotateCw size={20} />}
                        sx={{ 
                          bgcolor: '#10b981', 
                          fontWeight: 900, 
                          borderRadius: 4, 
                          py: 1.5,
                          px: 4, 
                          fontSize: '1rem',
                          textTransform: 'none',
                          boxShadow: '0 10px 30px rgba(16, 185, 129, 0.2)',
                          '&:hover': { bgcolor: '#059669' } 
                        }}
                      >
                        Scan Again
                      </Button>
                      <Button 
                        variant="outlined" 
                        onClick={connectFolder}
                        sx={{ 
                          borderColor: 'rgba(255,255,255,0.15)', 
                          color: 'white', 
                          fontWeight: 900, 
                          borderRadius: 4, 
                          py: 1.5,
                          px: 4, 
                          fontSize: '1rem',
                          textTransform: 'none',
                          '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.05)' } 
                        }}
                      >
                        Browse Manually
                      </Button>
                    </Stack>
                  </Box>
                </Stack>
              ) : filteredFiles.length > 0 ? (
                <Grid container spacing={2.5}>
                  {filteredFiles.map((f) => {
                    const name = f.name || '';
                    const isPptx = name.toLowerCase().endsWith('.pptx');
                    const isPdf = name.toLowerCase().endsWith('.pdf');
                    const isDoc = name.toLowerCase().match(/\.(docx|doc|xlsx|xls|ppt)$/i);
                    const isVideo = f.resource_type === 'video';
                    const isImage = f.resource_type === 'image' && !isPdf && !isPptx && !isDoc;

                    return (
                      <Grid item xs={12} sm={6} md={4} lg={3} xl={2.4} key={f.public_id} sx={{ display: 'flex' }}>
                        <Card 
                          sx={{ 
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            bgcolor: 'rgba(15, 23, 42, 0.4)', 
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: 4,
                            overflow: 'hidden',
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                              transform: 'translateY(-6px)',
                              bgcolor: 'rgba(30, 41, 59, 0.7)',
                              borderColor: isCloud ? 'rgba(59, 130, 246, 0.4)' : 'rgba(16, 185, 129, 0.4)',
                              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                              '& img': { transform: 'scale(1.1)' }
                            }
                          }}
                        >
                          <CardActionArea onClick={() => setSelectedFile(f)} sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Box sx={{ 
                              mb: 2, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              height: 140, 
                              width: '100%', 
                              borderRadius: 3, 
                              bgcolor: alpha(isPptx ? '#ef4444' : isPdf ? '#f43f5e' : isVideo ? '#f87171' : (isCloud ? '#3b82f6' : '#10b981'), 0.1),
                              overflow: 'hidden',
                              position: 'relative',
                              zIndex: 1
                            }}>
                              {isImage ? (
                                <Box component="img" src={f.secure_url} sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                              ) : (isPdf || isPptx) ? (
                                <>
                                  <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
                                    {isCloud && (
                                      <Box 
                                        component="img" 
                                        src={f.resource_type === 'image' 
                                          ? f.secure_url.replace('/upload/', '/upload/w_400,h_280,c_fill,pg_1,f_jpg/') 
                                          : f.secure_url 
                                        } 
                                        onError={(e) => { 
                                          e.target.style.display = 'none'; 
                                          const fallback = e.target.parentElement.querySelector('.fallback-icon');
                                          if (fallback) fallback.style.display = 'flex'; 
                                        }}
                                        sx={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 2 }} 
                                      />
                                    )}
                                    <Box className="fallback-icon" sx={{ 
                                      display: isCloud ? 'none' : 'flex', 
                                      width: '100%', height: '100%', 
                                      alignItems: 'center', justifyContent: 'center',
                                      position: 'absolute', inset: 0, zIndex: 1 
                                    }}>
                                      <FileText size={48} color={isPptx ? "#ef4444" : isPdf ? "#f43f5e" : "#94a3b8"} />
                                    </Box>
                                  </Box>
                                </>
                              ) : isVideo ? (
                                <Film size={48} color="#f87171" />
                              ) : (
                                <FileText size={48} color="#94a3b8" />
                              )}
                            </Box>
                            <Box sx={{ flex: 1, width: '100%' }}>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: 'white', 
                                  fontWeight: 800, 
                                  mb: 0.5,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  lineHeight: 1.4,
                                  minHeight: '2.8em'
                                }}
                              >
                                {name}
                              </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              {isPptx ? 'Presentation' : isPdf ? 'PDF Document' : (f.resource_type === 'image' ? 'Image' : (f.resource_type === 'video' ? 'Video' : 'Asset'))}
                            </Typography>
                          </CardActionArea>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              ) : (
                <Stack alignItems="center" justifyContent="center" sx={{ height: '40vh', opacity: 0.3 }}>
                  <Cloud size={64} />
                  <Typography variant="h6" sx={{ mt: 2, fontWeight: 800 }}>No results found</Typography>
                  <Typography variant="body2">Try adjusting your search or filter</Typography>
                </Stack>
              )}
            </Box>
          ) : (
            <Box
              ref={stageRef}
              onMouseMove={handleStageMouseMove}
              onClick={handleStageMouseMove}
              sx={{
                height: '100%',
                backgroundColor: isFullscreen ? '#020617' : 'rgba(15, 23, 42, 0.3)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }}
            >
              <Fade in={showControls}>
                <Box sx={{
                  position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
                  p: { xs: 1, sm: 2 }, pr: { xs: 10, sm: 14 }, display: 'flex', alignItems: 'center',
                  background: 'linear-gradient(to bottom, rgba(2,6,23,0.9), transparent)',
                  pointerEvents: showControls ? 'auto' : 'none'
                }}>
                  <IconButton 
                    onClick={handleCloseViewer}
                    sx={{ color: 'white', mr: 2, bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                  >
                    <ArrowLeft size={18} />
                  </IconButton>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 800, textShadow: '0 2px 10px rgba(0,0,0,0.8)', noWrap: true, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedFileName}
                    </Typography>
                  </Box>
                  {isCloud && (
                    <VaultActions
                      file={selectedFile}
                      onRename={(id, name, type) => handleVaultAction('rename', id, name, type)}
                      onDelete={(id, type) => handleVaultAction('delete', id, type)}
                    />
                  )}
                </Box>
              </Fade>

              <Box sx={{
                position: 'absolute', top: 0, right: 0, zIndex: 11,
                p: { xs: 1, sm: 2 }, display: 'flex', alignItems: 'center',
                pointerEvents: 'auto'
              }}>
                <IconButton
                  size={isFullscreen ? "medium" : "small"}
                  onClick={toggleFullscreen}
                  sx={{
                    ml: 1,
                    p: isFullscreen ? 2 : 1,
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                  }}
                >
                  {isFullscreen ? <Minimize size={isFullscreen ? 24 : 18} /> : <Maximize size={18} />}
                </IconButton>
                <IconButton
                  size={isFullscreen ? "medium" : "small"}
                  onClick={handleCloseViewer}
                  sx={{
                    ml: 1,
                    p: isFullscreen ? 2 : 1,
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                  }}
                >
                  <X size={isFullscreen ? 24 : 18} />
                </IconButton>
              </Box>

              <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden', p: 0, display: 'flex', flexDirection: 'column' }}>
                {error ? (
                  <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', flex: 1 }}>
                    <Alert severity="error" variant="outlined" sx={{ borderRadius: 3 }}>{error}</Alert>
                  </Stack>
                ) : isRasterizing || isLoading ? (
                  <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', flex: 1, spacing: 2 }}>
                    <CircularProgress color={isCloud ? 'primary' : 'success'} />
                    <Typography sx={{ mt: 2, fontWeight: 800 }}>
                      {isRasterizing ? `Rendering Slide ${rasterProgress.done + 1}...` : 'Loading Asset...'}
                    </Typography>
                  </Stack>
                ) : (
                  <VaultMediaView
                    file={selectedFile}
                    isFullscreen={isFullscreen}
                    pptxData={pptxData}
                    renderStrategy={renderStrategy}
                    currentSlide={currentSlide}
                    onSlideChange={setCurrentSlide}
                  />
                )
              }
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      <input
        type="file"
        ref={fileInputRef}
        onChange={async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          setIsUploading(true);
          try {
            await handleVaultAction('upload', file);
            setSuccessMessage('Successfully uploaded to Vault');
          } catch (err) {
            console.error("Upload error:", err);
            setError(err.message || "Upload failed");
          } finally {
            setIsUploading(false);
            e.target.value = '';
          }
        }}
        style={{ display: 'none' }}
      />

      {/* Global Upload Overlay */}
      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 2,
          flexDirection: 'column',
          gap: 3,
          bgcolor: 'rgba(2, 6, 23, 0.9)',
          backdropFilter: 'blur(10px)'
        }}
        open={isUploading}
      >
        <CircularProgress color="inherit" size={60} thickness={4} sx={{ filter: 'drop-shadow(0 0 15px #3b82f6)' }} />
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.5, mb: 1 }}>
            Uploading Asset
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.6 }}>
            Adding to <strong>Vault Repository</strong>...
          </Typography>
        </Box>
      </Backdrop>

      {/* Success Notification */}
      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSuccessMessage('')}
          severity="success"
          variant="filled"
          sx={{ width: '100%', borderRadius: 3, fontWeight: 700 }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
