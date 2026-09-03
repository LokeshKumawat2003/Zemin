const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { uploadDir, cloudinary: cloudinaryConfig } = require('../config/env');
const { success } = require('../utils/response.util');
const AppError = require('../utils/AppError');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.body.folder || 'posts';
    const dir = path.join(uploadDir, folder);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const cloudinaryEnabled = Boolean(
  cloudinaryConfig.cloudName && cloudinaryConfig.apiKey && cloudinaryConfig.apiSecret
);

if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: cloudinaryConfig.cloudName,
    api_key: cloudinaryConfig.apiKey,
    api_secret: cloudinaryConfig.apiSecret,
  });
}

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|mp4|mov/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype.split('/')[1] || '');
    if (ext || mime) cb(null, true);
    else cb(new AppError('VALIDATION_ERROR', 400, 'Invalid file type'));
  },
}).single('file');

exports.uploadMedia = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) return next(err);
    if (!req.file) return next(new AppError('VALIDATION_ERROR', 400, 'File required'));

    const folder = req.body.folder === 'avatars' ? 'avatars' : 'posts';
    const type = req.body.type || (req.file.mimetype.startsWith('video') ? 'video' : 'image');

    if (!cloudinaryEnabled) {
      const baseUrl = `${req.protocol}://${req.get('host')}/uploads/${folder}`;
      return success(res, {
        url: `${baseUrl}/${req.file.filename}`,
        type,
        size: req.file.size,
        filename: req.file.filename,
      }, 'Upload successful', 201);
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: `zemin/${folder}`, resource_type: 'auto' },
      (uploadError, result) => {
        if (uploadError) return next(uploadError);
        return success(res, {
          url: result.secure_url,
          type,
          size: req.file.size,
          filename: result.public_id,
        }, 'Upload successful', 201);
      }
    );
    uploadStream.end(fs.readFileSync(req.file.path));
  });
};

module.exports.uploadMiddleware = upload;
