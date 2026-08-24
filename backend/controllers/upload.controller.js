const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { uploadDir } = require('../config/env');
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

    const folder = req.body.folder || 'posts';
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/${folder}`;
    const url = `${baseUrl}/${req.file.filename}`;

    success(res, {
      url,
      type: req.body.type || (req.file.mimetype.startsWith('video') ? 'video' : 'image'),
      size: req.file.size,
      filename: req.file.filename,
    }, 'Upload successful', 201);
  });
};

module.exports.uploadMiddleware = upload;
