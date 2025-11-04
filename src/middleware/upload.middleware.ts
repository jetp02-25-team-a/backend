// File: middleware/upload.middleware.ts (Optimal Version)

// import multer from 'multer';
// import path from 'path';
// import fs from 'fs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// 1. Fix __dirname di ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tentukan direktori uploads (Pastikan ini sesuai dengan konfigurasi server utama)
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// 2. Definisi Ekstensi yang Diizinkan
const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    // Memberikan nama unik yang aman
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

// 3. Fungsi Filter (Pencegahan Keamanan)
const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    // Mengembalikan error jika ekstensi tidak diizinkan
    return cb(new Error('Hanya file gambar (.jpg, .png, .webp) yang diizinkan'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // ✅ Batasi ukuran file hingga 5MB
  },
  fileFilter, // ✅ Terapkan filter ekstensi
});

export default upload;




// import multer from 'multer';
// import path from 'path';
// import fs from 'fs';

// // Buat folder uploads jika belum ada
// const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
// if (!fs.existsSync(uploadsDir)) {
//   fs.mkdirSync(uploadsDir, { recursive: true });
// }

// // Validasi ekstensi file
// const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, uploadsDir);
//   },
//   filename: (req, file, cb) => {
//     const ext = path.extname(file.originalname).toLowerCase();
//     const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
//     cb(null, name);
//   },
// });

// const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
//   const ext = path.extname(file.originalname).toLowerCase();
//   if (!allowedExtensions.includes(ext)) {
//     return cb(new Error('Only image files are allowed (.jpg, .jpeg, .png, .webp)'));
//   }
//   cb(null, true);
// };

// const upload = multer({
//   storage,
//   limits: {
//     fileSize: 5 * 1024 * 1024, // 5MB
//   },
//   fileFilter,
// });

// export default upload;

// import multer from 'multer';
// import path from 'path';
// import fs from 'fs';
// import { fileURLToPath } from 'url';

// // Tambahan ini agar __dirname bisa digunakan
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

// // Pastikan folder uploads ada
// if (!fs.existsSync(uploadsDir)) {
//   fs.mkdirSync(uploadsDir, { recursive: true });
// }

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, uploadsDir);
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + '-' + file.originalname);
//   },
// });

// const upload = multer({ storage });
// export default upload;

// import { PrismaClient } from '../generated/prisma';


// Fix __dirname di ESM
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const uploadDir = path.join(__dirname, '..', '..', 'uploads');
// if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// const storage = multer.diskStorage({
//   destination: (_, __, cb) => cb(null, uploadDir),
//   filename: (_, file, cb) => cb(null, Date.now() + '-' + file.originalname),
// });

// const upload = multer({ storage });
// export default upload;







// import multer from 'multer';
// import path from 'path';
// import fs from 'fs';

// const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
// if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, uploadsDir);
//   },
//   filename: (req, file, cb) => {
//     const ext = path.extname(file.originalname) || '';
//     const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
//     cb(null, name);
//   },
// });

// export default multer({ storage });
