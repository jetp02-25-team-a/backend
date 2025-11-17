import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

router.get("/", (req, res) => {
  try {
    // ⭐ 改成 process.cwd() → 直接取專案根目錄
    const folderPath = path.join(process.cwd(), "public/images/places");

    const files = fs.readdirSync(folderPath);

    const images = files.filter((f) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));

    // ⭐ 洗牌隨機
    for (let i = images.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [images[i], images[j]] = [images[j], images[i]];
    }

    const selected = images.slice(0, 10);

    res.json({
      success: true,
      data: selected.map((file) => ({
        url: `/images/places/${file}`,
        caption: file,
      })),
    });
  } catch (err) {
    console.error("random-images error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
