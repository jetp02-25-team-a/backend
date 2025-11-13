import multer from "multer";
import type { FileFilterCallback } from "multer";
import { v4 } from "uuid";
import type { Request } from "express";

// 1.篩選檔案, 2.決定副檔名
const extMap: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
} as const;

function fileFilter(
  _req: Request, 
  file: Express.Multer.File, 
  callback: FileFilterCallback
) {
  callback(null, file.mimetype in extMap);
}

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, callback) => {
    callback(null, "public/images/posts"); // null 表示沒有錯誤
  },
  filename: (_req: Request, file: Express.Multer.File, callback) => {
    const extension = extMap[file.mimetype];
    const filename = v4() + extension;
    callback(null, filename);
  },
});

export default multer({ fileFilter, storage });