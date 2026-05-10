export const VaultService = {
  async getVault(path) {
    const resp = await fetch(`/api/vault?path=${encodeURIComponent(path)}&t=${Date.now()}`);
    if (!resp.ok) throw new Error('Failed to fetch vault');
    return resp.json();
  },

  async uploadFile(path, file) {
    const fileName = file.name;
    const ext = fileName.split('.').pop().trim().toLowerCase();
    
    // Determine resource type
    let resourceType = 'raw';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'heic', 'tiff'].includes(ext)) {
      resourceType = 'image';
    } else if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
      resourceType = 'video';
    }

    // 1. Get signature from our server
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9\-_]/g, '_');
    const sanitizedPublicId = (resourceType === 'raw' || ext === 'pdf') 
      ? `${nameWithoutExt}.${ext}` 
      : nameWithoutExt;

    const timestamp = Math.round(new Date().getTime() / 1000);
    const paramsToSign = {
      timestamp,
      folder: path,
      public_id: sanitizedPublicId
    };

    const signResp = await fetch('/api/sign-cloudinary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paramsToSign })
    });

    if (!signResp.ok) throw new Error('Failed to get upload signature');
    const { signature, apiKey, cloudName } = await signResp.json();

    // 2. Upload directly to Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('folder', path);
    formData.append('public_id', sanitizedPublicId);

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
    const uploadResp = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: formData
    });

    if (!uploadResp.ok) {
      const errData = await uploadResp.json();
      throw new Error(errData.error?.message || 'Cloudinary upload failed');
    }

    return uploadResp.json();
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
