# Frontend màn làm Placement Test

## Cài package

```bash
npm i lucide-react
```

## Ảnh mascot

Đặt ảnh tại:

```text
public/images/placement/poppy-cheer.png
```

## API client

File sử dụng:

```ts
import api from '@/src/lib/api';
```

Axios instance cần gửi cookie:

```ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

export default api;
```

## Route

```text
/placement/test/:sessionId
```

## Chức năng đã có

- Tải session và câu hỏi hiện tại.
- Chọn đáp án.
- Lưu câu trả lời.
- Bỏ qua.
- Đánh dấu.
- Đồng hồ.
- Progress tổng.
- Progress theo kỹ năng.
- Danh sách câu hỏi.
- Phím A–D, F và mũi tên phải.
- Autosave timestamp.
