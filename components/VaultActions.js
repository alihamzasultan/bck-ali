'use client';
import React, { useState } from 'react';
import { 
  Stack, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField,
  Typography
} from '@mui/material';
import { Edit3, Trash2, Download } from 'lucide-react';

export default function VaultActions({ file, onRename, onDelete }) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(file?.name || '');

  if (!file) return null;

  return (
    <Stack direction="row" spacing={1.5}>
      <Button 
        variant="outlined" 
        size="small" 
        startIcon={<Download size={16} />}
        href={file.secure_url}
        target="_blank"
        sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700 }}
      >
        Download
      </Button>

      <Button 
        variant="outlined" 
        color="primary"
        size="small" 
        startIcon={<Edit3 size={16} />}
        onClick={() => {
            setNewName(file.name);
            setIsRenaming(true);
        }}
        sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700 }}
      >
        Rename
      </Button>

      <Button 
        variant="outlined" 
        color="error"
        size="small" 
        startIcon={<Trash2 size={16} />}
        onClick={() => {
            if (window.confirm(`Are you sure you want to delete ${file.name}?`)) {
                onDelete(file.public_id, file.resource_type);
            }
        }}
        sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700 }}
      >
        Delete
      </Button>

      <Dialog open={isRenaming} onClose={() => setIsRenaming(false)}>
        <DialogTitle sx={{ fontWeight: 800 }}>Rename Asset</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Provide a new name for <strong>{file.name}</strong>.
          </Typography>
          <TextField 
            fullWidth 
            size="small" 
            value={newName} 
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setIsRenaming(false)} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => {
                onRename(file.public_id, newName, file.resource_type);
                setIsRenaming(false);
            }}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
