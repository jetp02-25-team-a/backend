import type { globalErrorHandler } from "./globalErrorHandler";

// 統一匯出所有 middleware
export * from "./jwt";

// m3 用
export {
  jwtParseMiddleware as m3JwtParseMiddleware,
  requireAuth as m3RequireAuth,
  requireSelfOrAdmin as m3RequireSelfOrAdmin,

  // 專屬名稱可以直接匯出 (如果確認不與 legacyAuth 衝突)
  requireEditorOrSelf as m3RequireEditorOrSelf,
} from "./security.middleware";

export * from "./globalErrorHandler";
