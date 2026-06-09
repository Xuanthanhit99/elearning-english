export const successResponse = <T>(data: T, message = 'Thành công') => {
  return {
    success: true,
    message: message,
    data,
  };
};
