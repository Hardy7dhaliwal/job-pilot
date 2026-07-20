# JobPilot

AI-powered job application assistant. Parses job descriptions, scores your resume, generates tailored resumes and cover letters, and manages your application pipeline — all with a human-in-the-loop review queue so nothing is ever submitted without your approval.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API routes
- **Database**: SQLite via Prisma (swap-ready for Postgres)
- **AI**: Anthropic Claude API (`claude-sonnet-4-5`) — Phase 2+
- **Auth**: Env-based single-user password (designed for future NextAuth migration)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — at minimum set:
#   APP_PASSWORD   (your login password)
#   AUTH_SECRET    (generate with: openssl rand -hex 32)

# 3. Initialize database
npx prisma migrate dev

# 4. Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with your `APP_PASSWORD`.

## Build Phases

| Phase | Features | Status |
|-------|----------|--------|
| 1 | Project scaffold, DB schema, auth, Resume Manager | ✅ Complete |
| 2 | JD parser + match scorer + manual job entry | ✅ Complete |
| 3 | Resume tailor + cover letter generator + diff view + exports | ✅ Complete |
| 4 | Job discovery integrations + background fetch + auto-scoring | ✅ Complete |
| 5 | Kanban tracker + review queue + analytics dashboard | ✅ Complete |

## Phase 1 — What's Included

### Authentication
- Single-user password auth via `APP_PASSWORD` env var
- HMAC-SHA256 signed session cookie (Edge middleware compatible)
- Login page at `/login`; all other routes are protected
- Designed for drop-in NextAuth replacement later

### Resume Manager
- **Create** resumes by pasting Markdown/plain text or uploading PDF/MD/TXT files
- **PDF parsing** via pdf-parse v2 (text extraction, not OCR — scanned-image PDFs won't work)
- **Master resume** concept — one resume is the "source of truth" for job matching
- **Edit** title and content inline
- **Version history** — tailored variants (created in Phase 3) appear here with full preview, export, print, and delete actions
- **Delete** with master-protection (can't delete master while others exist)

### Dashboard
- Resume count and master resume status cards
- Sidebar navigation with future-phase placeholders
- Dark mode by default

## Phase 2 — What's Included

### Manual Job Entry
- Paste any job description with title/company/location/URL
- Cross-source deduplication via a normalized hash of company + title + location (409 with a link to the existing job on duplicates)

### AI JD Parser + Match Scorer (Claude `claude-sonnet-4-5`)
- **Parse**: must-have skills, nice-to-haves, years of experience, seniority, ATS keywords, summary
- **Score**: honest 0–100 match of your master resume against the JD, with a strict rubric (skills only count when evidenced in the resume), matched/missing skill lists, gap analysis, and rationale
- Anti-fabrication instructions baked into every prompt
- Graceful failure handling: friendly errors for missing/invalid API key, rate limits (SDK auto-retries with backoff first), connection issues, and malformed output — a failed analysis never loses the job, just re-run it
- Works with any AI provider — see AI Setup below

### Jobs Dashboard
- Sorted by match score (best first, unscored last) or date
- Debounced search over title/company/location + minimum-score filter (state lives in the URL)
- Job detail page: match breakdown, parsed requirements, full JD, re-analyze and delete
- Dashboard home shows job counts and top 5 matches

### API (Phase 2)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs?q=&minScore=&sort=` | List jobs with search/filter/sort |
| POST | `/api/jobs` | Manual job entry `{title, company, description, location?, url?, remote?}` |
| GET | `/api/jobs/[id]` | Full job incl. parsed/match JSON |
| DELETE | `/api/jobs/[id]` | Delete a job |
| POST | `/api/jobs/[id]/analyze` | Parse JD + score master resume (two chained AI calls) |

## Phase 3 — What's Included

### Resume Tailor
- One-click tailored resume per job from the master resume + parsed JD
- Strict anti-fabrication: only reorder, reframe, re-emphasize, mirror terminology — never invent
- **Changes Made** audit list: every single edit the AI made is itemized for human review
- Side-by-side diff view (line-level, color-coded green/red) comparing master vs tailored
- Multiple versions per job (history preserved; re-tailoring creates a new version)
- Export as Markdown (.md download) or PDF (browser print-to-PDF via a clean print view)

### Cover Letter Generator
- Generates a 250–350 word cover letter from resume + parsed JD
- Same truthfulness constraints as the tailor — never claims skills absent from the resume
- Editable in-UI before export (inline textarea with save)
- Regenerate replaces content; hand-edits persist until regenerated
- Export as Markdown or PDF (same dual-export as resumes)

### API (Phase 3)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/jobs/[id]/tailor` | Generate a tailored resume version |
| POST | `/api/jobs/[id]/cover-letter` | Generate (or regenerate) a cover letter |
| GET | `/api/resume-versions/[id]` | Fetch a tailored version with job context |
| PATCH | `/api/resume-versions/[id]` | Edit content/label before export |
| DELETE | `/api/resume-versions/[id]` | Discard a version |
| PATCH | `/api/cover-letters/[id]` | Save hand-edits to a cover letter |
| DELETE | `/api/cover-letters/[id]` | Delete a cover letter |

## Project Structure

```
app/
  layout.tsx              — Root layout (ThemeProvider, Toaster)
  login/page.tsx          — Login page
  (dashboard)/
    layout.tsx            — Dashboard shell (sidebar + content)
    page.tsx              — Home dashboard
    resumes/
      page.tsx            — Resume list
      [id]/page.tsx       — Resume detail + editor + version history
  api/
    auth/login/route.ts   — POST login
    auth/logout/route.ts  — POST logout
    resumes/route.ts      — GET list, POST create
    resumes/[id]/route.ts — GET detail, PATCH update, DELETE
    resumes/upload/route.ts — POST multipart file upload (PDF/MD/TXT)
components/
  theme-provider.tsx
  app-sidebar.tsx
  resumes/
    add-resume-dialog.tsx
    resume-editor.tsx
    resume-actions.tsx
  ui/                     — shadcn/ui components
lib/
  auth.ts                 — Session token create/verify, password check
  prisma.ts               — Prisma client singleton
  constants.ts            — Enum-like value sets + config constants
  utils.ts                — cn() classname helper
  pdf-extract.cjs         — Standalone PDF text extraction script
middleware.ts             — Auth route guard
prisma/
  schema.prisma           — Full data model (all 5 phases)
  migrations/             — Initial migration
```

## Testing Phase 1

```bash
# Build check (should succeed with no errors)
npm run build

# Start production server
npm run start

# Or dev server with hot reload
npm run dev
```

Then verify:
1. Visit `http://localhost:3000` — should redirect to `/login`
2. Log in with your `APP_PASSWORD`
3. Dashboard shows resume status with call-to-action
4. Click "Add resume" → paste some Markdown → save
5. First resume auto-becomes master (star badge)
6. Upload a PDF file → text is extracted and stored
7. Click a resume → edit inline → save
8. Use kebab menu to promote another resume to master or delete

## API Reference (Phase 1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | `{password}` → sets session cookie |
| POST | `/api/auth/logout` | Clears session cookie |
| GET | `/api/resumes` | List all resumes (master first) |
| POST | `/api/resumes` | Create from `{title, content, format?, isMaster?}` |
| POST | `/api/resumes/upload` | Multipart file upload (PDF/MD/TXT) |
| GET | `/api/resumes/[id]` | Detail with version history |
| PATCH | `/api/resumes/[id]` | Update title/content/format, promote to master |
| DELETE | `/api/resumes/[id]` | Delete (blocked if master + others exist) |

## AI Setup

JobPilot supports multiple AI providers. Set `AI_PROVIDER` in `.env`:

### Option 1: Ollama (FREE, local) — Recommended for getting started

```bash
# Install Ollama from https://ollama.com, then:
ollama pull llama3
```

```env
AI_PROVIDER="ollama"
AI_MODEL="llama3"
```

That's it — no API key, no account, completely free. For better results use a larger model: `ollama pull llama3:70b` or `ollama pull qwen2:72b`.

### Option 2: Groq (FREE cloud tier, very fast)

Get a free key at [console.groq.com](https://console.groq.com):

```env
AI_PROVIDER="openai"
AI_BASE_URL="https://api.groq.com/openai/v1"
AI_API_KEY="gsk_..."
AI_MODEL="llama-3.3-70b-versatile"
```

### Option 3: OpenRouter (many models, some free)

```env
AI_PROVIDER="openai"
AI_BASE_URL="https://openrouter.ai/api/v1"
AI_API_KEY="sk-or-..."
AI_MODEL="meta-llama/llama-3.3-70b-instruct:free"
```

### Option 4: Anthropic Claude (paid, best quality)

```env
AI_PROVIDER="anthropic"
ANTHROPIC_API_KEY="sk-ant-..."
AI_MODEL="claude-sonnet-4-5"
```

### Option 5: Any OpenAI-compatible API (LM Studio, vLLM, Together AI, etc.)

```env
AI_PROVIDER="openai"
AI_BASE_URL="http://localhost:1234/v1"   # your server's URL
AI_API_KEY="your-key"                     # or omit for local servers
AI_MODEL="your-model-name"
```

### Option 6: External Agent Service (agy / Antigravity CLI)

JobPilot can delegate AI calls to a separate local agent service that spawns the `agy` CLI. This is useful if you have an Antigravity account and want to route all AI work through one reusable backend.

1. Start the agent service (see the separate `agent/` project).
2. Set the env vars:

```env
AI_PROVIDER="agent"
AGENT_BASE_URL="http://localhost:4000"
AGENT_API_KEY="change-me-in-production"
```

The active provider and model can also be changed in-app from the sidebar toggle.

## In-App AI Settings

A settings panel in the app sidebar lets you switch the active AI provider and model without editing `.env`. Changes are persisted in the `Setting` table and take effect immediately for the next AI call.

Supported providers in the UI:
- Anthropic
- OpenAI-compatible
- Ollama
- Agent (external agent service)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | SQLite file path (default: `file:./dev.db`) |
| `APP_PASSWORD` | Yes | Single-user login password |
| `AUTH_SECRET` | Yes | 32+ char secret for signing session cookies |
| `AI_PROVIDER` | No | `ollama` (default), `openai`, or `anthropic` |
| `AI_MODEL` | No | Model name (auto-set per provider if omitted) |
| `AI_BASE_URL` | No | API endpoint (auto-set for ollama/anthropic) |
| `AI_API_KEY` | No | API key for openai-compatible providers |
| `ANTHROPIC_API_KEY` | If anthropic | Claude API key |
| `ADZUNA_APP_ID` | No | Adzuna job search API credentials |
| `ADZUNA_APP_KEY` | No | |
| `JSEARCH_API_KEY` | No | JSearch (RapidAPI) key |

## Design Decisions

- **SQLite + Prisma**: Zero-config local dev. Schema is portable — change `provider` and `DATABASE_URL` to switch to Postgres.
- **No enums in schema**: SQLite doesn't support them. Allowed values live in `lib/constants.ts` and are validated at API boundaries.
- **PDF extraction via child process**: Next.js webpack breaks pdfjs-dist's worker resolution. Running `lib/pdf-extract.cjs` in a subprocess uses native Node.js `require()` where everything resolves correctly.
- **Single-master invariant**: Exactly one resume is marked `isMaster = true`. All matching/tailoring runs against it. Enforced transactionally.
- **Anti-fabrication rule**: All AI prompts (Phase 2+) will include strict instructions to never fabricate skills, employers, dates, titles, or metrics — only reframe/reorder/re-emphasize real content.

## Known Limitations

- `npm audit` reports vulnerabilities fixable only by upgrading to Next 16 (breaks Next 14 requirement) — not blocking
- PDF parsing is text-extraction only — scanned/image-only PDFs won't produce text (user should paste instead)
- Mobile: sidebar hidden below `md` breakpoint; mobile nav hamburger menu is a future enhancement
