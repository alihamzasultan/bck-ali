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
  Fade
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
  Minimize
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
  const hideControlsTimer = useRef(null);
  const stageRef = useRef(null);
  const fileInputRef = useRef(null);

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

      if (!isPptx) {
        setPptxData(null);
        setSlideImageUrls([]);
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
        try { URL.revokeObjectURL(u); } catch {}
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
    try {
        const res = await VaultService.authenticate(password);
        if (res.authorized) {
            setIsVaultAuth(true);
            setShowAuthDialog(false);
            setAuthError('');
        } else {
            setAuthError('Invalid Access Key');
        }
    } catch {
        setAuthError('Connection Failed');
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
            await VaultService.uploadFile(vaultPath, args[0]);
        }
        fetchVault(vaultPath);
    } catch (err) {
        setError("Action failed: " + err.message);
    }
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
        <Toolbar sx={{ gap: 2 }}>
          <IconButton onClick={() => setIsSidebarOpen(o => !o)} sx={{ color: 'white', mr: 1 }}>
            <Menu size={24} />
          </IconButton>
          <Box
            sx={{
              width: 38,
              height: 38,
              display: 'grid',
              placeItems: 'center',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              boxShadow: '0 0 20px rgba(59,130,246,0.5)',
            }}
          >
            <ShieldCheck size={20} color="white" />
          </Box>
          <Typography variant="h6" sx={{ letterSpacing: -0.8, fontSize: '1.4rem' }}>
            BCH VAULT
          </Typography>
          
          <Tabs 
            value={viewMode} 
            onChange={(_, v) => setViewMode(v)}
            sx={{ 
                ml: 4,
                '& .MuiTabs-indicator': { backgroundColor: '#3b82f6', height: 3, borderRadius: '3px 3px 0 0' },
                '& .MuiTab-root': { color: '#64748b', fontWeight: 800, textTransform: 'none', minWidth: 100, fontSize: '0.9rem' },
                '& .Mui-selected': { color: '#3b82f6 !important' }
            }}
          >
            <Tab icon={<Cloud size={18} />} iconPosition="start" label="Cloud Vault" value="cloud" />
            <Tab icon={<Smartphone size={18} />} iconPosition="start" label="Local Workspace" value="local" />
          </Tabs>

          <Box sx={{ flex: 1 }} />

          {isCloud && !isVaultAuth && (
            <Button 
                variant="contained" 
                startIcon={<Lock size={16} />} 
                onClick={() => setShowAuthDialog(true)}
                sx={{ borderRadius: 999, bgcolor: '#334155', '&:hover': { bgcolor: '#475569' } }}
            >
                Admin Unlock
            </Button>
          )}

          {isCloud && isVaultAuth && (
            <Button 
                variant="contained" 
                startIcon={<Plus size={16} />} 
                onClick={() => fileInputRef.current?.click()}
                sx={{ borderRadius: 999, bgcolor: '#3b82f6' }}
            >
                Upload Asset
            </Button>
          )}

          {!isCloud && (
             <Button
                variant="contained"
                onClick={() => fileInputRef.current?.click()}
                startIcon={<Plus size={16} />}
                sx={{ borderRadius: 999, bgcolor: '#3b82f6' }}
            >
                Add Presentation
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box
        component="aside"
        sx={{
          width: isSidebarOpen ? 320 : 0,
          opacity: isSidebarOpen ? 1 : 0,
          flexShrink: 0,
          borderRight: isSidebarOpen ? '1px solid rgba(255,255,255,0.08)' : 'none',
          background: 'rgba(2, 6, 23, 0.4)',
          backdropFilter: 'blur(20px)',
          pt: '64px',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden'
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
                    onSelectFile={setSelectedFile}
                    selectedFile={selectedFile}
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
                        {localFiles.map(file => (
                             <ListItemButton
                                key={file.name}
                                selected={selectedFile?.name === file.name}
                                onClick={() => setSelectedFile(file)}
                                sx={{ borderRadius: 2, mb: 0.5 }}
                            >
                                <ListItemIcon sx={{ minWidth: 36 }}><Presentation size={18} /></ListItemIcon>
                                <ListItemText primary={file.name} primaryTypographyProps={{ noWrap: true, fontWeight: 700, fontSize: 13 }} />
                            </ListItemButton>
                        ))}
                    </List>
                )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Main Area */}
      <Box component="main" sx={{ flex: 1, pt: '64px', minWidth: 0 }}>
        <Box sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="body2" sx={{ mb: 2, color: '#64748b', fontWeight: 600 }}>
                {isCloud ? `Vault / ${vaultPath.split('/').slice(1).join(' / ')}` : 'Local Workspace'}
            </Typography>

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
                        p: 2, display: 'flex', alignItems: 'center', 
                        background: 'linear-gradient(to bottom, rgba(2,6,23,0.9), transparent)',
                        pointerEvents: showControls ? 'auto' : 'none'
                    }}>
                        <Typography variant="body2" sx={{ fontWeight: 800, flex: 1, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                            {selectedFileName || 'Select an asset'}
                        </Typography>
                        {selectedFile && isCloud && isVaultAuth && (
                            <VaultActions 
                                file={selectedFile} 
                                onRename={(id, name, type) => handleVaultAction('rename', id, name, type)} 
                                onDelete={(id, type) => handleVaultAction('delete', id, type)} 
                            />
                        )}
                        {selectedFile && (
                            <>
                                <IconButton size="small" onClick={toggleFullscreen} sx={{ ml: 2, color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }}>
                                    {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                                </IconButton>
                                <IconButton size="small" onClick={() => setSelectedFile(null)} sx={{ ml: 1, color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }}>
                                    <X size={18} />
                                </IconButton>
                            </>
                        )}
                    </Box>
                </Fade>

                <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden', p: isFullscreen ? 0 : 2, pt: isFullscreen ? 0 : 8 }}>
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
                        ) : isPptx ? (
                            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                 <Box
                                    component="img"
                                    src={currentSlideImageUrl}
                                    sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 2, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
                                />
                            </Box>
                        ) : (
                            <VaultMediaView file={selectedFile} />
                        )
                    )}
                </Box>

                {isPptx && selectedFile && !error && (
                    <Fade in={showControls}>
                        <Box sx={{ 
                            position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
                            p: 1.5, px: 3, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, 
                            bgcolor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.5)', pointerEvents: showControls ? 'auto' : 'none'
                        }}>
                            <IconButton disabled={!canGoPrev} onClick={() => setCurrentSlide(s => s - 1)} sx={{ color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}><ChevronLeft /></IconButton>
                            <Typography sx={{ fontWeight: 800, minWidth: 120, textAlign: 'center', color: 'white' }}>
                                Slide {currentSlide + 1} of {slideCount}
                            </Typography>
                            <IconButton disabled={!canGoNext} onClick={() => setCurrentSlide(s => s + 1)} sx={{ color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}><ChevronRight /></IconButton>
                        </Box>
                    </Fade>
                )}
            </Box>
        </Box>
      </Box>

      {/* Auth Dialog */}
      <Dialog open={showAuthDialog} onClose={() => setShowAuthDialog(false)}>
        <DialogTitle sx={{ fontWeight: 900 }}>Admin Access</DialogTitle>
        <DialogContent sx={{ minWidth: 320 }}>
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
            <Button onClick={() => setShowAuthDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleVaultLogin} sx={{ px: 3 }}>Unlock</Button>
        </DialogActions>
      </Dialog>

      <input
        type="file"
        ref={fileInputRef}
        onChange={async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (isCloud) await handleVaultAction('upload', file);
            else {
                if (dirHandle) await saveFile(file, file.name);
                else setSelectedFile({ name: file.name, handle: { getFile: () => Promise.resolve(file) } });
            }
            e.target.value = '';
        }}
        style={{ display: 'none' }}
      />
    </Box>
  );
}
