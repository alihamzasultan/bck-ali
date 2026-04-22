'use client';
import React from 'react';
import { 
  List, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Typography, 
  Box, 
  Divider,
  Button
} from '@mui/material';
import { Folder, Image, Video, FileText, ChevronLeft, Home } from 'lucide-react';

export default function VaultSidebar({ 
  files, 
  onSelectFile,
  selectedFile
}) {
  return (
    <Box>
      <Typography variant="overline" sx={{ px: 2, fontWeight: 800, color: 'text.secondary', display: 'block' }}>
        All Vault Assets
      </Typography>
      <List dense sx={{ px: 1 }}>
        {files.map((f, i) => {
          const isSelected = selectedFile?.public_id === f.public_id;
          const isImage = f.resource_type === 'image';
          const isVideo = f.resource_type === 'video';
          
          return (
            <ListItemButton 
              key={f.public_id} 
              selected={isSelected}
              onClick={() => onSelectFile(f)}
              sx={{ 
                borderRadius: 2, 
                mb: 0.5,
                '&.Mui-selected': { backgroundColor: 'rgba(99,102,241,0.12)' }
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {isImage ? <Image size={18} color="#60a5fa" /> : 
                 isVideo ? <Video size={18} color="#f87171" /> : 
                 <FileText size={18} color="#94a3b8" />}
              </ListItemIcon>
              <ListItemText 
                primary={f.name} 
                primaryTypographyProps={{ 
                  fontWeight: isSelected ? 800 : 500,
                  fontSize: 13,
                  // Enable wrapping for long paths
                  style: { wordBreak: 'break-all' }
                }} 
              />
            </ListItemButton>
          )
        })}
        {files.length === 0 && (
          <Typography variant="body2" sx={{ px: 2, py: 1, opacity: 0.5 }}>No assets found</Typography>
        )}
      </List>
    </Box>
  );
}
