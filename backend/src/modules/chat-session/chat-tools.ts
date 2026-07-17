// src/modules/chat-session/chat-tools.ts
import { SchemaType, Tool } from '@google/generative-ai';

export const CHAT_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'navigate_to_page',
        description:
          'Điều hướng người dùng tới một trang cụ thể trong app khi họ muốn thực hiện hành động như làm bài kiểm tra, xem khóa học, chăm sóc linh thú...',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            page: {
              type: SchemaType.STRING,
              format: 'enum', // ✅ bắt buộc khi có `enum`
              enum: [
                'placement',
                'course_list',
                'pet_care',
                'speaking_practice',
                'community_feed',
              ],
              description: 'Trang đích cần điều hướng tới',
            },
            reason: {
              type: SchemaType.STRING,
              description: 'Lý do ngắn gọn tại sao điều hướng tới trang này',
            },
          },
          required: ['page'],
        },
      },
    ],
  },
];

export const PAGE_ROUTES: Record<string, { path: string; label: string }> = {
  placement: { path: '/placement', label: 'Làm bài kiểm tra trình độ' },
  course_list: { path: '/courses', label: 'Xem danh sách khóa học' },
  pet_care: { path: '/pet', label: 'Chăm sóc linh thú' },
  speaking_practice: { path: '/speaking', label: 'Luyện hội thoại' },
  community_feed: { path: '/community', label: 'Xem bảng tin cộng đồng' },
};