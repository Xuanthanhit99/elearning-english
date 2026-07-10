# Frontend placement

## Cài icon

```bash
npm i lucide-react
```

## API client

File `placement-api.ts` đang dùng:

```ts
import api from '@/src/lib/api';
```

Nếu project của bạn đặt axios instance ở đường dẫn khác, đổi import này.

Axios instance cần tự gửi access token/cookie, ví dụ:

```ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

export default api;
```

## Route cần có sau màn này

Hai nút đầu đang điều hướng tới:

```text
/placement/test
/placement/certificate
```

Bạn có thể thay đường dẫn trong `PlacementLanding.tsx` nếu project dùng route khác.

Trang này không chứa Header hoặc Sidebar.
