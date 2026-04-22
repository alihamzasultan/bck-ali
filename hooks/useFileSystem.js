import { useState, useCallback, useEffect } from 'react';
import { get, set } from 'idb-keyval';

export function useFileSystem() {
  const [dirHandle, setDirHandle] = useState(null);
  const [files, setFiles] = useState([]);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    async function restore() {
      const savedHandle = await get('ppt-dir-handle');
      if (savedHandle) {
        setDirHandle(savedHandle);
        try {
            const status = await savedHandle.queryPermission({ mode: 'readwrite' });
            if (status === 'granted') {
                setIsAuthorized(true);
                refreshFiles(savedHandle);
            }
        } catch (e) {
            console.error("Permission check failed", e);
        }
      }
    }
    restore();
  }, []);

  const refreshFiles = useCallback(async (handle) => {
    if (!handle) return;
    const list = [];
    try {
        for await (const entry of handle.values()) {
        if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.pptx')) {
            const file = await entry.getFile();
            list.push({
            name: entry.name,
            handle: entry,
            size: file.size,
            lastModified: file.lastModified
            });
        }
        }
        setFiles(list.sort((a, b) => b.lastModified - a.lastModified));
    } catch (e) {
        console.error("Refresh failed", e);
    }
  }, []);

  const connectFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite'
      });
      await set('ppt-dir-handle', handle);
      setDirHandle(handle);
      setIsAuthorized(true);
      await refreshFiles(handle);
    } catch (err) {
      console.error('Directory selection failed:', err);
    }
  };

  const saveFile = async (fileBlob, fileName) => {
    if (!dirHandle) return;
    try {
      const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(fileBlob);
      await writable.close();
      await refreshFiles(dirHandle);
    } catch (err) {
      console.error('Save failed:', err);
      throw err;
    }
  };

  const authorize = async () => {
    if (!dirHandle) return;
    const status = await dirHandle.requestPermission({ mode: 'readwrite' });
    if (status === 'granted') {
      setIsAuthorized(true);
      refreshFiles(dirHandle);
    }
  };

  return {
    dirHandle,
    files,
    isAuthorized,
    connectFolder,
    saveFile,
    authorize,
    refreshFiles: () => refreshFiles(dirHandle)
  };
}
