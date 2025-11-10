// File: routes/article.route.ts


import type { Request, Response } from "express";
 import express from "express";
import upload from "../utils/upload-images.js";
import { prisma } from "../utils/prisma-pagination.js";
import { updateArticle } from "../controller/article.controller.js";

const router = express.Router();

//*UPDATEARTICLE
// const router = express.Router();

// PUT /article/:id → edit artikel berdasarkan ID
// router.put("/:id", upload.single("photos"), updateArticle);

// router.put("/", upload.array("photo"), updateArticle async (req: Request, res: Response) => {
//   try {
//     const { title, content, userId, locationId } = req.body;

//     // 🔍 Validasi minimal
//     if (!title || !userId || !locationId) {
//       return res.status(400).json({
//         success: false,
//         message: "title, userId, dan locationId wajib diisi",
//       });
//     }
router.put("/:id", upload.array("photo"), async (req: Request, res: Response) => {
  const { title, content, userId, locationId } = req.body;

  if (!title || !userId || !locationId) {
    return res.status(400).json({
      success: false,
      message: "title, userId, dan locationId wajib diisi",
    });
  }

  try {
    // ... logika update artikel
  } catch (error) {
    console.error("❌ Error updating article:", error);
    return res.status(500).json({ message: "Failed to update article" });
  }
});






// export default router;







/**
 * ============================
 * POST /article
 * make new article + upload foto
 * ============================
 */
router.post("/", upload.array("photo"), async (req: Request, res: Response) => {
  try {
    const { title, content, userId, locationId } = req.body;

    // 🔍 Validasi minimal
    if (!title || !userId || !locationId) {
      return res.status(400).json({
        success: false,
        message: "title, userId, dan locationId wajib diisi",
      });
    }

    // 🔗 prepare data photo jika ada
    const photos =
      (req.files as Express.Multer.File[] | undefined)?.map((f) => ({
        url: `/images/${f.filename}`,
      })) || [];

    // 🧩 save to database
    const newPost = await prisma.post.create({
      data: {
        title,
        content,
        User: { connect: { id: parseInt(userId) } },
        Location: { connect: { id: parseInt(locationId) } },
        Photos: { createMany: { data: photos } },
      },
      include: {
        Location: true,
        Photos: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Post created successfully",
      post: {
        id: newPost.id,
        title: newPost.title,
        location: newPost.Location?.city || "未知地點",
        imgUrl: newPost.Photos?.[0]?.url || "",
      },
    });
  } catch (error) {
    console.error("❌ Error creating post:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save post",
    });
  }
});

/**
 * ============================
 * GET /article
 * take all article
 * ============================
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const posts = await prisma.post.findMany({
      include: {
        User: true,
        Location: true,
        Photos: true,
        Likes: true,
      },
      orderBy: { id: "desc" },
    });

    // 🔒 Pastikan semua properti aman
    const cards = posts.map((post) => ({
      id: post.id,
      title: post.title,
      location: post.Location?.id || "未知地點",
      imgUrl: post.Photos?.[0]?.url || "",
    }));

    return res.json(cards);
  } catch (error) {
    console.error("❌ Error fetching posts:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve posts",
    });
  }
});

/**
 * ============================
 * GET /article/:id
 * Ambil artikel berdasarkan ID
 * ============================
 */
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ message: "Invalid post ID" });
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id: parseInt(id) },
      include: {
        User: true,
        Location: true,
        Photos: true,
        Likes: true,
      },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // 💡 Format respons agar frontend langsung bisa pakai
    const formattedPost = {
      id: post.id,
      title: post.title,
      content: post.content,
      author: post.User?.userid || "未知作者",
      location: post.Location?.city || "未知地點",
      photos: post.Photos?.map((p) => p.url) || [],
      likesCount: post.Likes?.length || 0,
    };

    return res.json(formattedPost);
  } catch (error) {
    console.error("❌ Error retrieving post:", error);
    return res.status(500).json({ message: "Error retrieving post" });
  }
});

export default router;



























































































// // File: routes/article.route.ts


// import type { Request, Response } from "express";
//  import express from "express";
// import upload from "../utils/upload-images.js";
// import { prisma } from "../utils/prisma-pagination.js";

// const router = express.Router();

// /**
//  * ============================
//  * POST /article
//  * make new article + upload foto
//  * ============================
//  */
// router.post("/", upload.array("photo"), async (req: Request, res: Response) => {
//   try {
//     const { title, content, userId, locationId } = req.body;

//     // 🔍 Validasi minimal
//     if (!title || !userId || !locationId) {
//       return res.status(400).json({
//         success: false,
//         message: "title, userId, dan locationId wajib diisi",
//       });
//     }

//     // 🔗 prepare data photo jika ada
//     const photos =
//       (req.files as Express.Multer.File[] | undefined)?.map((f) => ({
//         url: `/images/${f.filename}`,
//       })) || [];

//     // 🧩 save to database
//     const newPost = await prisma.post.create({
//       data: {
//         title,
//         content,
//         User: { connect: { id: parseInt(userId) } },
//         Location: { connect: { id: parseInt(locationId) } },
//         Photos: { createMany: { data: photos } },
//       },
//       include: {
//         Location: true,
//         Photos: true,
//       },
//     });

//     return res.status(201).json({
//       success: true,
//       message: "Post created successfully",
//       post: {
//         id: newPost.id,
//         title: newPost.title,
//         location: newPost.Location?.city || "未知地點",
//         imgUrl: newPost.Photos?.[0]?.url || "",
//       },
//     });
//   } catch (error) {
//     console.error("❌ Error creating post:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to save post",
//     });
//   }
// });

// /**
//  * ============================
//  * GET /article
//  * take all article
//  * ============================
//  */
// router.get("/", async (_req: Request, res: Response) => {
//   try {
//     const posts = await prisma.post.findMany({
//       include: {
//         User: true,
//         Location: true,
//         Photos: true,
//         Likes: true,
//       },
//       orderBy: { id: "desc" },
//     });

//     // 🔒 Pastikan semua properti aman
//     const cards = posts.map((post) => ({
//       id: post.id,
//       title: post.title,
//       location: post.Location?.id || "未知地點",
//       imgUrl: post.Photos?.[0]?.url || "",
//     }));

//     return res.json(cards);
//   } catch (error) {
//     console.error("❌ Error fetching posts:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to retrieve posts",
//     });
//   }
// });

// /**
//  * ============================
//  * GET /article/:id
//  * Ambil artikel berdasarkan ID
//  * ============================
//  */
// router.get("/:id", async (req: Request, res: Response) => {
//   const { id } = req.params;

//   if (!id || isNaN(parseInt(id))) {
//     return res.status(400).json({ message: "Invalid post ID" });
//   }

//   try {
//     const post = await prisma.post.findUnique({
//       where: { id: parseInt(id) },
//       include: {
//         User: true,
//         Location: true,
//         Photos: true,
//         Likes: true,
//       },
//     });

//     if (!post) {
//       return res.status(404).json({ message: "Post not found" });
//     }

//     // 💡 Format respons agar frontend langsung bisa pakai
//     const formattedPost = {
//       id: post.id,
//       title: post.title,
//       content: post.content,
//       author: post.User?.userid || "未知作者",
//       location: post.Location?.city || "未知地點",
//       photos: post.Photos?.map((p) => p.url) || [],
//       likesCount: post.Likes?.length || 0,
//     };

//     return res.json(formattedPost);
//   } catch (error) {
//     console.error("❌ Error retrieving post:", error);
//     return res.status(500).json({ message: "Error retrieving post" });
//   }
// });

// export default router;














/// import type { Request, Response } from "express";
// import express from "express";
// // import express, { Request, Response } from 'express'
// import upload from "../utils/upload-images";
// // import { PrismaClient } from '../generated/prisma/client';
// import { prisma } from "../utils/prisma-pagination.js";

// const router = express.Router();
// // const prisma = new PrismaClient()

// // 🚀 POST: make new article with upload photo
// router.post("/", upload.array("photo"), async (req: Request, res: Response) => {
//   try {
//     const { title, content, userId, locationId } = req.body;
//     // Validasi minimal
//     if (!title || !userId || !locationId) {
//       return res
//         .status(400)
//         .json({ error: "title, userId, dan locationId wajib diisi" });
//     }

//     // const imageUrl = req.file ? `/images/${req.file.filename}` : null

//     const photos =
//       (req.files as Express.Multer.File[] | undefined)?.map((f) => {
//         return { url: `/images/${f.filename}` };
//       }) || [];

//     const newPost = await prisma.post.create({
//       data: {
//         User: { connect: { id: parseInt(userId) } },
//         Location: { connect: { id: parseInt(locationId) } },
//         title: title,
//         content: content,
//         Photos: {
//           createMany: { data: photos },
//         },
//       },
//     });

//     res.status(201).json({
//       success: true,
//       message: "Post created successfully",
//       post: newPost,
//     });
//   } catch (error) {
//     console.error("❌ Error creating post:", error);
//     res.status(500).json({ success: false, message: "Failed to save post" });
//   }
// });

// // 📥 GET all article
// router.get("/", async (_req: Request, res: Response) => {
//   try {
//     const posts = await prisma.post.findMany({
//       include: {
//         User: true,
//         Location: true,
//         Photos: true,
//         Likes: true,
//       },
//     });
//     console.log(posts)

//     const cards = [];

//     for (let i = 0; i < posts.length; i++) {
//       const card = {
//         id: posts[i].id,
//         title: posts[i].title,
//         location: posts[i].Location.city,
//         imgUrl: posts[i]?.Photos[0]?.url  || '',
//       };
//       cards.push(card);
//     }

//     res.json(cards);
//   } catch (error) {
//     console.error("❌ Error fetching posts:", error);
//     res
//       .status(500)
//       .json({ success: false, message: "Failed to retrieve posts" });
//   }
// });

// // 📥 Get all article depend on ID
// router.get("/:id", async (req: Request, res: Response) => {
//   const { id } = req.params;
//   try {
//     const post = await prisma.post.findUnique({
//       where: { id: parseInt(id) },
//       include: {
//         User: true,
//         Location: true,
//         Photos: true,
//         Likes: true,
//       },
//     });

//     if (!post) {
//       return res.status(404).json({ message: "Post not found" });
//     }

//     res.json(post);
//   } catch (error) {
//     res.status(500).json({ message: "Error retrieving post" });
//   }
// });

// export default router;

//// import express from "express";
// import type { Request, Response } from "express";

// // import type { Request, Response, NextFunction } from "express"; // Import tipe Express
// // ⚠️ Pastikan Anda membuat file deklarasi tipe untuk Multer
// import upload from "../middleware/upload.middleware";
// // ⚠️ Pastikan path ini benar
// import { PrismaClient } from "@prisma/client";
// import router from "./api-user";
// import router from "./article";

// // --- Definisi Tipe Kustom (Custom Type Definitions) ---

// // 1. Interface untuk Request Body (untuk POST)
// interface ArticleRequestBody {
//   title: string;
//   location: string;
//   content: string;
//   imageUrl: string;
//   // Anda bisa menambahkan field lain yang diekspektasikan dari body
// }

// // 2. Interface untuk Request dengan File (memperluas tipe Multer)
// // Multer secara otomatis menambahkan 'file' ke objek Request
// // Sayangnya, Multer tidak menyediakan tipe Request yang sudah diperluas di paket dasarnya
// // Kita bisa mendefinisikan ulang atau menggunakan deklarasi global (jika sudah ada)
// // Untuk sementara, kita bisa menggunakan 'any' di req.file, atau membuat tipe seperti ini:
// interface RequestWithFile extends Request {
//   file?: Express.Multer.File;
//   body: ArticleRequestBody; // Memaksa body menjadi tipe yang kita inginkan
// }

// // --- Inisialisasi ---

// const routers = router();
// const prisma = new PrismaClient();

// // 🚀 Endpoint POST untuk membuat artikel baru
// router.post(
//   "/",
//   // Gunakan upload.single sebagai middleware. Tipenya adalah RequestHandler.
//   upload.single("image"),
//   async (req: RequestWithFile, res: Response) => {
//     try {
//       // Data dari request body (field teks: title, location, content)
//       // Tipe dijamin oleh RequestWithFile
//       const { title, location, content } = req.body;

//       // Path gambar dari Multer, atau null jika tidak ada file
//       const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

//       // Simpan data ke database menggunakan Prisma
//       const newArticle = await prisma.post.create({
//         data: {
//           title,
//           location,
//           content,
//           imageUrl: imageUrl, // Menyimpan path gambar di database
//           // Tambahkan field lain jika ada (misal: authorId, createdAt)
//         },
//       });

//       // Kirim respons sukses
//       res.status(201).json({
//         success: true,
//         message: "Article created successfully",
//         article: newArticle,
//       });
//     } catch (error) {
//       // Di TS, lebih baik memastikan 'error' adalah objek Error
//       console.error("❌ Error creating article:", error);

//       // Kirim respons error
//       res.status(500).json({ success: false, message: "Failed to save article" });
//     }
//   }
// );

// // GET semua artikel (disesuaikan untuk menggunakan Prisma)
// router.get("/", async (req: Request, res: Response) => {
//   try {
//     // Ambil data dari database
//     const articles = await prisma.article.findMany();
//     res.json(articles);
//   } catch (error) {
//     console.error("❌ Error fetching articles:", error);
//     res
//       .status(500)
//       .json({ success: false, message: "Failed to retrieve articles" });
//   }
// });

// // GET artikel tertentu
// router.get("/:id", async (req: Request, res: Response) => {
//   // Destrukturisasi `id` dari req.params
//   const { id } = req.params;

//   // Memastikan bahwa ID adalah string yang bisa di-parse
//   if (isNaN(parseInt(id))) {
//       return res.status(400).json({ message: "Invalid Article ID format" });
//   }

//   try {
//     // Ambil data dari database berdasarkan ID
//     const article = await prisma.article.findUnique({
//       where: { id: parseInt(id) }, // Pastikan ID di-parse ke integer
//     });

//     if (!article) {
//       return res.status(404).json({ message: "Article not found" });
//     }
//     res.json(article);
//   } catch (error) {
//     console.error("❌ Error retrieving article:", error);
//     res.status(500).json({ success: false, message: "Error retrieving article" });
//   }
// });

// export default router;

// // Catatan: Jika Anda menggunakan Multer, Anda **harus** memastikan tipe `Express.Multer.File`
// // tersedia di proyek Anda dengan menginstal `@types/multer` dan
// // memiliki konfigurasi `tsconfig.json` yang benar.
