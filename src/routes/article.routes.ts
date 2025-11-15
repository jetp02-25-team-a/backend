// // src/routes/article.route.ts
// import type { Request, Response } from "express";
// import { Router } from "express";
// import upload from "../utils/upload-images-post.js";
// import { prisma } from "../utils/prisma-pagination.js";
// import { jwtParseMiddleware, requireAuth } from "../middleware/jwt.js";

// const router = Router();

// /* ==========================================================
//    PUT /article/:id - Update artikel
//    ========================================================== */
// router.put("/:id", jwtParseMiddleware, requireAuth, upload.array("photo"), async (req: Request, res: Response) => {
//   const { id } = req.params;
//   const { title, content, locationId } = req.body;
//   const authenticatedUserId = req.user?.user_id;

//   if (!id || isNaN(parseInt(id))) {
//     return res.status(400).json({ success: false, message: "Invalid article ID" });
//   }
//   if (!title || !locationId) {
//     return res.status(400).json({ success: false, message: "title dan locationId wajib diisi" });
//   }
//   if (!authenticatedUserId) {
//     return res.status(401).json({ success: false, message: "Unauthorized" });
//   }

//   try {
//     const postId = parseInt(id);
//     const existingPost = await prisma.post.findUnique({ where: { id: postId }, select: { userId: true } });
//     if (!existingPost) return res.status(404).json({ success: false, message: "Artikel tidak ditemukan" });
//     if (existingPost.userId !== authenticatedUserId) {
//       return res.status(403).json({ success: false, message: "Forbidden: bukan pemilik artikel." });
//     }

//     const newPhotos = (req.files as Express.Multer.File[] | undefined)?.map((f) => ({ url: `${f.filename}`, postId })) || [];

//     const updatedPost = await prisma.post.update({
//       where: { id: postId },
//       data: {
//         title,
//         content,
//         Location: { connect: { id: parseInt(locationId) } },
//         Photos: newPhotos.length > 0 ? { createMany: { data: newPhotos } } : undefined,
//       },
//       include: { User: true, Location: true, Photos: true },
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
//     return res.status(500).json({ success: false, message: "編輯文章失敗" });
//   }
// });

// /* ==========================================================
//    POST /article - Buat artikel baru
//    ========================================================== */
// router.post("/", jwtParseMiddleware, requireAuth, upload.array("photo"), async (req: Request, res: Response) => {
//   try {
//     const { title, content, locationId } = req.body;
//     const userId = req.user?.user_id;

//     if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
//     if (!title || !locationId) return res.status(400).json({ success: false, message: "title dan locationId wajib diisi" });

//     const photos = (req.files as Express.Multer.File[] | undefined)?.map((f) => ({ url: `${f.filename}` })) || [];

//     const newPost = await prisma.post.create({
//       data: {
//         title,
//         content,
//         User: { connect: { id: userId } },
//         Location: { connect: { id: parseInt(locationId) } },
//         Photos: { createMany: { data: photos } },
//       },
//       include: { Location: true, Photos: true },
//     });

//     res.status(201).json({
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
//     res.status(500).json({ success: false, message: "Failed to save post" });
//   }
// });

// /* ==========================================================
//    GET /article - Ambil semua artikel
//    ========================================================== */
// router.get("/", async (_req: Request, res: Response) => {
//   try {
//     const posts = await prisma.post.findMany({
//       include: { User: true, Location: true, Photos: true, Likes: true },
//       orderBy: { id: "desc" },
//     });
//     const cards = posts.map((p) => ({
//       id: p.id,
//       title: p.title,
//       location: p.Location?.city || "未知地點",
//       imgUrl: p.Photos?.[0]?.url || "",
//     }));
//     res.json(cards);
//   } catch (error) {
//     console.error("❌ Error fetching posts:", error);
//     res.status(500).json({ success: false, message: "Failed to retrieve posts" });
//   }
// });

// /* ==========================================================
//    GET /article/:id - Ambil satu artikel
//    ========================================================== */
// router.get("/:id", async (req: Request, res: Response) => {
//   const { id } = req.params;
//   if (!id || isNaN(parseInt(id))) return res.status(400).json({ message: "Invalid post ID" });

//   try {
//     const post = await prisma.post.findUnique({
//       where: { id: parseInt(id) },
//       include: { User: true, Location: true, Photos: true, Likes: true },
//     });
//     if (!post) return res.status(404).json({ message: "Post not found" });

//     const formatted = {
//       id: post.id,
//       title: post.title,
//       content: post.content,
//       author: post.User?.id || "未知作者",
//       location: post.Location?.city || "未知地點",
//       photos: post.Photos?.map((p) => p.url) || [],
//       likesCount: post.Likes?.length || 0,
//     };

//     res.json(formatted);
//   } catch (error) {
//     console.error("❌ Error retrieving post:", error);
//     res.status(500).json({ message: "Error retrieving post" });
//   }
// });

// /* ==========================================================
//    GET /post/:id/likes - Hitung jumlah like
//    ========================================================== */
// router.get("/post/:id/likes", async (req: Request, res: Response) => {
//   try {
//     const postId = Number(req.params.id);
//     if (!postId) return res.status(400).json({ message: "Invalid post ID" });

//     const count = await prisma.like.count({ where: { postId } });
//     res.json({ postId, likeCount: count });
//   } catch (error) {
//     console.error("❌ Error in /post/:id/likes:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });



// // //  * ============================
// // //  * POST /article/:id/like
// // //  * Toggle Like / Unlike
// // //  * ============================
// // //  */




// // router.post('/article/:id/like', async (req: Request, res: Response) => {
// //   const { id } = req.params;
// //   const userId = req.body.userId; // atau ambil dari JWT

// //   try {
// //     const like = await prisma.like.create({
// //       data: {
// //         postId: Number(id),
// //         userId: Number(userId),
// //       },
// //     });

// //     res.json({ success: true, like });
// //   } catch (error) {
// //     console.error(error);
// //     res.status(500).json({ success: false, error: 'Failed to like article' });
// //   }
// // });
// /* ==========================================================
//   GET /:id - Ambil detail artikel berdasarkan ID
//   ========================================================== */
// router.get('/:id', async (req: Request, res: Response) => {
//     const { id } = req.params;

//     try {
//         const postId = Number(id);

//         if (isNaN(postId)) {
//             return res.status(400).json({ success: false, message: 'Invalid article ID format' });
//         }

//         const article = await prisma.article.findUnique({
//             where: { id: postId },
//             select: {
//                 id: true,
//                 title: true,
//                 content: true,
//                 // Tambahkan field lain yang dibutuhkan frontend (misalnya user, images)
//                 // Hitung total likes secara terpisah untuk meminimalkan beban jika tidak ada relasi
//                 _count: {
//                     select: {
//                         likes: true, // Menghitung jumlah likes
//                     },
//                 },
//             },
//         });

//         if (!article) {
//             // Mengembalikan 404 jika artikel tidak ditemukan
//             return res.status(404).json({ success: false, message: 'Article not found' });
//         }
        
//         // Format ulang data agar lebih mudah dikonsumsi frontend
//         const formattedArticle = {
//             id: article.id,
//             title: article.title,
//             content: article.content,
//             likes: article._count.likes, // Menggunakan hitungan likes
//             // ... masukkan field lain di sini
//         };


//         res.json(formattedArticle); // Mengirim data artikel
//     } catch (error) {
//         console.error('❌ Error fetching article:', error);
//         // Mengembalikan 500 jika ada error database atau server
//         res.status(500).json({ success: false, message: 'Failed to fetch article details' });
//     }
// });

// export default router;

// src/routes/article.route.ts
// import type { Request, Response } from "express";
// import { Router } from "express";
// import express from 'express';
// import type { Request, Response } from "express";
// import { Router } from "express";
// import upload from "../utils/upload-images-post.js";
// // Asumsi path ini mengarah ke instance Prisma Client
// import { prisma } from "../utils/prisma-pagination.js"; 
// import { jwtParseMiddleware, requireAuth } from "../middleware/jwt.js";

// import postRoutes from '../routes/postRoutes.js';

//  const app = express();
// app.use(express.json());

// app.use('/posts', postRoutes);

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });


// const router = Router();

// // Middleware untuk upload file
// const photoUpload = upload.array("photo");

// // Helper untuk Parsing ID (memastikan ID dari JWT/Request menjadi Int)
// const safeParseInt = (value: string | number | undefined | null): number | undefined => {
//     if (typeof value === 'string') {
//         const parsed = parseInt(value, 10);
//         return isNaN(parsed) ? undefined : parsed;
//     }
//     if (typeof value === 'number' && !isNaN(value)) {
//         return value;
//     }
//     return undefined;
// };

import express from "express"
import type { Request, Response,NextFunction } from "express";
import { jwtParseMiddleware, requireAuth } from "../middleware";
import upload from '../utils/upload-images-post'
import { prisma } from "../utils/prisma-pagination.js";

const router = express.Router();

const photoUpload = upload.array("photo");

// Helper untuk Parsing ID (memastikan ID dari JWT/Request menjadi Int)
const safeParseInt = (value: string | number | undefined | null): number | undefined => {
    if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? undefined : parsed;
    }
    if (typeof value === 'number' && !isNaN(value)) {
        return value;
    }
    return undefined;
};

/* ==========================================================
 * POST / - Buat artikel baru
 * ========================================================== */
router.post("/", jwtParseMiddleware, requireAuth,photoUpload, async (req: Request, res: Response) => {
    try {
        const { title, content, locationId } = req.body;
        // ⭐ PERBAIKAN: Pastikan userId dari JWT di-parse ke Int
        const userId = safeParseInt(req.user?.user_id); 

        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
        if (!title || !content || !locationId) return res.status(400).json({ success: false, message: "title, content, dan locationId wajib diisi" });

        const photos = (req.files as Express.Multer.File[] | undefined)?.map((f) => ({ url: `${f.filename}` })) || [];
        const locationIntId = safeParseInt(locationId);

        if (!locationIntId) return res.status(400).json({ success: false, message: "Invalid location ID format" });

        const newPost = await prisma.post.create({
            data: {
                title,
                content,
                // Menggunakan ID yang sudah di-parse
                User: { connect: { id: userId } }, 
                Location: { connect: { id: locationIntId } },
                Photos: { createMany: { data: photos } },
            },
            include: { Location: true, Photos: true },
        });

        res.status(201).json({
            success: true,
            message: "文章創建成功",
            post: {
                id: newPost.id.toString(),
                title: newPost.title,
                content: newPost.content,
                location: newPost.Location?.city || "未知地點",
                imgUrl: newPost.Photos?.[0]?.url || "",
            },
        });
    } catch (error) {
        console.error("❌ Error creating post:", error);
        res.status(500).json({ success: false, message: "Failed to save post" });
    }
});

/* ==========================================================
 * PUT /:id - Update artikel
 * ========================================================== */
router.put("/:id", jwtParseMiddleware, requireAuth, photoUpload, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, content, locationId } = req.body;
    // ⭐ PERBAIKAN: Pastikan userId dari JWT di-parse ke Int
    const authenticatedUserId = safeParseInt(req.user?.user_id);

    const postId = safeParseInt(id);
    const locationIntId = safeParseInt(locationId);

    if (!postId) return res.status(400).json({ success: false, message: "Invalid article ID" });
    if (!title || !content || !locationId) return res.status(400).json({ success: false, message: "title, content, dan locationId wajib diisi" });
    if (!authenticatedUserId) return res.status(401).json({ success: false, message: "Unauthorized" });

    try {
        const existingPost = await prisma.post.findUnique({ where: { id: postId }, select: { userId: true } });
        if (!existingPost) return res.status(404).json({ success: false, message: "Artikel tidak ditemukan" });
        
        // ⭐ PERBAIKAN: Bandingkan ID yang sudah di-parse
        if (existingPost.userId !== authenticatedUserId) {
            return res.status(403).json({ success: false, message: "Forbidden: bukan pemilik artikel." });
        }

        const newPhotos = (req.files as Express.Multer.File[] | undefined)?.map((f) => ({ url: `${f.filename}`, postId })) || [];

        const updatedPost = await prisma.post.update({
            where: { id: postId },
            data: {
                title,
                content,
                Location: locationIntId ? { connect: { id: locationIntId } } : undefined,
                Photos: newPhotos.length > 0 ? { createMany: { data: newPhotos } } : undefined,
            },
            include: { User: true, Location: true, Photos: true },
        });

        return res.status(200).json({
            success: true,
            message: "文章編輯完成",
            post: {
                id: updatedPost.id.toString(),
                title: updatedPost.title,
                content: updatedPost.content,
                location: updatedPost.Location?.city || "未知地點",
                photos: updatedPost.Photos.map((p) => p.url),
            },
        });
    } catch (error) {
        console.error("❌ Error updating article:", error);
        return res.status(500).json({ success: false, message: "編輯文章失敗" });
    }
});

/* ==========================================================
 * DELETE /:id - Hapus artikel
 * ========================================================== */
router.delete("/:id", jwtParseMiddleware, requireAuth, async (req: Request, res: Response) => {
    const { id } = req.params;
    // ⭐ PERBAIKAN: Pastikan userId dari JWT di-parse ke Int
    const authenticatedUserId = safeParseInt(req.user?.user_id);

    const postId = safeParseInt(id);
    if (!postId) return res.status(400).json({ success: false, message: "Invalid article ID" });
    if (!authenticatedUserId) return res.status(401).json({ success: false, message: "Unauthorized" });

    try {
        const existingPost = await prisma.post.findUnique({ where: { id: postId }, select: { userId: true } });
        if (!existingPost) return res.status(404).json({ success: false, message: "Artikel tidak ditemukan" });
        
        // ⭐ PERBAIKAN: Bandingkan ID yang sudah di-parse
        if (existingPost.userId !== authenticatedUserId) {
            return res.status(403).json({ success: false, message: "Forbidden: bukan pemilik artikel." });
        }

        // Asumsi relasi Photos dan Likes di set CASCADE DELETE di schema Prisma
        await prisma.post.delete({ where: { id: postId } });

        return res.status(200).json({ success: true, message: "文章刪除完成" });
    } catch (error) {
        console.error("❌ Error deleting article:", error);
        return res.status(500).json({ success: false, message: "刪除文章失敗" });
    }
});

/* ==========================================================
 * GET /:id - Ambil satu artikel (Detail Page)
 * ========================================================== */
// Catatan: Middleware jwtParseMiddleware TIDAK diperlukan di sini, tetapi bisa ditambahkan jika Anda ingin
// mendapatkan data user saat melihat detail (untuk cek isLikedByMe).
router.get("/:id", jwtParseMiddleware, async (req: Request, res: Response) => {
    const { id } = req.params;
    // ⭐ PERBAIKAN: Pastikan userId dari JWT di-parse ke Int
    const authenticatedUserId = safeParseInt(req.user?.user_id); 

    const postId = safeParseInt(id);
    if (!postId) return res.status(400).json({ message: "Invalid post ID" });

    try {
        const post = await prisma.post.findUnique({
            where: { id: postId },
            include: { 
                User: true, 
                Location: true, 
                Photos: true, 
                // Seleksi hanya userId dari Likes untuk cek isLikedByMe
                Likes: { select: { userId: true } } 
            },
        });
        
        if (!post) return res.status(404).json({ message: "Post not found" });

        const isLikedByMe = authenticatedUserId ? post.Likes.some(like => like.userId === authenticatedUserId) : false;

        const formatted = {
            id: post.id.toString(), 
            userId: post.userId.toString(), // Kirim sebagai string agar konsisten
            title: post.title,
            content: post.content,
            location: post.Location?.city || "未知地點",
            photos: post.Photos?.map((p) => p.url) || [],
            likes: post.Likes?.length || 0, 
            isLikedByMe: isLikedByMe, 
        };

        res.json(formatted);
    } catch (error) {
        console.error("❌ Error retrieving post:", error);
        res.status(500).json({ message: "Error retrieving post" });
    }
});


/* ==========================================================
 * POST /:id/like - Tambah atau toggle like artikel
 * ========================================================== */
router.post('/:id/like', jwtParseMiddleware, requireAuth, async (req: Request, res: Response) => {
    const { id } = req.params;
    // ⭐ PERBAIKAN: Pastikan userId dari JWT di-parse ke Int
    const userId = safeParseInt(req.user?.user_id); 

    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    try {
        const postId = safeParseInt(id);
        if (!postId) return res.status(400).json({ success: false, message: 'Invalid article ID' });

        // 1. Cek apakah pengguna sudah like (gunakan ID yang sudah di-parse)
        const existingLike = await prisma.like.findFirst({
            where: { postId, userId },
        });

        let likedStatus;

        if (existingLike) {
            // 2. Unlike (Gunakan ID Like)
            await prisma.like.delete({ where: { id: existingLike.id } });
            likedStatus = false;
        } else {
            // 3. Like (Pastikan Post ada sebelum mencoba membuat Like)
            const postExists = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
            if (!postExists) return res.status(404).json({ success: false, message: 'Post not found' });
            
            await prisma.like.create({
                data: { postId, userId },
            });
            likedStatus = true;
        }

        // 4. Hitung jumlah like terbaru
        const newLikesCount = await prisma.like.count({ where: { postId } });
            
        return res.json({ 
            success: true, 
            liked: likedStatus, 
            newLikesCount,
            isLikedByMe: likedStatus
        });

    } catch (error) {
        console.error('❌ Error liking article:', error);
        res.status(500).json({ success: false, message: 'Failed to like article' });
    }
});

/* ==========================================================
 * GET / - Ambil semua artikel (List Page)
 * ========================================================== */
router.get("/", async (_req: Request, res: Response) => {
    try {
        const posts = await prisma.post.findMany({
            include: { Location: true, Photos: true, Likes: true },
            orderBy: { id: "desc" },
        });
        const cards = posts.map((p) => ({
            id: p.id.toString(),
            title: p.title,
            location: p.Location?.city || "未知地點",
            imgUrl: p.Photos?.[0]?.url || "",
            likesCount: p.Likes.length || 0,
        }));
        res.json(cards);
    } catch (error) {
        console.error("❌ Error fetching posts:", error);
        res.status(500).json({ success: false, message: "Failed to retrieve posts" });
    }
});


export default router;















//     app.post('/api/article/:id/like', async (req, res) => {
//   const { id } = req.params;

//   try {
//     const updated = await prisma.post.update({
//       where: { id },
//       data: { likes: { increment: 1 } },
//     });

//     res.json({ totalLikes: updated.likes });
//   } catch (error) {
//     console.error('Like Error:', error);
//     res.status(500).json({ error: 'Failed to update likes' });
//   }
// });
  ///   const updatedArticle = await prisma.post.update({
  //     where: { Postid },
  //     data: { like: { increment: 1 } },
  //   });

  //   return res.status(200).json({
  //     message: "Article liked successfully",
  //     likes: updatedArticle.likes,
  //   });
  //  catch (error) {
  //   console.error("Like Error:", error);
  //   return res.status(500).json({ error: "Failed to like article" });
  // };



// import type { Request, Response } from "express";
// import express from "express";
// import upload from "../utils/upload-images.js";
// import { prisma } from "../utils/prisma-pagination.js";
// import { jwtParseMiddleware, requireAuth } from "../middleware/jwt.js";

// const router = express.Router();

// /**
//  * ============================
//  * PUT /article/:id
//  * Update artikel (harus login)
//  * ============================
//  */
// router.put(
//   "/:id",
//   jwtParseMiddleware,
//   requireAuth,
//   upload.array("photo"),
//   async (req: Request, res: Response) => {
//     const { id } = req.params;
//     const { title, content, locationId } = req.body;
//     const authenticatedUserId = req.user?.user_id;

//     if (!id || isNaN(parseInt(id))) {
//       return res.status(400).json({ success: false, message: "Invalid article ID" });
//     }
//     if (!title || !locationId) {
//       return res.status(400).json({ success: false, message: "title dan locationId wajib diisi" });
//     }
//     if (!authenticatedUserId) {
//       return res.status(401).json({ success: false, message: "Unauthorized" });
//     }

//     try {
//       const postId = parseInt(id);
//       const existingPost = await prisma.post.findUnique({
//         where: { id: postId },
//         select: { userId: true },
//       });
//       if (!existingPost) {
//         return res.status(404).json({ success: false, message: "Artikel tidak ditemukan" });
//       }
//       if (existingPost.userId !== authenticatedUserId) {
//         return res.status(403).json({ success: false, message: "Tidak boleh edit artikel orang lain" });
//       }

//       const newPhotos =
//         (req.files as Express.Multer.File[] | undefined)?.map((f) => ({
//           url: `/images/${f.filename}`,
//           postId,
//         })) || [];

//       const updatedPost = await prisma.post.update({
//         where: { id: postId },
//         data: {
//           title,
//           content,
//           Location: { connect: { id: parseInt(locationId) } },
//           Photos:
//             newPhotos.length > 0 ? { createMany: { data: newPhotos } } : undefined,
//         },
//         include: { Location: true, Photos: true },
//       });

//       return res.status(200).json({
//         success: true,
//         message: "文章編輯完成",
//         post: {
//           id: updatedPost.id,
//           title: updatedPost.title,
//           content: updatedPost.content,
//           location: updatedPost.Location?.city || "未知地點",
//           photos: updatedPost.Photos.map((p) => p.url),
//         },
//       });
//     } catch (error) {
//       console.error("❌ Error updating article:", error);
//       return res.status(500).json({ success: false, message: "編輯文章失敗" });
//     }
//   }
// );

// /**
//  * ============================
//  * POST /article
//  * Buat artikel baru
//  * ============================
//  */
// router.post(
//   "/",
//   jwtParseMiddleware,
//   requireAuth,
//   upload.array("photo"),
//   async (req: Request, res: Response) => {
//     try {
//       const { title, content, locationId } = req.body;
//       const userId = req.user?.user_id;

//       if (!userId) {
//         return res.status(401).json({ success: false, message: "Unauthorized" });
//       }
//       if (!title || !locationId) {
//         return res.status(400).json({ success: false, message: "title dan locationId 必填寫" });
//       }

//       const photos =
//         (req.files as Express.Multer.File[] | undefined)?.map((f) => ({
//           url: `/images/${f.filename}`,
//         })) || [];

//       const newPost = await prisma.post.create({
//         data: {
//           title,
//           content,
//           userId,
//           Location: { connect: { id: parseInt(locationId) } },
//           Photos: { createMany: { data: photos } },
//         },
//         include: { Location: true, Photos: true },
//       });

//       return res.status(201).json({
//         success: true,
//         message: "Post created successfully",
//         post: {
//           id: newPost.id,
//           title: newPost.title,
//           location: newPost.Location?.city || "未知地點",
//           imgUrl: newPost.Photos?.[0]?.url || "",
//         },
//       });
//     } catch (error) {
//       console.error("❌ Error creating post:", error);
//       return res.status(500).json({ success: false, message: "Failed to save post" });
//     }
//   }
// );

// /**
//  * ============================
//  * GET /article
//  * Ambil semua artikel
//  * ============================
//  */
// router.get("/", async (_req: Request, res: Response) => {
//   try {
//     const posts = await prisma.post.findMany({
//       include: { Location: true, Photos: true, Likes: true },
//       orderBy: { id: "desc" },
//     });

//     const cards = posts.map((post) => ({
//       id: post.id,
//       title: post.title,
//       location: post.Location?.city || "未知地點",
//       imgUrl: post.Photos?.[0]?.url || "",
//       likesCount: post.Likes.length,
//     }));

//     return res.json(cards);
//   } catch (error) {
//     console.error("❌ Error fetching posts:", error);
//     return res.status(500).json({ success: false, message: "Failed to retrieve posts" });
//   }
// });

// /**
//  * ============================
//  * GET /article/:id
//  * Ambil detail artikel
//  * ============================
//  */
// router.get("/:id", async (req: Request, res: Response) => {
//   const { id } = req.params;
//   if (!id || isNaN(parseInt(id))) return res.status(400).json({ message: "Invalid post ID" });

//   try {
//     const post = await prisma.post.findUnique({
//       where: { id: parseInt(id) },
//       include: { User: true, Location: true, Photos: true, Likes: true },
//     });
//     if (!post) return res.status(404).json({ message: "Post not found" });

//     const formattedPost = {
//       id: post.id,
//       title: post.title,
//       content: post.content,
//       author: post.User?.id || "未知作者",
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

// /**
//  * ============================
//  * POST /article/:id/like
//  * Toggle Like / Unlike
//  * ============================
//  */
// router.post("/:id/like", jwtParseMiddleware, requireAuth, async (req: Request, res: Response) => {
//   const { id } = req.params;
//   const userId = req.user?.user_id;

//   try {
//     const postId = parseInt(id);
//     if (isNaN(postId)) return res.status(400).json({ error: "Invalid ID" });

//     const post = await prisma.post.findUnique({ where: { id: postId } });
//     if (!post) return res.status(404).json({ error: "Article not found" });

//     // 🔎 Cek apakah user sudah like
//     const existingLike = await prisma.like.findFirst({
//       where: { postId, userId },
//     });

//     if (existingLike) {
//       // 💔 Unlike
//       await prisma.like.delete({ where: { id: existingLike.id } });
//     } else {
//       // ❤️ Like
//       await prisma.like.create({ data: { postId, userId } });
//     }

//     // 🔢 Hitung ulang total likes
//     const totalLikes = await prisma.like.count({ where: { postId } });

//     // 🔄 Simpan jumlah ke kolom likesCount
//     await prisma.post.update({
//       where: { id: postId },
//       data: { likesCount: totalLikes },
//     });

//     return res.status(200).json({
//       message: existingLike ? "Unliked" : "Liked",
//       likes: totalLikes,
//     });
//   } catch (error) {
//     console.error("Like Toggle Error:", error);
//     return res.status(500).json({ error: "Failed to toggle like" });
//   }
// });

// export default router;




















































// // File: routes/article.route.ts

// import type { Request, Response } from "express";
//  import express from "express";
// import upload from "../utils/upload-images.js";
// import { prisma } from "../utils/prisma-pagination.js";
// import { jwtParseMiddleware } from "../middleware/jwt.js";

// const router = express.Router();

// /**
//  * ============================
//  * PUT /article/:id
//  * Update artikel berdasarkan ID. Membutuhkan otentikasi.
//  * ============================
//  */
// router.put(
//   "/:id",
//   jwtParseMiddleware, // ✅ Tambahkan middleware otentikasi
//   upload.array("photo"), // ✅ Middleware untuk parsing file
//   async (req: AuthenticatedRequest, res: Response) => {
//     const { id } = req.params;
//     const { title, content, locationId } = req.body;

//     // Gunakan ID dari token, bukan dari body, untuk keamanan
//     const authenticatedUserId = req.user?.id;
//     const postOwnerIdFromRequest = parseInt(req.body.userId); // userId yang dikirim dari frontend

//     // 🔍 Validasi ID numerik
//     if (!id || isNaN(parseInt(id))) {
//       return res.status(400).json({ success: false, message: "Invalid article ID" });
//     }

//     // 🔍 Validasi field wajib
//     if (!title || !postOwnerIdFromRequest || !locationId) {
//       return res.status(400).json({
//         success: false,
//         message: "title, userId, dan locationId wajib diisi",
//       });
//     }

//     if (!authenticatedUserId) {
//         return res.status(401).json({ success: false, message: "Unauthorized: Missing authentication token." });
//     }

//     try {
//       const postId = parseInt(id);

//       // 🔎 Periksa apakah artikel ada
//       const existingPost = await prisma.post.findUnique({
//         where: { id: postId },
//         select: { userId: true, Photos: true }, // Hanya ambil userId untuk verifikasi
//       });

//       if (!existingPost) {
//         return res.status(404).json({ success: false, message: "Artikel tidak ditemukan" });
//       }

//       // 🚨 Verifikasi bahwa pengguna yang login adalah pemilik artikel
//       if (existingPost.userId !== authenticatedUserId) {
//          return res.status(403).json({ success: false, message: "Forbidden: Anda tidak memiliki izin untuk mengedit artikel ini." });
//       }

//       // 📸 Upload new photos (jika ada)
//       const newPhotos =
//         (req.files as Express.Multer.File[] | undefined)?.map((f) => ({
//           url: `/images/${f.filename}`,
//           postId: postId,
//         })) || [];

//       // 🧩 Update article
//       const updatedPost = await prisma.post.update({
//         where: { id: postId },
//         data: {
//           title,
//           content,
//           // user ID tidak diupdate di sini, karena sudah diverifikasi
//           Location: { connect: { id: parseInt(locationId) } },
//           // Tambah foto baru (jika ada)
//           Photos: newPhotos.length > 0 ? { createMany: { data: newPhotos } } : undefined,
//         },
//         include: {
//           User: true,
//           Location: true,
//           Photos: true,
//         },
//       });

//       return res.status(200).json({
//         success: true,
//         message: "文章編輯完成",
//         post: {
//           id: updatedPost.id,
//           title: updatedPost.title,
//           content: updatedPost.content,
//           location: updatedPost.Location?.city || "未知地點",
//           photos: updatedPost.Photos.map((p) => p.url),
//         },
//       });
//     } catch (error) {
//       console.error("❌ Error updating article:", error);
//       return res.status(500).json({
//         success: false,
//         message: "編輯文章失敗",
//       });
//     }
//   }
// );

// /**
//  * ============================
//  * POST /article
//  * make new article + upload foto
//  * ============================
//  */
// /**
//  * ============================
//  * POST /article
//  * make new article + upload foto. Membutuhkan otentikasi.
//  * ============================
//  */
// router.post(
//   "/",
//   jwtParseMiddleware, // ✅ proteksi JWT
//   upload.array("photo"),
//   async (req: AuthenticatedRequest, res: Response) => {
//     try {
//       const { title, content, locationId } = req.body;

//       // 💡 Ambil userId dari token JWT, ini adalah praktik terbaik dan aman
//       const userId = req.user?.id;

//       if (!userId) {
//         return res.status(401).json({ success: false, message: "Unauthorized: User ID not found in token." });
//       }

//       // 🔍 Validasi minimal
//       if (!title || !locationId) {
//         return res.status(400).json({
//           success: false,
//           message: "title dan locationId 必填寫",
//         });
//       }

//       // 🔗 prepare data photo jika ada
//       const photos =
//         (req.files as Express.Multer.File[] | undefined)?.map((f) => ({
//           url: `/images/${f.filename}`,
//         })) || [];

//       // 🧩 save to database
//       const newPost = await prisma.post.create({
//         data: {
//           title,
//           content,
//           User: { connect: { id: userId } }, // Menggunakan userId dari token
//           Location: { connect: { id: parseInt(locationId) } },
//           Photos: { createMany: { data: photos } },
//         },
//         include: {
//           Location: true,
//           Photos: true,
//         },
//       });

//       // ✅ Kunci perbaikan: Mengembalikan struktur JSON yang benar (post.id)
//       return res.status(201).json({
//         success: true,
//         message: "Post created successfully",
//         post: {
//           id: newPost.id, // <-- Ini memastikan frontend Anda bisa membaca data.post.id
//           title: newPost.title,
//           location: newPost.Location?.city || "未知地點",
//           imgUrl: newPost.Photos?.[0]?.url || "",
//         },
//       });
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
//       location: post.Location?.city || "未知地點", // Ganti dari id ke city untuk tampilan yang lebih baik
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

// //**
// // router.post("/", upload.array("photo"), async (req: Request, res: Response) => {
// //   try {
// //     const { title, content, userId, locationId } = req.body;

// //     // 🔍 Validasi minimal
// //     if (!title || !userId || !locationId) {
// //       return res.status(400).json({
// //         success: false,
// //         message: "title, userId, dan locationId wajib diisi",
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

// //**
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
