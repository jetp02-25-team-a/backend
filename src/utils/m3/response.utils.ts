export const successResponse = (data: any, message = "OK") => ({
  success: true,
  message,
  data,
});

export const errorResponse = (message: string, status = 400) => ({
  success: false,
  message,
  status,
});
