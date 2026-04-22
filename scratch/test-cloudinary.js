const cloudinary = require('cloudinary').v2;
require('dotenv').config({ path: '.env.local' });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log("Testing Cloudinary Connection...");
console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);

cloudinary.api.ping()
  .then(res => {
    console.log("Ping Success:", res);
    return cloudinary.api.root_folders();
  })
  .then(res => {
    console.log("Root Folders:", res.folders.map(f => f.name));
    console.log("Checking for BCH-FILES...");
    return cloudinary.api.subfolders("BCH-FILES").catch(e => ({ error: e.message }));
  })
  .then(res => {
    console.log("BCH-FILES Subfolders Result:", res);
    process.exit(0);
  })
  .catch(err => {
    console.error("Cloudinary Test Failed:", err.message);
    process.exit(1);
  });
