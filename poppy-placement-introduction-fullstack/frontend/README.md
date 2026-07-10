# Frontend màn chuẩn bị Placement Test

## Cài package

```bash
npm i lucide-react
```

## Ảnh mascot

Đặt ảnh mascot của bạn tại:

```text
public/images/placement/poppy-test.png
```

Component đã dùng đúng đường dẫn này:

```tsx
<Image
  src="/images/placement/poppy-test.png"
  ...
/>
```

## Axios instance

Code đang import:

```ts
import api from '@/src/lib/api';
```

Axios cần gửi cookie/token:

```ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

export default api;
```

## Route

Màn chuẩn bị:

```text
/placement/introduction
```

Sau khi bấm bắt đầu, backend trả:

```text
/placement/test/:sessionId
```

Trang này không chứa Header hoặc Sidebar chính của website.
Sidebar trong component chỉ là tiến trình bài Placement Test.
