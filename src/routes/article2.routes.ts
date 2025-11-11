// 📁 src/routes/article.route.ts
import express, { type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import { jwtParseMiddleware, requireAuth } from "../middleware/jwt.js"; // pastikan .js kalau pakai ESModule

const router = express.Router();
const prisma = new PrismaClient();

// === Multer 設定 ===
const uploadDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// ✅ Middleware 全域 JWT 解析
router.use(jwtParseMiddleware);

/**
 * ✅ [GET] /article
 * 取得所有文章（公開）
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const articles = await prisma.article.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: articles });
  } catch (error) {
    console.error("取得文章列表失敗:", error);
    res.status(500).json({
      success: false,
      message: "伺服器錯誤，無法取得文章",
    });
  }
});

/**
 * ✅ [GET] /article/:id
 * 取得特定文章（公開）
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const article = await prisma.article.findUnique({
      where: { id: Number(id) },
      include: { user: true },
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "找不到該文章",
      });
    }

    res.json({ success: true, data: article });
  } catch (error) {
    console.error("取得文章失敗:", error);
    res.status(500).json({
      success: false,
      message: "伺服器錯誤",
    });
  }
});

/**
 * ✅ [POST] /article
 * 建立新文章（需登入）
 */
router.post(
  "/",
  requireAuth,
  upload.array("photos", 5),
  async (req: Request, res: Response) => {
    try {
      const { title, location, content } = req.body;
      const userId = req.user?.user_id; // ✅ Sekarang sudah dikenal TS

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "未登入用戶無法建立文章",
        });
      }

      const photos = (req.files as Express.Multer.File[] | undefined)?.map(
        (file) => `/uploads/${file.filename}`
      );

      const newArticle = await prisma.article.create({
        data: {
          userId,
          title,
          location,
          content,
          photos: photos || [],
        },
      });

      res.status(201).json({
        success: true,
        data: newArticle,
      });
    } catch (error) {
      console.error("建立文章失敗:", error);
      res.status(500).json({
        success: false,
        message: "伺服器錯誤，無法建立文章",
      });
    }
  }
);

/**
 * ✅ [PUT] /article/:id
 * 編輯文章（需登入）
 */
router.put(
  "/:id",
  requireAuth,
  upload.array("photos", 5),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, location, content } = req.body;
      const userId = req.user?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "未登入用戶無法編輯文章",
        });
      }

      const article = await prisma.article.findUnique({
        where: { id: Number(id) },
      });

      if (!article) {
        return res.status(404).json({
          success: false,
          message: "找不到該文章",
        });
      }

      if (article.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: "您沒有權限編輯此文章",
        });
      }

      const photos = (req.files as Express.Multer.File[] | undefined)?.map(
        (file) => `/uploads/${file.filename}`
      );

      const updatedArticle = await prisma.article.update({
        where: { id: Number(id) },
        data: {
          title,
          location,
          content,
          photos: photos || article.photos,
        },
      });

      res.json({ success: true, data: updatedArticle });
    } catch (error) {
      console.error("編輯文章失敗:", error);
      res.status(500).json({
        success: false,
        message: "伺服器錯誤，無法編輯文章",
      });
    }
  }
);

/**
 * ✅ [DELETE] /article/:id
 * 刪除文章（需登入）
 */
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.user_id;

    const article = await prisma.article.findUnique({
      where: { id: Number(id) },
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "找不到該文章",
      });
    }

    if (article.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "您沒有權限刪除此文章",
      });
    }

    await prisma.article.delete({
      where: { id: Number(id) },
    });

    res.json({ success: true, message: "文章已刪除" });
  } catch (error) {
    console.error("刪除文章失敗:", error);
    res.status(500).json({
      success: false,
      message: "伺服器錯誤，無法刪除文章",
    });
  }
});

export default router;





































































// // File: routes/article.route.ts


// import type { Request, Response } from "express";
//  import express from "express";
// import upload from "../utils/upload-images.js";
// import { prisma } from "../utils/prisma-pagination.js";
// import { jwtParseMiddleware } from "../middleware/jwt.js";
// import jwt from "jsonwebtoken";
// import { updateArticle } from "../controller/article.controller.js";

// const router = express.Router();

// //*UPDATEARTICLE
// // const router = express.Router();

// /**
//  * ============================
//  * PUT /article/:id
//  * Update artikel berdasarkan ID
//  * ============================
//  */
// // upload.array("photo"),



// router.put("/:id",  async (req: Request, res: Response) => {
//   const { id } = req.params;
//   const { title, content, userId, locationId } = req.body;
  
//   // 🔍 Validasi ID numerik
//   if (!id || isNaN(parseInt(id))) {
//     return res.status(400).json({ success: false, message: "Invalid article ID" });
//   }
  
//   // 🔍 Validasi field wajib
//   if (!title || !userId || !locationId) {
//     return res.status(400).json({
//       success: false,
//       message: "title, userId, dan locationId wajib diisi",
//     });
//   }

//   try {
//     // 🔎 Periksa apakah artikel ada
//     const existingPost = await prisma.post.findUnique({
//       where: { id: parseInt(id) },
//       include: { Photos: true },
//     });

//     if (!existingPost) {
//       return res.status(404).json({ success: false, message: "Artikel tidak ditemukan" });
//     }

//     // 📸 Upload new photos (jika ada)
//     const newPhotos =
//       (req.files as Express.Multer.File[] | undefined)?.map((f) => ({
//         url: `/images/${f.filename}`,
//         postId: parseInt(id),
//       })) || [];

//     // 🧩 Update article
//     const updatedPost = await prisma.post.update({
//       where: { id: parseInt(id) },
//       data: {
//         title,
//         content,
//         User: { connect: { id: parseInt(userId) } },
//         Location: { connect: { id: parseInt(locationId) } },
//         // Tambah foto baru (jika ada)
//         Photos: newPhotos.length > 0 ? { createMany: { data: newPhotos } } : undefined,
//       },
//       include: {
//         User: true,
//         Location: true,
//         Photos: true,
//       },
//     });

//     return res.status(200).json({
//       success: true,
//       message: "文章編輯完成",
//       post: {
//         id: updatedPost.id,
//         title: updatedPost.title,
//         content: updatedPost.content,
//         location: updatedPost.Location?.city || "未知地點",
//         photos: updatedPost.Photos.map((p) => p.url),
//       },
//     });
//   } catch (error) {
//     console.error("❌ Error updating article:", error);
//     return res.status(500).json({
//       success: false,
//       message: "編輯文章失敗",
//     });
//   }
// });

// /**
//  * ============================
//  * POST /article
//  * make new article + upload foto
//  * ============================
//  */
// /// router.post("/", upload.array("photo"), async (req: Request, res: Response) => {
// //   try {
// //     const { title, content, userId, locationId } = req.body;

// //     // 🔍 Validasi minimal
// //     if (!title || !userId || !locationId) {
// //       return res.status(400).json({
// //         success: false,
// //         message: "title, userId, dan locationId 必填寫",
// //       });
// //     }

// //     // 🔗 prepare data photo jika ada
// //     const photos =
// //       (req.files as Express.Multer.File[] | undefined)?.map((f) => ({
// //         url: `/images/${f.filename}`,
// //       })) || [];

// //     // 🧩 save to database
// //     const newPost = await prisma.post.create({
// //       data: {
// //         title,
// //         content,
// //         User: { connect: { id: parseInt(userId) } },
// //         Location: { connect: { id: parseInt(locationId) } },
// //         Photos: { createMany: { data: photos } },
// //       },
// //       include: {
// //         Location: true,
// //         Photos: true,
// //       },
// //     });

// //     return res.status(201).json({
// //       success: true,
// //       message: "Post created successfully",
// //       post: {
// //         id: newPost.id,
// //         title: newPost.title,
// //         location: newPost.Location?.city || "未知地點",
// //         imgUrl: newPost.Photos?.[0]?.url || "",
// //       },
// //     });
// //   } catch (error) {
// //     console.error("❌ Error creating post:", error);
// //     return res.status(500).json({
// //       success: false,
// //       message: "Failed to save post",
// //     });
// //   }
// // });
// router.post(
//   "/",
//   jwtParseMiddleware, // ✅ proteksi JWT
//   upload.array("photo"),
//   async (req: Request, res: Response) => {
//     try {
//       const { title, content, userId, locationId } = req.body;

//       // kamu bisa ganti userId dari token:
//       // const userId = (req as any).user?.id;

//       // validasi & simpan seperti biasa...
//     } catch (error) {
//       console.error("❌ Error creating post:", error);
//       return res.status(500).json({
//         success: false,
//         message: "Failed to save post",
//       });
//     }
//   }
// );

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

//     // 🔒 確認全 property aman
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
//  * Get article based on ID
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
