import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Email không hợp lệ.'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.'),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên.'),
  email: z.string().trim().email('Email không hợp lệ.'),
  password: z
    .string()
    .min(6, 'Mật khẩu cần ít nhất 6 ký tự.')
    .max(128, 'Mật khẩu không được quá 128 ký tự.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
