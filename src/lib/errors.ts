export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    // 捕獲堆棧追蹤，排除構造函數本身
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string = "無效的請求參數") {
    super(message, 400);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = "資源不存在") {
    super(message, 404);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = "您沒有權限訪問或修改此資源") {
    super(message, 403);
  }
}
