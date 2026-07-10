# PoppyLingo Placement Test Screen

Bộ code này dành cho màn làm câu hỏi như giao diện đã thống nhất.

## Trước khi chạy

1. Bổ sung 3 field vào `PlacementTestQuestion`:

```prisma
isFlagged    Boolean @default(false)
isSkipped    Boolean @default(false)
spentSeconds Int     @default(0)
```

2. Chạy:

```bash
npx prisma format
npx prisma migrate dev --name add_placement_test_question_state
npx prisma generate
```

3. Ghép `PlacementTestController` và `PlacementTestService` vào `PlacementModule`.

4. Đảm bảo ngân hàng `PlacementQuestion` có đủ:
- Vocabulary: 10
- Grammar: 10
- Listening: 8
- Reading: 5
- Speaking: 1
- Writing: 1

Tổng 35 câu.
