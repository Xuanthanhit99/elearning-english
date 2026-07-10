# Backend màn chuẩn bị Placement Test

## API

```text
GET  /placement/introduction
POST /placement/start
```

Cả hai API đều cần JWT.

## Import module

```ts
import { PlacementModule } from './modules/placement/placement.module';

@Module({
  imports: [
    PlacementModule,
  ],
})
export class AppModule {}
```

## Prisma

Code dùng đúng các model đã có:

- `User`
- `PlacementTest`
- `PlacementTestQuestion`
- `PlacementQuestion`
- `LearningSkill`
- `ModeType`
- `PlacementTestStatus`

Không cần thêm bảng mới cho màn chuẩn bị.

## Route tiếp theo

Backend trả:

```text
/placement/test/:sessionId
```

Hãy tạo màn làm câu hỏi ở route này.
