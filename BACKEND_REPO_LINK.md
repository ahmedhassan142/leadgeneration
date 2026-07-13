# Backend lives in a separate repo

The backend worker (HuggingFace Spaces Docker image) is now in its own repo:

**https://github.com/ahmedhassan142/leadgenerationbackend**

This frontend repo only contains:
- `app/` — Next.js routes & API
- `components/` — UI components
- `lib/` — shared library (also copied into backend repo)
- `scripts/` — CLI test utilities
- `public/`, `types/`, `hooks/` — supporting code

Both repos share the same `lib/` folder content. If you change code in `lib/`,
you need to update both repos (or factor `lib/` into a third shared package).
