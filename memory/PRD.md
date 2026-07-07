# JobHub AI — Product Requirements

## Original Problem Statement
Build a complete, production-ready full-stack Job Portal (JobHub AI) with modern responsive premium UI inspired by LinkedIn, Indeed, Naukri. 3 roles (Seeker, Employer, Admin), full auth, job search/filters, AI resume analyzer, resume scoring, skill suggestions, cover letter generator, job recommendations, interview question generator, and complete admin management. Node/Express originally requested; user approved FastAPI substitute for this environment.

## Tech Stack (Actual Build)
- Backend: FastAPI + Motor (MongoDB async)
- Frontend: React 19 + Tailwind + Shadcn/UI + Framer Motion + Sonner
- Auth: JWT (HS256), bcrypt via passlib
- AI: Claude Sonnet 4.5 via emergentintegrations (Emergent Universal LLM Key)

## User Personas
- **Job Seeker**: Wants to find well-matched jobs fast, understand resume gaps.
- **Employer**: Wants to post jobs and manage applicants efficiently.
- **Admin** (Phase 2): Platform oversight.

## Phase 1 — Delivered (Feb 2026)
- [x] JWT auth: register, login, `/auth/me` with role selector (Seeker/Employer)
- [x] Landing page (Hero + Search + Featured jobs + Categories + Companies + Testimonials + Stats + Footer)
- [x] Jobs listing with server-side filters (q, location, category, job_type, experience, salary_min) + pagination
- [x] Job detail page + Apply dialog (cover note + resume text)
- [x] Employer flow: post job, list own jobs, view applicants, accept/reject, delete job
- [x] Seeker dashboard: application list with status badges
- [x] **AI Resume Analyzer (hero feature)** — Claude Sonnet 4.5: score (0–100), summary, strengths, weaknesses, skill suggestions, top-6 matched jobs from live DB, target-job match score
- [x] Seed data: 12 jobs, 6 companies, 2 demo accounts
- [x] Design: Swiss/high-contrast + Outfit/IBM Plex Sans fonts, dot-grid hero, glass header, orange (primary) + emerald (AI) accents, tracing-beam analyzer border

## Phase 2 — Deferred Backlog
### P0
- [ ] PDF resume upload via Emergent Object Storage (currently text paste)
- [ ] Saved / Bookmarked jobs
- [ ] Email verification + Forgot/Reset password
### P1
- [ ] Admin panel (manage users, jobs, reports, fake job detection)
- [ ] AI Cover Letter Generator
- [ ] AI Interview Questions Generator
- [ ] Notifications (in-app + email)
- [ ] Company detail pages, About, Contact, Privacy, Terms
### P2
- [ ] Company reviews (Reviews collection)
- [ ] Dark mode toggle
- [ ] Similar jobs on detail page
- [ ] Rate limiting, CSRF, XSS hardening
- [ ] Cloudinary integration (optional, replaced by object storage)

## Backend API Surface (Phase 1)
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `POST /api/jobs` (employer), `GET /api/jobs`, `GET /api/jobs/{id}`, `DELETE /api/jobs/{id}`
- `GET /api/jobs/featured`, `/categories`, `/companies`, `/stats`
- `POST /api/jobs/{id}/apply` (seeker), `GET /api/my/applications`, `GET /api/my/jobs`
- `GET /api/jobs/{id}/applicants` (employer), `PATCH /api/applications/{id}/status`
- `POST /api/ai/analyze-resume`
- `POST /api/seed?force=true`

## Test Credentials
See `/app/memory/test_credentials.md`.
