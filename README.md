# BeaconVie Placement Test Screen

Bá»™ code nÃ y dÃ nh cho mÃ n lÃ m cÃ¢u há»i nhÆ° giao diá»‡n Ä‘Ã£ thá»‘ng nháº¥t.

## TrÆ°á»›c khi cháº¡y

1. Bá»• sung 3 field vÃ o `PlacementTestQuestion`:

```prisma
isFlagged    Boolean @default(false)
isSkipped    Boolean @default(false)
spentSeconds Int     @default(0)
```

2. Cháº¡y:

```bash
npx prisma format
npx prisma migrate dev --name add_placement_test_question_state
npx prisma generate
```

3. GhÃ©p `PlacementTestController` vÃ  `PlacementTestService` vÃ o `PlacementModule`.

4. Äáº£m báº£o ngÃ¢n hÃ ng `PlacementQuestion` cÃ³ Ä‘á»§:
- Vocabulary: 10
- Grammar: 10
- Listening: 8
- Reading: 5
- Speaking: 1
- Writing: 1

Tá»•ng 35 cÃ¢u.
