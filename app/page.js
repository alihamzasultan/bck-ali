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
  Toolbar,
  Typography,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Alert,
  Fade,
  Collapse,
  alpha,
  Backdrop,
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
  const [vaultPath, setVaultPath] = useState(ROOT_FOLDER);
  const [vaultFolders, setVaultFolders] = useState([]);
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
  const [uploadTargetPath, setUploadTargetPath] = useState(null);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
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
      fetchVault(vaultPath);
    }
  }, [isCloud, vaultPath]);

  const fetchVault = async (path) => {
    setIsVaultLoading(true);
    try {
      const data = await VaultService.getVault(path);
      setVaultFolders(data.folders);
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

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newPath = `${vaultPath}/${newFolderName.trim()}`;
    setVaultPath(newPath);
    setNewFolderName('');
    setShowFolderDialog(false);
  };

  const navigateBack = () => {
    if (vaultPath === ROOT_FOLDER) return;
    const parts = vaultPath.split('/');
    parts.pop();
    setVaultPath(parts.join('/'));
  };

  const handleVaultAction = async (action, ...args) => {
    try {
      if (action === 'rename') {
        await VaultService.renameAsset(...args);
      } else if (action === 'delete') {
        await VaultService.deleteAsset(...args);
        setSelectedFile(null);
      } else if (action === 'upload') {
        const [file, specificPath] = args;
        const targetPath = specificPath || vaultPath;
        await VaultService.uploadFile(targetPath, file);
        // Always refresh the folder we uploaded to
        await fetchVault(targetPath);
        return; // Skip the default fetchVault at the end
      }
      fetchVault(vaultPath);
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

  const handleSidebarUpload = (path) => {
    setUploadTargetPath(path);
    fileInputRef.current?.click();
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          backdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(2, 6, 23, 0.7)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ gap: { xs: 1, sm: 2 }, px: { xs: 1, sm: 2 } }}>
          <IconButton onClick={() => setIsSidebarOpen(o => !o)} sx={{ color: 'white', mr: { xs: 0, sm: 1 } }}>
            <Menu size={24} />
          </IconButton>
          <Box
            sx={{
              width: { xs: 32, sm: 38 },
              height: { xs: 32, sm: 38 },
              display: 'grid',
              placeItems: 'center',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              boxShadow: '0 0 20px rgba(59,130,246,0.5)',
              flexShrink: 0
            }}
          >
            <ShieldCheck size={20} color="white" />
          </Box>
          <Typography variant="h6" sx={{ letterSpacing: -1, fontSize: '1.2rem', fontWeight: 900, display: { xs: 'none', md: 'block' } }}>
            BCH VAULT
          </Typography>

          <Tabs
            value={viewMode}
            onChange={(_, v) => setViewMode(v)}
            variant="scrollable"
            scrollButtons={false}
            sx={{
              ml: { xs: 1, md: 4 },
              minHeight: 'auto',
              '& .MuiTabs-indicator': { backgroundColor: '#3b82f6', height: 3, borderRadius: '3px 3px 0 0' },
              '& .MuiTab-root': { color: '#64748b', fontWeight: 800, textTransform: 'none', minWidth: { xs: 70, sm: 100 }, fontSize: { xs: '0.8rem', sm: '0.9rem' }, py: 1.5, px: { xs: 1, sm: 2 } },
              '& .Mui-selected': { color: '#3b82f6 !important' }
            }}
          >
            <Tab icon={<Cloud size={18} />} iconPosition="start" label="Cloud" value="cloud" />
            <Tab icon={<Smartphone size={18} />} iconPosition="start" label="Local" value="local" />
          </Tabs>

          <Box sx={{ flex: 1 }} />

          {isCloud && !isVaultAuth && (
            <Button
              variant="contained"
              onClick={() => setShowAuthDialog(true)}
              size="small"
              sx={{ borderRadius: 999, bgcolor: '#334155', '&:hover': { bgcolor: '#475569' }, minWidth: 0, p: { xs: 1, sm: '4px 16px' } }}
            >
              <Lock size={16} />
              <Typography component="span" sx={{ ml: 1, display: { xs: 'none', sm: 'inline' }, fontSize: '0.875rem', fontWeight: 600 }}>Unlock Vault</Typography>
            </Button>
          )}

          {isCloud && isVaultAuth && (
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={() => setShowFolderDialog(true)}
                size="small"
                sx={{ borderRadius: 999, color: 'white', borderColor: 'rgba(255,255,255,0.2)', minWidth: 0, p: { xs: 1, sm: '4px 16px' } }}
              >
                <Folder size={16} />
                <Typography component="span" sx={{ ml: 1, display: { xs: 'none', sm: 'inline' }, fontSize: '0.875rem', fontWeight: 600 }}>New Folder</Typography>
              </Button>
              <Button
                variant="contained"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                size="small"
                sx={{ borderRadius: 999, bgcolor: '#3b82f6', minWidth: { xs: 0, sm: 140 }, p: { xs: 1, sm: '4px 16px' } }}
              >
                {isUploading ? <CircularProgress size={16} color="inherit" /> : <Plus size={16} />}
                <Typography component="span" sx={{ ml: isUploading ? 0 : 1, display: { xs: 'none', sm: 'inline' }, fontSize: '0.875rem', fontWeight: 600 }}>{isUploading ? 'Uploading...' : 'Upload Asset'}</Typography>
              </Button>
            </Stack>
          )}

          {!isCloud && (
            <Button
              variant="contained"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              size="small"
              sx={{ borderRadius: 999, bgcolor: '#3b82f6', minWidth: { xs: 0, sm: 160 }, p: { xs: 1, sm: '4px 16px' } }}
            >
              {isUploading ? <CircularProgress size={16} color="inherit" /> : <Plus size={16} />}
              <Typography component="span" sx={{ ml: isUploading ? 0 : 1, display: { xs: 'none', sm: 'inline' }, fontSize: '0.875rem', fontWeight: 600 }}>{isUploading ? 'Processing...' : 'Add Presentation'}</Typography>
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box
        component="aside"
        sx={{
          width: isSidebarOpen ? { xs: '100%', sm: 340 } : 0,
          opacity: isSidebarOpen ? 1 : 0,
          flexShrink: 0,
          position: { xs: 'absolute', sm: 'relative' },
          zIndex: { xs: 10, sm: 1 },
          height: '100%',
          borderRight: isSidebarOpen ? '1px solid rgba(255,255,255,0.06)' : 'none',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.4) 0%, rgba(2, 6, 23, 0.6) 100%)',
          backdropFilter: 'blur(30px)',
          pt: { xs: '56px', sm: '64px' },
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          boxShadow: isSidebarOpen ? '20px 0 50px rgba(0,0,0,0.5)' : 'none'
        }}
      >
        <Box sx={{ p: 2.25, flex: 1, overflow: 'auto' }}>
          {isCloud ? (
            isVaultLoading ? (
              <Stack alignItems="center" spacing={2} sx={{ mt: 10 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" sx={{ opacity: 0.6 }}>Syncing...</Typography>
              </Stack>
            ) : (
              <VaultSidebar
                files={vaultFiles}
                folders={vaultFolders}
                onSelectFile={setSelectedFile}
                selectedFile={selectedFile}
                onUploadToFolder={handleSidebarUpload}
                rootName={ROOT_FOLDER}
              />
            )
          ) : (
            <Box>
              <Typography variant="overline" sx={{ px: 1, fontWeight: 800, color: 'text.secondary' }}>Local PPTX Files</Typography>
              {!dirHandle ? (
                <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', mt: 1 }}>
                  <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>Connect a local folder to browse presentations.</Typography>
                  <Button fullWidth variant="outlined" onClick={connectFolder} startIcon={<Folder size={16} />}>Connect Folder</Button>
                </Box>
              ) : (
                <List sx={{ mt: 1 }}>
                  {localFiles.map(file => {
                    const isPptx = file.name.toLowerCase().endsWith('.pptx');
                    const isDocx = file.name.toLowerCase().endsWith('.docx');
                    const isSelected = selectedFile?.name === file.name;

                    return (
                      <ListItemButton
                        key={file.name}
                        selected={isSelected}
                        onClick={() => {
                          // Check cache before selecting
                          const cached = localSyncCache[file.name];
                          if (cached) {
                            setSelectedFile({ ...file, ...cached });
                          } else {
                            setSelectedFile(file);
                          }
                        }}
                        sx={{
                          borderRadius: 2,
                          mb: 0.5,
                          '&.Mui-selected': { bgcolor: 'rgba(59,130,246,0.15)' }
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {isPptx ? (
                            <FileText size={18} color="#ef4444" style={{ filter: 'drop-shadow(0 0 5px rgba(239,68,68,0.3))' }} />
                          ) : isDocx ? (
                            <FileText size={18} color="#3b82f6" style={{ filter: 'drop-shadow(0 0 5px rgba(59,130,246,0.3))' }} />
                          ) : (
                            <FileText size={18} color="#94a3b8" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={file.name}
                          primaryTypographyProps={{
                            noWrap: true,
                            fontWeight: isSelected ? 800 : 600,
                            fontSize: 13,
                            color: isSelected ? 'white' : 'rgba(255,255,255,0.7)'
                          }}
                        />
                      </ListItemButton>
                    );
                  })}
                </List>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Main Area */}
      <Box component="main" sx={{ flex: 1, pt: { xs: '56px', sm: '64px' }, minWidth: 0 }}>
        <Box sx={{ height: '100%', p: { xs: 1.5, sm: 3 }, display: 'flex', flexDirection: 'column' }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: { xs: 1, sm: 2 } }}>
            <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600, noWrap: true, flexShrink: 1 }}>
              {isCloud ? `Vault / ${vaultPath.split('/').slice(1).join(' / ')}` : 'Local Workspace'}
            </Typography>
            {isCloud && vaultPath !== ROOT_FOLDER && (
              <Button
                size="small"
                onClick={navigateBack}
                sx={{ ml: 2, color: '#3b82f6', textTransform: 'none', fontWeight: 800, minWidth: 'auto', p: { xs: '4px 8px', sm: '4px 16px' } }}
              >
                <ChevronLeft size={16} />
                <Typography component="span" sx={{ ml: 0.5, display: { xs: 'none', sm: 'inline' }, fontSize: '0.875rem', fontWeight: 800 }}>Back to Parent</Typography>
              </Button>
            )}
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
                p: { xs: 1, sm: 2 }, display: 'flex', alignItems: 'center',
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
                {selectedFile && (
                  <>
                    <IconButton
                      size={isFullscreen ? "medium" : "small"}
                      onClick={toggleFullscreen}
                      sx={{
                        ml: 2,
                        p: isFullscreen ? 2 : 1,
                        color: 'white',
                        bgcolor: 'rgba(255,255,255,0.1)',
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
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                      }}
                    >
                      <X size={isFullscreen ? 24 : 18} />
                    </IconButton>
                  </>
                )}
              </Box>
            </Fade>

            <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden', p: 0 }}>
              {!selectedFile ? (
                <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', opacity: 0.3 }}>
                  <Box sx={{ p: 4, borderRadius: 4, border: '2px dashed rgba(255,255,255,0.1)', textAlign: 'center' }}>
                    <Cloud size={48} />
                    <Typography variant="h6" sx={{ mt: 2, fontWeight: 800 }}>Empty Stage</Typography>
                    <Typography variant="body2">Select a file from the sidebar</Typography>
                  </Box>
                </Stack>
              ) : (
                error ? (
                  <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
                    <Alert severity="error" variant="outlined" sx={{ borderRadius: 3 }}>{error}</Alert>
                  </Stack>
                ) : isRasterizing || isLoading ? (
                  <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', spacing: 2 }}>
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

      {/* Folder Creation Dialog */}
      <Dialog open={showFolderDialog} onClose={() => setShowFolderDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 900 }}>Create New Folder</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, opacity: 0.7 }}>
            This will create a new subfolder in <strong>{vaultPath.split('/').pop()}</strong>
          </Typography>
          <TextField
            fullWidth
            autoFocus
            label="Folder Name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowFolderDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateFolder} sx={{ px: 3 }}>Create</Button>
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
            // Use targeted path if provided from sidebar, otherwise fall back to global vaultPath
            const targetPath = uploadTargetPath || vaultPath;

            if (isCloud) {
              await handleVaultAction('upload', file, targetPath);
              setSuccessMessage(`Successfully uploaded to ${targetPath.split('/').pop() || 'Files'}`);
            } else {
              if (dirHandle) await saveFile(file, file.name);
              else setSelectedFile({ name: file.name, handle: { getFile: () => Promise.resolve(file) } });
            }
          } catch (err) {
            console.error("Upload error:", err);
            setError(err.message || "Upload failed");
          } finally {
            setIsUploading(false);
            setUploadTargetPath(null);
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
            Adding to <strong>{uploadTargetPath || vaultPath}</strong>...
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
