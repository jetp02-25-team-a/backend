// File: routes/article.routes.ts

import type { Router, Request, Response, NextFunction } from "express"; // Import tipe Express
// ⚠️ Pastikan Anda membuat file deklarasi tipe untuk Multer
import upload from "../middleware/upload.middleware";
// ⚠️ Pastikan path ini benar
import { PrismaClient } from "../generated/prisma/client.js";

// --- Definisi Tipe Kustom (Custom Type Definitions) ---

// 1. Interface untuk Request Body (untuk POST)
interface ArticleRequestBody {
  title: string;
  location: string;
  content: string;
  // Anda bisa menambahkan field lain yang diekspektasikan dari body
}

// 2. Interface untuk Request dengan File (memperluas tipe Multer)
// Multer secara otomatis menambahkan 'file' ke objek Request
// Sayangnya, Multer tidak menyediakan tipe Request yang sudah diperluas di paket dasarnya
// Kita bisa mendefinisikan ulang atau menggunakan deklarasi global (jika sudah ada)
// Untuk sementara, kita bisa menggunakan 'any' di req.file, atau membuat tipe seperti ini:
interface RequestWithFile extends Request {
  file?: Express.Multer.File;
  body: ArticleRequestBody; // Memaksa body menjadi tipe yang kita inginkan
}

// --- Inisialisasi ---

const router = Router();
const prisma = new PrismaClient();

// 🚀 Endpoint POST untuk membuat artikel baru
router.post(
  "/",
  // Gunakan upload.single sebagai middleware. Tipenya adalah RequestHandler.
  upload.single("image"),
  async (req: RequestWithFile, res: Response) => {
    try {
      // Data dari request body (field teks: title, location, content)
      // Tipe dijamin oleh RequestWithFile
      const { title, location, content } = req.body;
      
      // Path gambar dari Multer, atau null jika tidak ada file
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null; 

      // Simpan data ke database menggunakan Prisma
      const newArticle = await prisma.article.create({
        data: {
          title,
          location,
          content,
          imageUrl: imageUrl, // Menyimpan path gambar di database
          // Tambahkan field lain jika ada (misal: authorId, createdAt)
        },
      }); 

      // Kirim respons sukses
      res.status(201).json({
        success: true,
        message: "Article created successfully",
        article: newArticle,
      });
    } catch (error) {
      // Di TS, lebih baik memastikan 'error' adalah objek Error
      console.error("❌ Error creating article:", error);
      
      // Kirim respons error
      res.status(500).json({ success: false, message: "Failed to save article" });
    }
  }
);

// GET semua artikel (disesuaikan untuk menggunakan Prisma)
router.get("/", async (req: Request, res: Response) => {
  try {
    // Ambil data dari database
    const articles = await prisma.article.findMany();
    res.json(articles);
  } catch (error) {
    console.error("❌ Error fetching articles:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to retrieve articles" });
  }
});

// GET artikel tertentu
router.get("/:id", async (req: Request, res: Response) => {
  // Destrukturisasi `id` dari req.params
  const { id } = req.params;
  
  // Memastikan bahwa ID adalah string yang bisa di-parse
  if (isNaN(parseInt(id))) {
      return res.status(400).json({ message: "Invalid Article ID format" });
  }

  try {
    // Ambil data dari database berdasarkan ID
    const article = await prisma.article.findUnique({
      where: { id: parseInt(id) }, // Pastikan ID di-parse ke integer
    });

    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }
    res.json(article);
  } catch (error) {
    console.error("❌ Error retrieving article:", error);
    res.status(500).json({ success: false, message: "Error retrieving article" });
  }
});

export default router;

// Catatan: Jika Anda menggunakan Multer, Anda **harus** memastikan tipe `Express.Multer.File` 
// tersedia di proyek Anda dengan menginstal `@types/multer` dan 
// memiliki konfigurasi `tsconfig.json` yang benar.