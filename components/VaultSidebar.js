'use client';
import React, { useState, useMemo } from 'react';
import { 
  List, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Typography, 
  Box, 
  IconButton,
  TextField,
  InputAdornment,
  Button,
  CircularProgress,
  Divider,
  Tooltip
} from '@mui/material';
import { 
  Image as ImageIcon, 
  Film, 
  FileText, 
  Search,
  Upload,
  X,
  Shield,
  Lock,
  Plus,
  ChevronLeft,
  LayoutGrid,
  Settings
} from 'lucide-react';

export default function VaultSidebar({ 
  files = [], 
  onSelectFile,
  selectedFile,
  onUpload,
  isLocked = false,
  isUploading = false,
  onUnlock,
  onClose
}) {

  const [searchQuery, setSearchQuery] = useState('');

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    const query = searchQuery.toLowerCase();
    return files.filter(f => 
      (f.name || '').toLowerCase().includes(query) || 
      (f.public_id || '').toLowerCase().includes(query)
    );
  }, [files, searchQuery]);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      bgcolor: '#020617', // Deepest dark
      borderRight: '1px solid rgba(255,255,255,0.05)',
      fontFamily: '"Inter", "Roboto", sans-serif'
    }}>
      {/* Header Section */}
      <Box sx={{ 
        p: 2, 
        pb: 1.5,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        background: 'linear-gradient(to bottom, rgba(30,41,59,0.2), transparent)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <Box sx={{ color: '#3b82f6', display: 'flex' }}>
            <Shield size={20} weight="fill" />
          </Box>
          <Typography variant="h6" sx={{ 
            letterSpacing: -0.5, 
            fontSize: '0.95rem', 
            fontWeight: 800, 
            color: '#f8fafc',
            textTransform: 'uppercase'
          }}>
            Vault
          </Typography>
        </Box>
        
        <Tooltip title="Hide Sidebar">
          <IconButton 
            size="small" 
            onClick={onClose} 
            sx={{ 
              color: '#64748b', 
              transition: 'all 0.2s',
              '&:hover': { color: '#f8fafc', bgcolor: 'rgba(255,255,255,0.05)' } 
            }}
          >
            <ChevronLeft size={18} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Action Area */}
      <Box sx={{ px: 2, mb: 2.5 }}>
        {isLocked ? (
          <Button
            fullWidth
            variant="contained"
            onClick={onUnlock}
            startIcon={<Lock size={14} />}
            sx={{ 
              borderRadius: '8px', 
              bgcolor: '#1e293b', 
              color: '#94a3b8',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#334155', color: '#f1f5f9' }, 
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.75rem',
              py: 1,
              border: '1px solid rgba(255,255,255,0.05)'
            }}
          >
            Unlock Access
          </Button>
        ) : (
          <Button
            fullWidth
            variant="contained"
            onClick={onUpload}
            disabled={isUploading}
            startIcon={isUploading ? <CircularProgress size={14} color="inherit" /> : <Plus size={14} />}
            sx={{ 
              borderRadius: '8px', 
              bgcolor: '#3b82f6', 
              boxShadow: '0 4px 12px rgba(59,130,246,0.25)',
              '&:hover': { bgcolor: '#2563eb', boxShadow: '0 6px 16px rgba(59,130,246,0.35)' }, 
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.75rem',
              py: 1
            }}
          >
            {isUploading ? 'Uploading...' : 'New Asset'}
          </Button>
        )}
      </Box>

      <Divider sx={{ mx: 2, borderColor: 'rgba(255,255,255,0.03)', mb: 2 }} />

      {/* Search Bar - Professional Minimalist */}
      <Box sx={{ px: 2, mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search repository..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoComplete="off"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={14} color="#475569" />
              </InputAdornment>
            ),
            sx: {
              bgcolor: 'transparent',
              fontSize: '0.75rem',
              color: '#f8fafc',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.08)' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#3b82f6', borderWidth: '1px' },
              height: 36,
              borderRadius: '6px'
            }
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, mb: 1.5, gap: 1 }}>
        <LayoutGrid size={12} color="#475569" />
        <Typography 
          variant="overline" 
          sx={{ 
            fontWeight: 700, 
            color: '#475569', 
            letterSpacing: '0.05em', 
            fontSize: '0.6rem',
            textTransform: 'uppercase'
          }}
        >
          All Resources
        </Typography>
      </Box>

      {/* File List - High Density & Professional */}
      <List 
        dense 
        sx={{ 
          px: 1, 
          flex: 1, 
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: '2px' },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 10 },
          '&::-webkit-scrollbar-track': { bgcolor: 'transparent' }
        }}
      >
        {filteredFiles.map(f => {
          const isSelected = selectedFile?.public_id === f.public_id;
          const isImage = f.resource_type === 'image';
          const isVideo = f.resource_type === 'video';
          const isPptx = (f.name || '').toLowerCase().endsWith('.pptx');
          const isDocx = (f.name || '').toLowerCase().endsWith('.docx');
          const isPdf = (f.name || '').toLowerCase().endsWith('.pdf');
          
          return (
            <ListItemButton 
              key={f.public_id} 
              selected={isSelected}
              onClick={() => onSelectFile(f)}
              sx={{ 
                borderRadius: '6px', 
                mb: 0.25,
                mx: 0.5,
                py: 0.8,
                px: 1.5,
                transition: 'all 0.15s ease-out',
                color: isSelected ? '#f8fafc' : '#94a3b8',
                '&.Mui-selected': { 
                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                  color: '#3b82f6',
                  '& .MuiListItemIcon-root': { color: '#3b82f6' },
                  '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.12)' }
                },
                '&:hover': { 
                    bgcolor: 'rgba(255,255,255,0.03)',
                    color: '#cbd5e1',
                    transform: 'none'
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 30, color: 'inherit' }}>
                {isImage ? <ImageIcon size={14} color="#60a5fa" /> : 
                 isVideo ? <Film size={14} color="#f87171" /> : 
                 isPptx ? <FileText size={14} color="#ef4444" /> :
                 isDocx ? <FileText size={14} color="#3b82f6" /> :
                 isPdf ? <FileText size={14} color="#f43f5e" /> :
                 <FileText size={14} color="#94a3b8" />}
              </ListItemIcon>

              <ListItemText 
                primary={f.name} 
                primaryTypographyProps={{ 
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '0.75rem',
                  noWrap: true,
                  letterSpacing: '0.01em'
                }} 
              />
            </ListItemButton>
          )
        })}
        
        {filteredFiles.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8, opacity: 0.2 }}>
            <Typography variant="caption">Empty repository</Typography>
          </Box>
        )}
      </List>

      {/* Footer / Settings Shortcut */}
      <Box sx={{ p: 1.5, borderTop: '1px solid rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'center' }}>
          <Typography variant="caption" sx={{ color: '#334155', fontWeight: 600, fontSize: '0.6rem' }}>
            BCH VAULT v2.1
          </Typography>
      </Box>
    </Box>
  );
}
