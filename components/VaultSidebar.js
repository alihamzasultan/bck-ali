'use client';
import React, { useState, useMemo } from 'react';
import { 
  List, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Typography, 
  Box, 
  Collapse,
  alpha,
  IconButton
} from '@mui/material';
import { 
  Folder, 
  FolderOpen, 
  Image, 
  Video, 
  FileText, 
  ChevronRight, 
  ChevronDown,
  MoreVertical,
  Upload
} from 'lucide-react';
import { Menu, MenuItem } from '@mui/material';

export default function VaultSidebar({ 
  files, 
  onSelectFile,
  selectedFile,
  onUploadToFolder,
  folders = [],
  rootName = "BCH-FILES"
}) {
  const [openFolders, setOpenFolders] = useState({});
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [activeFolder, setActiveFolder] = useState(null);

  // --- Transform flat files into a tree ---
  const fileTree = useMemo(() => {
    const root = { name: 'Root', folders: {}, files: [] };
    
    // 1. Initialize tree with explicit folders from API (handles empty folders)
    folders.forEach(f => {
        // Paths from API are like "BCH-FILES/Computer 2"
        const relPath = f.path.startsWith(rootName + '/') 
            ? f.path.replace(rootName + '/', '') 
            : f.path === rootName ? '' : f.path;
            
        if (!relPath) return;

        const parts = relPath.split('/');
        let current = root;
        
        parts.forEach((folderName, i) => {
            if (!current.folders[folderName]) {
                const subPath = parts.slice(0, i + 1).join('/');
                current.folders[folderName] = {
                    name: folderName,
                    path: `${rootName}/${subPath}`,
                    folders: {},
                    files: []
                };
            }
            current = current.folders[folderName];
        });
    });

    // 2. Populate files into the tree
    files.forEach(file => {
      const parts = file.name.split('/');
      let current = root;
      
      for (let i = 0; i < parts.length - 1; i++) {
        const folderName = parts[i];
        if (!current.folders[folderName]) {
          const subPath = parts.slice(0, i + 1).join('/');
          const fullPath = `${rootName}/${subPath}`;
          
          current.folders[folderName] = { 
            name: folderName, 
            path: fullPath, 
            folders: {}, 
            files: [] 
          };
        }
        current = current.folders[folderName];
      }
      
      const fileName = parts[parts.length - 1];
      current.files.push({ ...file, displayName: fileName });
    });
    
    return root;
  }, [files, folders, rootName]);

  const toggleFolder = (path) => {
    setOpenFolders(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const renderTree = (node, path = '', level = 0) => {
    // Sort folders and files alphabetically
    const folderNames = Object.keys(node.folders).sort();
    const sortedFiles = [...node.files].sort((a, b) => a.displayName.localeCompare(b.displayName));

    return (
      <Box 
        key={path || 'root'} 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          width: '100%'
        }}
      >
        {folderNames.map(name => {
          const folder = node.folders[name];
          const fullPath = folder.path;
          const isOpen = !!openFolders[fullPath];
          
          return (
            <React.Fragment key={fullPath}>
              <ListItemButton 
                onClick={() => toggleFolder(fullPath)}
                sx={{ 
                  pl: level * 2 + 1,
                  borderRadius: 2,
                  mb: 0.5,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': { 
                    bgcolor: 'rgba(255,255,255,0.08)',
                    transform: 'translateX(4px)'
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {isOpen ? (
                    <FolderOpen size={18} color="#94a3b8" style={{ filter: 'drop-shadow(0 0 8px rgba(148,163,184,0.3))' }} />
                  ) : (
                    <Folder size={18} color="#64748b" />
                  )}
                </ListItemIcon>
                <ListItemText 
                  primary={name} 
                  primaryTypographyProps={{ 
                    fontSize: '0.85rem', 
                    fontWeight: isOpen ? 700 : 500,
                    color: isOpen ? 'white' : 'rgba(255,255,255,0.8)',
                    letterSpacing: '-0.01em'
                  }} 
                />
                <Box sx={{ opacity: 0.4, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                   <IconButton 
                     size="small" 
                     onClick={(e) => {
                       e.stopPropagation();
                       setMenuAnchor(e.currentTarget);
                       setActiveFolder(folder);
                     }}
                     sx={{ 
                       color: 'white', 
                       p: 0.5,
                       '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                     }}
                   >
                     <MoreVertical size={14} />
                   </IconButton>
                   {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </Box>
              </ListItemButton>
              
              <Collapse in={isOpen} timeout={300} unmountOnExit>
                <Box sx={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(255,255,255,0.05)', ml: level * 2 + 2 }}>
                    {renderTree(folder, fullPath, level + 1)}
                </Box>
              </Collapse>
            </React.Fragment>
          );
        })}
        
        {sortedFiles.map(f => {
          const isSelected = selectedFile?.public_id === f.public_id;
          const isImage = f.resource_type === 'image';
          const isVideo = f.resource_type === 'video';
          
          return (
            <ListItemButton 
              key={f.public_id} 
              selected={isSelected}
              onClick={() => onSelectFile(f)}
              sx={{ 
                pl: (level + 1) * 2 + 1,
                borderRadius: 2, 
                mb: 0.5,
                mx: 0.5,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                color: isSelected ? 'white' : 'rgba(255,255,255,0.6)',
                '&.Mui-selected': { 
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: 'white',
                  '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.25)' }
                },
                '&:hover': { 
                    bgcolor: 'rgba(255,255,255,0.05)',
                    color: 'white'
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                {isImage ? <Image size={16} color={isSelected ? "#60a5fa" : "#94a3b8"} /> : 
                 isVideo ? <Video size={16} color={isSelected ? "#f87171" : "#94a3b8"} /> : 
                 <FileText size={16} color="#94a3b8" />}
              </ListItemIcon>
              <ListItemText 
                primary={f.displayName} 
                primaryTypographyProps={{ 
                  fontWeight: isSelected ? 800 : 400,
                  fontSize: '0.8rem',
                  noWrap: true,
                  letterSpacing: '0.01em'
                }} 
              />
            </ListItemButton>
          )
        })}
      </Box>
    );
  };

  return (
    <Box>
      <Box sx={{ px: 2, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="overline" sx={{ fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: 2.5, fontSize: '0.65rem' }}>
          VAULT REPOSITORY
        </Typography>
      </Box>

      <List dense sx={{ px: 1 }}>
        <React.Fragment>
            <ListItemButton 
                onClick={() => setOpenFolders(prev => ({ ...prev, 'ROOT': !prev['ROOT'] }))}
                sx={{ 
                  borderRadius: 2,
                  mb: 0.5,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': { 
                    bgcolor: 'rgba(255,255,255,0.08)',
                    transform: 'translateX(4px)'
                  }
                }}
            >
                <ListItemIcon sx={{ minWidth: 32 }}>
                    {openFolders['ROOT'] !== false ? (
                        <FolderOpen size={18} color="#94a3b8" style={{ filter: 'drop-shadow(0 0 8px rgba(148,163,184,0.3))' }} />
                    ) : (
                        <Folder size={18} color="#64748b" />
                    )}
                </ListItemIcon>
                <ListItemText 
                    primary={rootName} 
                    primaryTypographyProps={{ 
                        fontSize: '0.9rem', 
                        fontWeight: 900,
                        color: 'white',
                        letterSpacing: '0.05em'
                    }} 
                />
                <Box sx={{ opacity: 0.4, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <IconButton 
                        size="small" 
                        onClick={(e) => {
                            e.stopPropagation();
                            setMenuAnchor(e.currentTarget);
                            setActiveFolder({ path: rootName });
                        }}
                        sx={{ color: 'white', p: 0.5 }}
                    >
                        <MoreVertical size={14} />
                    </IconButton>
                    {openFolders['ROOT'] !== false ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </Box>
            </ListItemButton>
            <Collapse in={openFolders['ROOT'] !== false} timeout={300} unmountOnExit>
                <Box sx={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(255,255,255,0.05)', ml: 3 }}>
                    {renderTree(fileTree)}
                </Box>
            </Collapse>
        </React.Fragment>

        <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
            PaperProps={{
              sx: {
                bgcolor: 'rgba(30, 41, 59, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                minWidth: 160
              }
            }}
        >
            <MenuItem 
              onClick={() => {
                onUploadToFolder(activeFolder.path);
                setMenuAnchor(null);
              }}
              sx={{ gap: 1.5, py: 1 }}
            >
                <Upload size={16} />
                <Typography variant="body2">Upload File</Typography>
            </MenuItem>
        </Menu>
        
        {files.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8, opacity: 0.3 }}>
            <Folder size={40} style={{ margin: '0 auto' }} />
            <Typography variant="body2" sx={{ mt: 1 }}>No Assets found</Typography>
          </Box>
        )}
      </List>
    </Box>
  );
}
