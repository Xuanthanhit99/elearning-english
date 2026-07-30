# Document Library Deployment Runbook

Covers the environment variables and rollout policy for the Document
Library feature (community upload, Gemini generation, R2 storage).
`backend/.env.example` also documents these but is excluded by
`.gitignore`'s `.env.*` pattern (see "`.env.example` tracking" below) —
this file is the git-tracked source of truth.

## Environment variables

### Storage (R2)

```env
DOCUMENT_STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=
R2_REGION=auto

DOCUMENT_SIGNED_URL_TTL_SECONDS=300
```

- `DOCUMENT_STORAGE_PROVIDER` must be `r2` in production. `local` (a
  filesystem adapter that writes to ephemeral container disk and
  returns non-HTTPS `local-signed://` URLs) is development/test only.
  `production-env.validation.ts` hard-fails backend boot if
  `NODE_ENV=production`, documents are enabled, and the provider is
  `local` — this is a startup crash, not a silent fallback to local
  disk.
- When the provider is `r2`, all four `R2_*` credential/bucket vars are
  required in production; boot also fails if any are missing.
- `R2_ENDPOINT` can be left blank — it's derived from `R2_ACCOUNT_ID`
  if unset.
- `DOCUMENT_SIGNED_URL_TTL_SECONDS` controls how long a presigned
  download URL stays valid after it passes the access-policy check
  (default 300s). Keep this short; it is not a general-purpose link.

### Feature flags

```env
DOCUMENTS_ENABLED=false
```

- Master switch for the whole feature. `false` disables all Document
  Library routes/queues and skips the R2 requirement above entirely
  (nothing to validate if the feature is off).

### Community upload internal beta

```env
DOCUMENT_COMMUNITY_UPLOAD_ENABLED=false
DOCUMENT_COMMUNITY_UPLOAD_ALLOWED_USER_IDS=
DOCUMENT_COMMUNITY_UPLOAD_ALLOWED_EMAILS=
```

- Enforced backend-side by `CommunityDocumentUploadGuard` on every
  endpoint that can introduce a new file into the community pipeline —
  upload, resubmit, and create-revision. The frontend hiding the
  "Đăng tài liệu" CTA is UX only; it is never the actual gate.
- `ADMIN` users always pass, regardless of the flag or allowlist —
  needed so staff can exercise the pipeline while it's off for
  everyone else.
- When `DOCUMENT_COMMUNITY_UPLOAD_ENABLED=false`, only `ADMIN` or a
  user matching the allowlist may call those three endpoints; everyone
  else gets `403 Forbidden`.
- When `DOCUMENT_COMMUNITY_UPLOAD_ENABLED=true`, any authenticated user
  may upload (subject to the existing per-user daily/active-upload
  limits and AI moderation pipeline — unrelated to this flag).
- Both allowlist variables are comma-separated (CSV). Whitespace around
  each entry is trimmed. Empty/malformed entries are dropped, never
  interpreted as "match everything."
- `DOCUMENT_COMMUNITY_UPLOAD_ALLOWED_EMAILS` is matched
  case-insensitively — both the configured list and the caller's email
  are lowercased before comparing.
- **Do not enable public community upload
  (`DOCUMENT_COMMUNITY_UPLOAD_ENABLED=true` for everyone) before a
  malware scanner is in place.** File-type/magic-byte/zip-bomb
  validation exists; a real antivirus scan of upload contents does not.
  Until then, community upload should stay allowlist-only.

### General

- **Never commit secrets.** All values above (except the two feature
  flags and the allowlists themselves, which aren't secret) come from
  Railway's **Variables** tab in production — not from any file in the
  repo. `backend/.env` and `backend/.env.example` are both gitignored;
  neither should ever contain a real production credential in a commit.

## `.env.example` tracking

`backend/.gitignore`-equivalent pattern `.env.*` in the repo root
`.gitignore` matches `backend/.env.example` and excludes it from git —
confirmed via `git check-ignore -v backend/.env.example`. This means
the inline documentation added to that file during Document Library
development only exists on whichever machine edited it locally; it was
never part of any commit.

This may or may not be intentional repo convention (excluding all
`.env*` files, including templates, is unusual but not unheard of).
**Not changed in this pass** — flagging it here rather than silently
un-ignoring and committing a template file, since that's a repo-wide
convention decision, not something specific to Document Library. If the
team wants `.env.example` tracked going forward, the fix is a single
`.gitignore` line (`!backend/.env.example` or similar) plus committing
the file — worth a deliberate decision, not a side effect of this
runbook.

## Railway rollout checklist

1. Select the correct Railway **project**, **environment**, and
   **service** (backend) before touching Variables — double-check this
   isn't a shared/production environment if the intent is staging.
2. Set the environment variables listed above under the service's
   **Variables** tab (not committed anywhere).
3. Run `npx prisma migrate deploy` against the target database as a
   controlled release step (matches the existing convention in
   `docs/arena-production-runbook.md`) — never `prisma migrate reset`
   or `prisma db push`.
4. Deploy the backend service.
5. Verify `/health` and `/health/ready` return healthy/ready.
6. Run the R2 smoke test (upload, presigned URL, download, checksum,
   confirm the bucket rejects unsigned access, delete) against the
   configured bucket.
7. Run a small Gemini generation smoke test (1 lesson, A1, generate →
   render → validate → admin approve → publish → download) and confirm
   the rendered PDF lands in R2, not local disk.
8. Run a community-upload smoke test using an allowlisted internal/test
   account only (upload → moderation → admin approve → publish →
   download), then remove or archive the test data per your data
   retention policy.
