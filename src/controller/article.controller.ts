import type { Request, Response } from "express";
import { prisma } from "../utils/prisma-pagination";

export const updateArticle = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, content, location } = req.body;

  if (!id || isNaN(+id)) {
    return res.status(400).json({ success: false, message: "Invalid article ID" });
  }

  try {
    const existing = await prisma.post.findUnique({
      where: { id: +id },
      include: { Location: true, Photos: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Article not found" });
    }

    // 🔍 Cari ID lokasi berdasarkan nama lokasi
    const locationRecord = await prisma.location.findFirst({
      where: { city: location },
    });

    // 📷 Handle foto baru jika ada
    const photoFile = (req.file || (req.files as Express.Multer.File[] | undefined)?.[0]) || null;
    let newPhotoUrl: string | null = null;

    if (photoFile) {
      newPhotoUrl = `/images/${photoFile.filename}`;
      await prisma.photo.create({
        data: {
          url: newPhotoUrl,
          postId: +id,
        },
      });
    }

    // 🧩 Update artikel
    const updated = await prisma.post.update({
      where: { id: +id },
      data: {
        title: title || existing.title,
        content: content || existing.content,
        Location: locationRecord ? { connect: { id: locationRecord.id } } : undefined,
      },
      include: { Location: true, Photos: true },
    });

    return res.json({
      success: true,
      message: "✅ Article updated successfully",
      article: {
        id: updated.id,
        title: updated.title,
        location: updated.Location?.city || "未知地點",
        content: updated.content,
        photos: updated.Photos.map((p) => p.url),
      },
    });
  } catch (error) {
    console.error("❌ Error updating article:", error);
    return res.status(500).json({ success: false, message: "Failed to update article" });
  }
};












































// import type { Request, Response } from "express";
// import { prisma } from "../utils/prisma-pagination";

// // ✅ CREATE ARTICLE
// export const createArticle = async (req: Request, res: Response) => {
//   const { title, content, userId, locationId } = req.body;

//   if (!title || !userId || !locationId) {
//     return res.status(400).json({
//       success: false,
//       message: "title, userId, dan locationId wajib diisi",
//     });
//   }

//   if (isNaN(+userId) || isNaN(+locationId)) {
//     return res.status(400).json({
//       success: false,
//       message: "userId dan locationId harus berupa angka",
//     });
//   }

//   try {
//     const photos =
//       (req.files as Express.Multer.File[] | undefined)?.map((f) => ({
//         url: `/images/${f.filename}`,
//       })) || [];

//     const newPost = await prisma.post.create({
//       data: {
//         title,
//         content,
//         User: { connect: { id: +userId } },
//         Location: { connect: { id: +locationId } },
//         Photos: { createMany: { data: photos } },
//       },
//       include: { Location: true, Photos: true },
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
//     return res.status(500).json({ success: false, message: "Failed to save post" });
//   }
// };

// // ✅ UPDATE ARTICLE
// export const updateArticle = async (req: Request, res: Response) => {
//   const { id } = req.params;
//   const { title, content, locationId } = req.body;

//   if (!id || isNaN(+id)) {
//     return res.status(400).json({ message: "Invalid article ID" });
//   }

//   try {
//     const existing = await prisma.post.findUnique({ where: { id: +id } });
//     if (!existing) {
//       return res.status(404).json({ message: "Article not found" });
//     }

//     const photos =
//       (req.files as Express.Multer.File[] | undefined)?.map((f) => ({
//         url: `/images/${f.filename}`,
//         postId: +id,
//       })) || [];

//     if (photos.length > 0) {
//       await prisma.photo.createMany({ data: photos });
//     }

//     const updated = await prisma.post.update({
//       where: { id: +id },
//       data: {
//         title: title || existing.title,
//         content: content || existing.content,
//         Location: locationId ? { connect: { id: +locationId } } : undefined,
//       },
//       include: { Location: true, Photos: true },
//     });

//     return res.json({
//       success: true,
//       message: "Article updated successfully",
//       article: {
//         id: updated.id,
//         title: updated.title,
//         location: updated.Location?.city || "未知地點",
//         photos: updated.Photos.map((p) => p.url),
//       },
//     });
//   } catch (error) {
//     console.error("❌ Error updating article:", error);
//     return res.status(500).json({ message: "Failed to update article" });
//   }
// };

// // ✅ GET ALL ARTICLES
// export const getAllArticles = async (_req: Request, res: Response) => {
//   try {
//     const posts = await prisma.post.findMany({
//       include: { User: true, Location: true, Photos: true, Likes: true },
//       orderBy: { id: "desc" },
//     });

//     const cards = posts.map((post) => ({
//       id: post.id,
//       title: post.title,
//       location: post.Location?.id || "未知地點",
//       imgUrl: post.Photos?.[0]?.url || "",
//     }));

//     return res.json(cards);
//   } catch (error) {
//     console.error("❌ Error fetching posts:", error);
//     return res.status(500).json({ success: false, message: "Failed to retrieve posts" });
//   }
// };

// // ✅ GET ARTICLE BY ID
// export const getArticleById = async (req: Request, res: Response) => {
//   const { id } = req.params;

//   if (!id || isNaN(+id)) {
//     return res.status(400).json({ message: "Invalid post ID" });
//   }

//   try {
//     const post = await prisma.post.findUnique({
//       where: { id: +id },
//       include: { User: true, Location: true, Photos: true, Likes: true },
//     });

//     if (!post) {
//       return res.status(404).json({ message: "Post not found" });
//     }

//     const formattedPost = {
//       id: post.id,
//       title: post.title,
//       content: post.content,
//       author: post.User?.nickname || "未知作者",
//       location: post.Location?.city || "未知地點",
//       photos: post.Photos?.map((p) => p.url) || [],
//       likesCount: post.Likes?.length || 0,
//     };

//     return res.json(formattedPost);
//   } catch (error) {
//     console.error("❌ Error retrieving post:", error);
//     return res.status(500).json({ message: "Error retrieving post" });
//   }
// };