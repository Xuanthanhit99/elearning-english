# Phase 11 - Unified Search, Discovery and Recommendations

## 1. Executive Summary

Production Decision: READY_WITH_LIMITATIONS

Phase 11 was implemented as a direct domain search layer over existing production data. No duplicate search read model, external search engine, or recommendation engine was introduced.

## 2. Initial Git State

- git status: clean before Phase 11 changes.
- git diff --stat: empty before Phase 11 changes.
- git diff --name-only: empty before Phase 11 changes.
- git diff --check: PASS before Phase 11 changes.

## 3. Files and Modules Reviewed

- backend/src/app.module.ts
- backend/src/modules/dashboard
- backend/src/modules/progress
- backend/src/modules/vocabulary
- backend/src/modules/grammar
- backend/src/modules/reading
- backend/src/modules/listening
- backend/src/modules/speaking
- backend/src/modules/writing
- backend/src/modules/community
- backend/src/modules/community-club
- backend/prisma/schema.prisma
- english-web-build/src/Components/Layout/AppHeader.tsx
- english-web-build/src/Components/Layout/AppSidebar.tsx
- existing frontend module-specific search pages

## 4. Existing Search Inventory

| Component | File | Current behavior | Data source | Status | Action |
| --- | --- | --- | --- | --- | --- |
| Header search | english-web-build/src/Components/Layout/AppHeader.tsx | Static input only | None | MISSING | EXTEND |
| Writing topic search | backend/src/modules/writing/writing.service.ts | Module-local search | WritingTopic | KEEP | Reused concept only |
| Speaking topic search | backend/src/modules/speaking/speaking.service.ts | Module-local search | SpeakingTopic | KEEP | Reused source |
| Reading search | backend/src/modules/reading/reading.service.ts | Module-local search/filter | ReadingArticle/Category | KEEP | Reused source |
| Community search | backend/src/modules/community-social | Local user/club search | Community tables | KEEP | Reused safe public club/post source |
| Unified search | N/A | Not present | N/A | MISSING | ADDED |

## 5. Existing Discovery Inventory

| Component | File | Current behavior | Data source | Status | Action |
| --- | --- | --- | --- | --- | --- |
| Dashboard recommendation | backend/src/modules/dashboard/dashboard.service.ts | Recommended lesson/continue learning | Real user data | KEEP | Reused |
| Progress history | backend/src/modules/progress/progress.service.ts | Unified learning timeline | Real user data | KEEP | Reused as input |
| Discovery page | N/A | Not present | N/A | MISSING | ADDED |

## 6. Existing Recommendation Inventory

| Component | File | Current behavior | Data source | Status | Action |
| --- | --- | --- | --- | --- | --- |
| Dashboard recommended lesson | DashboardService | Deterministic recommendation | Learning path/session data | KEEP | Reused |
| Analytics recommendations | Analytics module | Skill/report suggestions | Analytics data | KEEP | Reused concept |
| Dedicated recommendations API | N/A | Not present | N/A | MISSING | ADDED |

## 7. KEEP/FIX/EXTEND/REPLACE/REMOVE/MISSING Matrix

- KEEP: module-specific search in writing, speaking, reading and community.
- EXTEND: shared AppHeader search.
- EXTEND: shared sidebar with Discover route.
- MISSING: unified search API.
- MISSING: suggestions API.
- MISSING: discovery API.
- MISSING: recommendation API.
- REPLACE: none.
- REMOVE: none.

## 8. Searchable Content Matrix

| Module | Search source | Searchable fields | Access filter | Result route | Recommendation use | Test | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Vocabulary | Word, WordTopic | word, meanings, example, topic | Public learning content | /vocabulary | Review/quick practice | Search unit | SUPPORTED |
| Grammar | GrammarTopic, GrammarLesson | title, slug, description | isActive + active category | /grammar/topic, /grammar/lesson | Weak skill, new content | Build | SUPPORTED |
| Reading | ReadingArticle, ReadingCategory | title, slug, description | isPublished + active category | /reading/articles, /reading/categories | Popular/new/quick practice | Build | SUPPORTED |
| Listening | ListeningQuestion | title, topic, question | isActive | /listening | Quick practice, retry | Build | PARTIAL |
| Speaking | SpeakingTopic, SpeakingLesson | title, slug, description | isActive + active category | /speaking/topics | Weak skill, retry | Build | SUPPORTED |
| Writing | WritingTopic, WritingLesson | title, slug, description, prompt | isActive | /writing/topics | Weak skill, retry | Build | SUPPORTED |
| Course | Course | title, slug, description, level | APPROVED only | /courses/:slug | Explore | Build | PARTIAL |
| Community | CommunityPost, CommunityClub | public title/content/name/description | PUBLIC, active, not deleted, no private club leak | /community, /community/clubs | Discovery | Build | PARTIAL |
| Learning Path | DashboardService | current next step | Authenticated user | Existing href | Next step | Build | SUPPORTED |

## 9. Search Contract

Implemented `UnifiedSearchResult` with safe display fields only:

- id
- type
- title
- subtitle
- description
- skill
- level
- imageUrl
- tags
- status
- score
- href
- metadata

Raw Prisma models are not returned.

## 10. Query Normalization

Implemented:

- trim
- whitespace collapse
- NFKC Unicode normalization
- control character removal
- max length 80
- minimum effective length 2
- no raw SQL interpolation

## 11. Search Architecture Decision

Search Architecture Decision: DIRECT_DOMAIN_SEARCH

Evidence:

- Existing domain tables already contain the searchable fields needed for Phase 1.
- PostgreSQL ILIKE through Prisma is sufficient for current bounded queries.
- No search document table, pg_trgm extension, Elasticsearch or vector DB was required.

Tradeoff:

- Lower operational risk and no migration/backfill.
- Ranking is application-level and bounded for Phase 1.

## 12. Search Index Review

- Existing indexes cover status, level, active flags and popularity fields for several sources.
- No new indexes added.
- Future improvement: pg_trgm or search document table if query volume grows.

## 13. Search Ranking

Ranking is deterministic:

1. Exact title match.
2. Title prefix match.
3. Title contains match.
4. Tag match.
5. Description match.
6. User boost.
7. Popularity and recency tie-breakers.

## 14. Personalization Boost

Implemented lightweight boost:

- current level matching when available;
- weak skill boost;
- explicit filters still override discovery behavior.

## 15. Filters

Supported:

- type
- skill
- level
- sort
- limit
- offset

Sort allowlist:

- RELEVANCE
- NEWEST
- POPULAR
- LEVEL_ASC

## 16. Pagination

Pagination Decision: BOUNDED_OFFSET

- max limit: 30
- max offset: 120
- stable deterministic sort
- no unbounded database load

## 17. Suggestions

Implemented:

- GET /search/suggestions
- max 10 items
- debounced frontend
- no request for query shorter than 2 characters
- returns safe title/subtitle/href only

## 18. Search History

Decision: NO_PERSISTED_HISTORY

No UserSearchHistory model was added in Phase 11 to avoid migration and retention-policy risk. Recent persisted cross-device search history is deferred.

## 19. Search Analytics

Minimal safe backend log only:

- event
- userId
- query hash
- result count
- duration

Raw query, token and cookie are not logged.

## 20. Deep Link Registry

Added SearchRouteRegistry.

Routes are generated server-side from an allowlist and not read raw from database.

## 21. Access Control

Implemented filters:

- Grammar active categories/topics/lessons only.
- Reading published articles and active categories only.
- Listening active questions only.
- Speaking active categories/topics/lessons only.
- Writing active topics/lessons only.
- Courses APPROVED only.
- Community posts PUBLIC + PUBLISHED + not deleted + no club-only private post.
- Community clubs PUBLIC + active only.

## 22. Discovery Sections

Implemented:

- Recommended for you.
- Popular this week.
- New content.
- Quick practice.

Sections with no real data are hidden.

## 23. Recommendation Architecture

Recommendation is rule-based inside SearchService for Phase 11. It reuses DashboardService and direct domain aggregate queries.

No AI call is made for search or recommendation.

## 24. Recommendation Inputs

Used:

- dashboard continueLearning
- dashboard recommendedLesson
- overdue vocabulary reviewAt
- recent low scores
- weak skill aggregates with minimum sample threshold
- public/popular/new content

## 25. Recommendation Rules

Implemented:

- CONTINUE_LEARNING
- NEXT_LEARNING_PATH_STEP
- OVERDUE_VOCABULARY_REVIEW
- WEAK_SKILL_PRACTICE
- QUICK_PRACTICE
- RETRY_LOW_SCORE

## 26. Recommendation Priority

Priority is deterministic:

- Continue learning: highest.
- Learning path next step.
- Due vocabulary review.
- Weak skills.
- Low score retry.
- Quick fallback.

## 27. Weak Skill Logic

Weak skill requires at least 2 samples and average score below 70.

Sources:

- ReadingSession accuracy
- ListeningSession score
- SpeakingSession overallScore
- WritingSession overallScore
- GrammarLessonProgress score

## 28. Overdue Review Logic

Uses UserWordProgress.reviewAt <= now.

## 29. Retry Logic

Uses most recent low-score sessions across reading/listening/speaking/writing.

## 30. Diversity and Suppression

Recommendations are deduplicated by type + href and capped.

## 31. Popular/Trending/New Definitions

- Popular vocabulary: Word.searchCount.
- Popular reading: ReadingArticle.viewCount.
- Popular community: CommunityClub.memberCount.
- New content: createdAt ordering for active grammar/writing/speaking.
- Quick practice: listening questions and short reading articles.

## 32. REST API

Added:

- GET /search
- GET /search/suggestions
- GET /discovery
- GET /recommendations

All endpoints require JWT HttpOnly cookie auth through JwtAuthGuard.

## 33. DTO Validation

Implemented SearchQueryDto and SearchSuggestionQueryDto with enum and bound validation.

## 34. Cache Strategy

Cache Decision: NO_CACHE_REQUIRED

No Redis cache added for Phase 11.

## 35. Cache Invalidation

NOT APPLICABLE.

## 36. Security and Privacy

- No frontend userId accepted.
- No token/localStorage usage.
- No raw SQL.
- No `dangerouslySetInnerHTML`.
- No private/draft/deleted community content in unified search.
- No open redirect through database href.

## 37. Rate Limiting

PARTIAL.

Frontend autocomplete is debounced. Backend endpoint has bounded validation, but no dedicated route-level rate limiter was added.

## 38. Performance Review

- Queries are bounded by source.
- Result payloads are display-only.
- No full article/transcript raw content is returned.
- No per-result N+1 enrichment.
- No Gemini call.

## 39. Frontend Search

Added:

- /search
- URL q support
- filters
- sort
- loading/error/empty
- load more
- deep links

## 40. Frontend Autocomplete

AppHeader now:

- calls /search/suggestions with debounce;
- navigates to /search?q=... on submit;
- uses withCredentials through shared axios;
- does not store token or decode JWT.

## 41. Frontend Discovery

Added:

- /discover
- discovery sections
- loading/error/empty
- responsive cards

## 42. Frontend Recommendations

Recommendations are displayed inside /discover through the same discovery contract.

## 43. Frontend Store

No new Zustand store was added.

## 44. URL State

Search query is initialized from `/search?q=...`.

## 45. Responsive Review

Scoped static review: PASS.

Search and discovery use responsive grid and full-width mobile inputs.

## 46. Accessibility Review

PARTIAL.

Added labels, role=listbox/option for suggestions, semantic buttons/links and no unsafe highlight HTML.

## 47. Backend Tests

- npm test -- search --runInBand: PASS
- Broad regression command: FAIL due pre-existing provider mock gaps in unrelated specs.

Pre-existing failures included:

- vocabulary-job missing PrismaService/GeminiService mocks.
- reading-job missing PrismaService/GeminiService mocks.
- speaking service/controller specs missing providers.
- grammar-job missing PrismaService/GeminiService mocks.
- vocabulary controller spec missing AchievementsService mock.

## 48. Frontend Tests

- Scoped ESLint for Phase 11 files: PASS
- TypeScript: PASS with NODE_OPTIONS=--max-old-space-size=8192
- Next production build: PASS with NODE_OPTIONS=--max-old-space-size=12288

## 49. Integration Matrix

See section 8.

## 50. Regression Results

- Search-specific test: PASS.
- Backend build: PASS.
- Frontend build: PASS.
- Broad backend regression: FAIL, classified as PRE-EXISTING FAILURE.

## 51. Bugs Found

| Severity | File | Evidence | Impact | Fix | Verification | Status |
| --- | --- | --- | --- | --- | --- | --- |
| HIGH | AppHeader.tsx | Header search input had no behavior | Users could not search globally | Added API autocomplete and submit navigation | Scoped lint + build | FIXED |
| MEDIUM | N/A | No unified search API | Search was module-local only | Added SearchModule | Backend build + search test | FIXED |
| MEDIUM | N/A | No discovery route | Users lacked consolidated discovery | Added /discover and /discovery | Next build | FIXED |
| MEDIUM | N/A | No recommendations API | Recommendation scattered only | Added /recommendations | Backend build | FIXED |

## 52. Bugs Fixed

- Header search now works.
- Unified search contract added.
- Active/published/public filters added.
- Server-side href allowlist added.
- Rule-based recommendations added.
- Frontend discovery and search pages added.

## 53. Remaining Issues

- Persisted search history is not implemented.
- Dedicated backend rate limiter for search/suggestions is not implemented.
- Search uses bounded Prisma ILIKE, not PostgreSQL FTS/trigram.
- Listening search is partial because it maps to the listening landing/practice flow, not a dedicated content detail route.
- Course search is partial because only APPROVED courses are exposed.

## 54. Files Changed

- backend/src/app.module.ts
- backend/src/modules/search/*
- english-web-build/src/lib/search-api.ts
- english-web-build/app/(main)/search/page.tsx
- english-web-build/app/(main)/discover/page.tsx
- english-web-build/src/Components/Layout/AppHeader.tsx
- english-web-build/src/Components/Layout/AppSidebar.tsx
- english-web-build/src/i18n/types.ts
- english-web-build/src/i18n/locales/vi.ts
- english-web-build/src/i18n/locales/en.ts
- english-web-build/src/i18n/locales/de.ts
- english-web-build/src/i18n/locales/zh.ts

## 55. Migration Decision

Migration Decision: NO_MIGRATION_REQUIRED

Prisma migrate status confirms the database schema is up to date.

## 56. Search Architecture Decision

Search Architecture Decision: DIRECT_DOMAIN_SEARCH

## 57. Backfill Decision

Backfill Decision: NO_BACKFILL_REQUIRED

## 58. Cache Decision

Cache Decision: NO_CACHE_REQUIRED

## 59. Production Decision

Production Decision: READY_WITH_LIMITATIONS

Reason:

- Core search, suggestions, discovery and recommendations use real data and pass build/type/lint/search tests.
- Remaining limitations do not block Phase 1 use, but prevent a full READY decision.

## 60. Next Stage Gate

Next Stage Gate: OPEN
