'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { parsePPTX, SlideRenderer } from '@kandiforge/pptx-renderer';
import { useFileSystem } from '@/hooks/useFileSystem';
import { VaultService } from '@/services/VaultService';
import VaultSidebar from '@/components/VaultSidebar';
import VaultMediaView from '@/components/VaultMediaView';
import VaultActions from '@/components/VaultActions';
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Alert,
  Drawer,
  Tooltip,
  Backdrop,
  Fade,
  Collapse,
  alpha,
  Snackbar
} from '@mui/material';


import {
  ChevronLeft,
  ChevronRight,
  Presentation,
  Folder,
  Lock,
  X,
  Plus,
  Cloud,
  Smartphone,
  ShieldCheck,
  Menu,
  Maximize,
  Minimize,
  FileText
} from 'lucide-react';

const ROOT_FOLDER = "BCH-FILES";

export default function Home() {
  // --- Core State ---
  const [viewMode, setViewMode] = useState('cloud'); // 'local' | 'cloud'
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

  const [isVaultAuth, setIsVaultAuth] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const hideControlsTimer = useRef(null);

  const stageRef = useRef(null);
  const fileInputRef = useRef(null);
  const [localSyncCache, setLocalSyncCache] = useState({}); // { fileName: { secure_url, resource_type, public_id } }

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
  const selectedFileName = selectedFile?.name ?? '';
  const isPptx = selectedFileName.toLowerCase().endsWith('.pptx');

  const slideCount = useMemo(() => {
    if (slideImageUrls?.length) return slideImageUrls.length;
    return pptxData?.slides?.length ?? 0;
  }, [pptxData, slideImageUrls]);

  const currentSlideImageUrl = slideImageUrls?.[currentSlide] ?? null;
  const canGoPrev = currentSlide > 0;
  const canGoNext = slideCount ? currentSlide < slideCount - 1 : false;

  // --- Vault Effects ---
  useEffect(() => {
    if (isCloud) {
      fetchVault();
    }
  }, [isCloud]);

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

      if (!isPptx || selectedFile.secure_url) {
        setPptxData(null);
        setSlideImageUrls([]);
        if (selectedFile.secure_url) setRenderStrategy('server');
        return;
      }

      // PPTX Loading Logic
      setIsLoading(true);
      try {
        let buffer;
        if (selectedFile.handle) {
          const fileHandle = await selectedFile.handle.getFile();
          buffer = await fileHandle.arrayBuffer();
        } else if (selectedFile.secure_url) {
          const resp = await fetch(selectedFile.secure_url);
          buffer = await resp.arrayBuffer();
        }

        if (!buffer) throw new Error("No file data found");

        const parsed = await parsePPTX(buffer);
        if (!parsed?.slides?.length) throw new Error('NO_SLIDES');

        setRenderStrategy('client');
        setPptxData(parsed);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading PPTX:', err);
        setError('Failed to open this presentation.');
        setIsLoading(false);
        setPptxData(null);
      }
    }
    loadFile();
  }, [selectedFile, selectedFileName, isPptx]);

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

  // --- Rasterization Logic ---
  useEffect(() => {
    if (renderStrategy !== 'client' || !pptxData) return;

    let cancelled = false;
    const run = async () => {
      setSlideImageUrls(prev => {
        prev?.forEach(u => URL.revokeObjectURL(u));
        return [];
      });

      const total = pptxData.slides.length;
      setRasterProgress({ done: 0, total });
      setIsRasterizing(true);

      const out = [];
      try {
        const aspect = (pptxData.size?.height ?? 9) / (pptxData.size?.width ?? 16);
        const targetW = 1280;
        const targetH = Math.max(1, Math.round(targetW * aspect));
        const scale = 2;

        for (let i = 0; i < total; i++) {
          if (cancelled) return;
          const canvas = document.createElement('canvas');
          const renderer = new SlideRenderer(canvas, {
            width: targetW,
            height: targetH,
            slideWidth: pptxData.size.width,
            slideHeight: pptxData.size.height,
            scale,
          });
          await renderer.renderSlide(pptxData.slides[i], 'complete');
          const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
          const url = URL.createObjectURL(blob);
          out.push(url);
          setRasterProgress({ done: i + 1, total });
        }
        if (!cancelled) setSlideImageUrls(out);
      } catch (e) {
        console.error('Rasterize error:', e);
        if (!cancelled) setError('Rasterization failed.');
      } finally {
        if (!cancelled) setIsRasterizing(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [pptxData, renderStrategy]);

  // --- Handlers ---
  const handleVaultLogin = async () => {
    setIsAuthLoading(true);
    setAuthError('');
    try {
      const res = await VaultService.authenticate(password);
      if (res.authorized) {
        setIsVaultAuth(true);
        setShowAuthDialog(false);
      } else {
        setAuthError('Invalid Access Key');
      }
    } catch {
      setAuthError('Connection Failed');
    } finally {
      setIsAuthLoading(false);
    }
  };



  const handleVaultAction = async (action, ...args) => {
    try {
      if (action === 'rename') {
        await VaultService.renameAsset(...args);
      } else if (action === 'delete') {
        await VaultService.deleteAsset(...args);
        setSelectedFile(null);
      } else if (action === 'upload') {
        const [file] = args;
        await VaultService.uploadFile(ROOT_FOLDER, file);
        await fetchVault();
        return;
      }
      fetchVault();

    } catch (err) {
      setError("Action failed: " + err.message);
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);

  const handleLocalSync = async (file) => {
    if (!isVaultAuth) {
      setShowAuthDialog(true);
      return;
    }
    setIsSyncing(true);
    setError(null);
    try {
      let fileObj = file;
      if (file.handle) {
        fileObj = await file.handle.getFile();
      }

      // Upload to the main vault folder
      const res = await VaultService.uploadFile(ROOT_FOLDER, fileObj);

      const syncData = {
        secure_url: res.secure_url,
        resource_type: res.resource_type,
        public_id: res.public_id
      };

      // Update cache
      setLocalSyncCache(prev => ({
        ...prev,
        [file.name]: syncData
      }));

      // Update selection with the new secure path
      setSelectedFile({
        ...file,
        ...syncData
      });
    } catch (err) {
      console.error("Sync error:", err);
      setError("Failed to synchronize with Microsoft Engine. Please ensure the Vault is unlocked.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSidebarUpload = () => {
    if (!isVaultAuth) {
      setShowAuthDialog(true);
      return;
    }
    fileInputRef.current?.click();
  };



  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden' }}>
      {/* Floating Menu Toggle (Visible when sidebar is closed or on mobile) */}
      {!isSidebarOpen && (
        <Tooltip title="Open Navigation">
          <IconButton
            onClick={() => setIsSidebarOpen(true)}
            sx={{
              position: 'fixed',
              top: 16,
              left: 16,
              zIndex: 1200,
              bgcolor: '#020617',
              color: '#3b82f6',
              width: 36,
              height: 36,
              border: '1px solid rgba(59, 130, 246, 0.2)',
              '&:hover': { bgcolor: '#1e293b', border: '1px solid #3b82f6' },
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              transition: 'all 0.2s'
            }}
          >
            <Menu size={18} />
          </IconButton>
        </Tooltip>
      )}




      {/* Sidebar Drawer */}
      <Drawer
        open={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        variant="temporary"
        PaperProps={{
          sx: {
            width: 260,
            bgcolor: '#020617',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '40px 0 80px rgba(0,0,0,0.6)',
          }
        }}
        sx={{
          zIndex: 1300,
          '& .MuiBackdrop-root': {
            backgroundColor: 'rgba(2, 6, 23, 0.4)',
            backdropFilter: 'blur(4px)'
          }
        }}
      >
        <VaultSidebar
          files={vaultFiles}
          onSelectFile={(f) => {
            setSelectedFile(f);
            setIsSidebarOpen(false); // Close sidebar on file selection (Professional workflow)
          }}
          selectedFile={selectedFile}
          onUpload={handleSidebarUpload}
          isLocked={!isVaultAuth}
          isUploading={isUploading}
          onUnlock={() => setShowAuthDialog(true)}
          onClose={() => setIsSidebarOpen(false)}
        />
      </Drawer>



      {/* Main Area */}
      <Box component="main" sx={{ flex: 1, pt: 0, minWidth: 0 }}>

        <Box sx={{ height: '100%', p: { xs: 1, sm: 2 }, pt: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column' }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ 
            mb: 3, 
            ml: isSidebarOpen ? 0 : 8, 
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
          }}>
            <Box sx={{ width: 3, height: 14, bgcolor: '#3b82f6', borderRadius: 4 }} />
            <Typography variant="body2" sx={{ 
              color: '#64748b', 
              fontWeight: 800, 
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              fontSize: '0.6rem'
            }}>
              {isCloud ? 'Repository / Root' : 'Local Workspace'}
            </Typography>
          </Stack>




          <Box
            ref={stageRef}
            onMouseMove={handleStageMouseMove}
            onClick={handleStageMouseMove}
            sx={{
              flex: 1,
              borderRadius: isFullscreen ? 0 : 4,
              border: isFullscreen ? 'none' : '1px solid rgba(255,255,255,0.08)',
              backgroundColor: isFullscreen ? '#020617' : 'rgba(15, 23, 42, 0.3)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              transition: 'border-radius 0.3s'
            }}
          >
            <Fade in={showControls}>
              <Box sx={{
                position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
                p: { xs: 1, sm: 2 }, pr: { xs: 10, sm: 14 }, display: 'flex', alignItems: 'center',
                background: 'linear-gradient(to bottom, rgba(2,6,23,0.9), transparent)',
                pointerEvents: showControls ? 'auto' : 'none'
              }}>
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 800, textShadow: '0 2px 10px rgba(0,0,0,0.8)', noWrap: true, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedFileName || 'Select an asset'}
                  </Typography>
                  {selectedFile?.secure_url && selectedFileName.toLowerCase().endsWith('.pptx') && (
                    <Box
                      sx={{
                        bgcolor: 'rgba(59, 130, 246, 0.2)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        color: '#60a5fa',
                        px: { xs: 1, sm: 1.5 },
                        py: 0.25,
                        borderRadius: 2,
                        display: { xs: 'none', sm: 'flex' },
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      <span style={{ fontSize: '10px', fontWeight: 900 }}>IFRAME MODE</span>
                      <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '11px' }}>
                        PPT detected and now displaying it in an iframe
                      </Typography>
                    </Box>
                  )}
                </Box>
                {selectedFile && isCloud && isVaultAuth && (
                  <VaultActions
                    file={selectedFile}
                    onRename={(id, name, type) => handleVaultAction('rename', id, name, type)}
                    onDelete={(id, type) => handleVaultAction('delete', id, type)}
                  />
                )}
              </Box>
            </Fade>

            {selectedFile && (
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
            )}

            <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden', p: 0, display: 'flex', flexDirection: 'column' }}>
              {!selectedFile ? (
                <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', flex: 1, opacity: 0.3 }}>
                  <Box sx={{ p: 4, borderRadius: 4, border: '2px dashed rgba(255,255,255,0.1)', textAlign: 'center' }}>
                    <Cloud size={48} />
                    <Typography variant="h6" sx={{ mt: 2, fontWeight: 800 }}>Empty Stage</Typography>
                    <Typography variant="body2">Select a file from the sidebar</Typography>
                  </Box>
                </Stack>
              ) : (
                error ? (
                  <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', flex: 1 }}>
                    <Alert severity="error" variant="outlined" sx={{ borderRadius: 3 }}>{error}</Alert>
                  </Stack>
                ) : isRasterizing || isLoading ? (
                  <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', flex: 1, spacing: 2 }}>
                    <CircularProgress />
                    <Typography sx={{ mt: 2, fontWeight: 800 }}>
                      {isRasterizing ? `Rendering Slide ${rasterProgress.done + 1}...` : 'Loading Asset...'}
                    </Typography>
                  </Stack>
                ) : (
                  <VaultMediaView
                    file={selectedFile}
                    isFullscreen={isFullscreen}
                    isSyncing={isSyncing}
                    onSync={() => handleLocalSync(selectedFile)}
                  />
                )
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Auth Dialog */}
      <Dialog open={showAuthDialog} onClose={() => setShowAuthDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 900 }}>Admin Access</DialogTitle>
        <DialogContent>
          {authError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{authError}</Alert>}
          <TextField
            fullWidth
            type="password"
            label="Access Key"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowAuthDialog(false)} disabled={isAuthLoading}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleVaultLogin}
            disabled={isAuthLoading || !password}
            sx={{ px: 3, minWidth: 100 }}
          >
            {isAuthLoading ? <CircularProgress size={20} color="inherit" /> : 'Unlock'}
          </Button>
        </DialogActions>
      </Dialog>



      <input
        type="file"
        ref={fileInputRef}
        onChange={async (e) => {
          const file = e.target.files[0];
          if (!file) return;

          setIsUploading(true);
          try {

            if (isCloud) {
              await handleVaultAction('upload', file);
              setSuccessMessage('Successfully uploaded to Root');
            } else {

              if (dirHandle) await saveFile(file, file.name);
              else setSelectedFile({ name: file.name, handle: { getFile: () => Promise.resolve(file) } });
            }
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
            Adding to <strong>Root Repository</strong>...
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
