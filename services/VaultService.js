export const VaultService = {
  async getVault(path) {
    const resp = await fetch(`/api/vault?path=${encodeURIComponent(path)}&t=${Date.now()}`);
    if (!resp.ok) throw new Error('Failed to fetch vault');
    return resp.json();
  },

  async uploadFile(path, file) {
    const formData = new FormData();
    formData.append('path', path);
    formData.append('file', file);
    const resp = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    if (!resp.ok) throw new Error('Upload failed');
    return resp.json();
  },

  async renameAsset(oldId, newName, resourceType) {
    const resp = await fetch('/api/rename', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ old_id: oldId, new_name: newName, resource_type: resourceType }),
    });
    if (!resp.ok) throw new Error('Rename failed');
    return resp.json();
  },

  async deleteAsset(publicId, resourceType) {
    const resp = await fetch(`/api/delete?public_id=${encodeURIComponent(publicId)}&resource_type=${resourceType}`, {
      method: 'DELETE',
    });
    if (!resp.ok) throw new Error('Delete failed');
    return resp.json();
  },

  async authenticate(password) {
    const resp = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!resp.ok) return { authorized: false };
    return resp.json();
  },
};
