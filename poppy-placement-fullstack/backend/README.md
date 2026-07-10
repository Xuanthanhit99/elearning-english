# Backend placement

## 1. Thêm model vào Prisma

Sao chép nội dung `prisma-placement-snippet.prisma` vào `schema.prisma`.

Trong model `User`, thêm quan hệ:

```prisma
placement   UserPlacement?
skillLevels UserSkillLevel[]
```

Nếu tên trường user của bạn không phải `name` và `avatar`, sửa phần `select` trong `placement.service.ts`.

## 2. Chạy migration

```bash
npx prisma migrate dev --name add_user_placement
npx prisma generate
```

## 3. Import module

Trong `app.module.ts` hoặc module cha:

```ts
imports: [
  PlacementModule,
]
```

## 4. Auth

Controller giả định guard đăng nhập của bạn đã gắn một trong các trường sau vào `req.user`:

```ts
req.user.id
req.user.userId
req.user.sub
```

Nếu bạn dùng global `JwtAuthGuard`, không cần thêm guard tại controller.
