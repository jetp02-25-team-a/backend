import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email({ message: "請輸入有效的電子郵件格式" }),
  password: z.string().min(6, "密碼至少需要 6 個字元"),
});
