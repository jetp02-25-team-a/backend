import type { Request, Response } from "express";
import express from "express";
import upload from "../utils/upload-images.js";
import { prisma } from "../utils/prisma-pagination.js";
import { jwtParseMiddleware, requireAuth } from "../middleware/jwt.js";
import type { Post } from "../generated/prisma/index.js";


const router = express.Router();
/**
 * ============================
 * PUT /article/:id
 * Update artikel berdasarkan ID. Membutuhkan otentikasi.
 * ============================
 */
router.put(
  "/:id",
  jwtParseMiddleware, // ✅ Tambahkan middleware otentikasi
  requireAuth,
  upload.array("photo"), // ✅ Middleware untuk parsing file
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, content, locationId } = req.body;
    // Gunakan ID dari token, bukan dari body, untuk keamanan
    const authenticatedUserId = req.user?.user_id;
    // const postOwnerIdFromRequest = parseInt(req.body.userId); // userId yang dikirim dari frontend - tidak lagi digunakan dalam validasi wajib

    // 🔍 Validasi ID numerik
    if (!id || isNaN(parseInt(id))) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid article ID" });
    }

    // 🔍 Validasi field wajib. Mengganti postOwnerIdFromRequest dengan pemeriksaan langsung authenticatedUserId
    if (!title || !locationId) {
      return res.status(400).json({
        success: false,
        message: "title dan locationId should input",
      });
    }

    if (!authenticatedUserId) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Unauthorized: Missing authentication token.",
        });
    }

    try {
      const postId = parseInt(id);

      // 🔎 Periksa apakah artikel ada
      const existingPost = await prisma.post.findUnique({
        where: { id: postId },
        select: { userId: true }, // Hanya ambil userId untuk verifikasi
      });

      if (!existingPost) {
        return res
          .status(404)
          .json({ success: false, message: "Artikel tidak ditemukan" });
      }

      // 🚨 Verifikasi bahwa pengguna yang login adalah pemilik artikel
      if (existingPost.userId !== authenticatedUserId) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "Forbidden: Anda tidak memiliki izin untuk mengedit artikel ini.",
          });
      }

      // 📸 Upload new photos (jika ada)
      const newPhotos =
        (req.files as Express.Multer.File[] | undefined)?.map((f) => ({
          url: `/images/${f.filename}`,
          postId: postId,
        })) || [];

      // 🧩 Update article
      const updatedPost = await prisma.post.update({
        where: { id: postId },
        data: {
          title,
          content,
          // user ID tidak diupdate di sini, karena sudah diverifikasi
          Location: { connect: { id: parseInt(locationId) } },
          // Tambah foto baru (jika ada)
          Photos:
            newPhotos.length > 0
              ? { createMany: { data: newPhotos } }
              : undefined,
        },
        include: {
          User: true,
          Location: true,
          Photos: true,
        },
      });

      // 🧩 save to database
      // const newPost = await prisma.<Post>.update({
      // where: { <unique_field>: value },
      // data: { <field>: <new_value> },
      // });

      return res.status(200).json({
        success: true,
        message: "文章編輯完成",
        post: {
          id: updatedPost.id,
          title: updatedPost.title,
          content: updatedPost.content,
          location: updatedPost.Location?.city || "未知地點",
          photos: updatedPost.Photos.map((p) => p.url),
        },
      });
    } catch (error) {
      console.error("❌ Error updating article:", error);
      return res.status(500).json({
        success: false,
        message: "編輯文章失敗",
      });
    }
  }
);

/**
 * ============================
 * POST /article
 * make new article + upload foto. Membutuhkan otentikasi.
 * ============================
 */
router.post(
  "/",
  jwtParseMiddleware, // ✅ proteksi JWT
  requireAuth,
  upload.array("photo"),
  async (req: Request, res: Response) => {
    try {
      const { title, content, locationId } = req.body;

      // 💡 Ambil userId dari token JWT, ini adalah praktik terbaik dan aman
      const userId = req.user?.user_id;
      console.log("----------", req.user);

      if (!userId) {
        return res
          .status(401)
          .json({
            success: false,
            message: "Unauthorized: User ID not found in token.",
          });
      }

      // 🔍 Validasi minimal
      if (!title || !locationId) {
        return res.status(400).json({
          success: false,
          message: "title dan locationId 必填寫",
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
          User: { connect: { id: userId } }, // Menggunakan userId dari token
          Location: { connect: { id: parseInt(locationId) } },
          Photos: { createMany: { data: photos } },
        },
        include: {
          Location: true,
          Photos: true,
        },
      });

      // ✅ Mengembalikan struktur JSON yang benar (post.id)
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
  }
);

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
      location: post.Location?.city || "未知地點", // Menggunakan city untuk tampilan, bukan ID
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
 * Get article based on ID
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
      author: post.User?.id || "未知作者",
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


    // Tambahkan jumlah like
router.post("/:id/like", jwtParseMiddleware, requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ success: false, message: "Invalid article ID" });
  }

  const postId = parseInt(id);
  const userId = req.user?.user_id;

  try {
    // Cek apakah post ada
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    // Tambahkan like sebagai relasi (jika pakai model Likes)
    await prisma.like.create({
      data: {
        postId,
        userId,
      },
    });

    // Hitung total likes
    const totalLikes = await prisma.like.count({ where: { postId } });

    return res.status(200).json({ success: true, totalLikes });
  } catch (error) {
    console.error("❌ Like Error:", error);
    return res.status(500).json({ success: false, message: "Failed to like article" });
  }
});






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

export default router;

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
