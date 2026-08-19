const multer = require('multer');

// Configure memory storage - file will be available as req.file.buffer
const storage = multer.memoryStorage();

// Validate file types
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG and WEBP images are allowed.'), false);
  }
};

const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max size
  }
});

module.exports = uploadMiddleware;
