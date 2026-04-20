# AiTA Lab

AiTA Lab is a lab website and management system for news, members, lecturers, seminars, and publications.

Live website: https://aitalab.net

## Production Deployment

This project is running in a split deployment model (all free tier):

- Frontend host: DirectAdmin (domain: https://aitalab.net)
- Backend API: Render (example endpoint: https://aita-lab.onrender.com)
- Database + object storage: Supabase (PostgreSQL + Storage)

## System Architecture

```text
Browser (aitalab.net)
        |
        | HTTPS (REST)
        v
Render Node.js/Express API
        |
        +--> Supabase PostgreSQL (application data)
        |
        +--> Supabase Storage (uploaded images)
```

## Main Features

- Public pages: homepage, news, publications, researches, members, lecturers, seminars, archives, contact.
- Authentication: login/register with JWT.
- Role model:
  - `user`: own profile and publication management.
  - `admin`: content moderation and full dashboard management.
- Admin content modules:
  - home news
  - homepage sections
  - social icon presets
  - members and member profile details
  - lecturers
  - seminars
  - publications moderation
- Image upload/delete pipeline integrated with Supabase Storage.

## Tech Stack

- Frontend: HTML, CSS, Vanilla JavaScript
- Backend: Node.js, Express
- Database: PostgreSQL (`pg`) via Supabase
- File storage: Supabase Storage (`@supabase/supabase-js`)
- Auth/Security: JWT (`jsonwebtoken`), password hashing (`bcrypt`)

## Project Structure (Short)

```text
AiTA_Lab/
|- backend/
|  |- controllers/
|  |- middleware/
|  |- migrations/
|  |- repositories/
|  |- routes/
|  |- scripts/
|  |- services/
|  |- server.js
|  |- db.js
|  |- supabaseClient.js
|- frontend/
|  |- css/
|  |- js/
|  |- pages/
|- docs/
|  |- css/
|  |- js/
|  |- *.html
|- package.json
```

## API Overview

All API routes are under `/api`.

- Auth: `/login`, `/register`, `/change-password`
- Member/Profile: `/profile`, `/members/public`, `/members/public/:id`, `/profile/public-page`
- Publications: `/publications/public`, `/publications`, `/my-publications`, `/publications/resolve-doi`
- Admin publication review: `/publications/pending`, `/publications/:id/approve`, `/publications/:id/reject`
- Home news: `/home-news/public/*`, `/home-news` (admin)
- Homepage content (admin/public): `/homepage-content/public`, `/admin/homepage-content*`
- Lecturers: `/lecturers/public`, `/admin/lecturers*`
- Seminars: `/seminars/public`, `/seminars` (admin)
- Social icon presets: `/social-link-icons/public`, `/admin/social-link-icons`
- Uploads: `/uploads/images` (POST/DELETE)

## Local Development

### 1) Install dependencies

```bash
npm install
```

### 2) Create backend environment file

Create `backend/.env`:

```env
PORT=3000

# PostgreSQL (Supabase or local Postgres)
DATABASE_URL=postgresql://username:password@host:5432/database_name

# JWT
JWT_SECRET=replace_with_a_strong_secret

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Notes:

- If `DATABASE_URL` is missing, fallback variables are used: `DB_USER`, `DB_HOST`, `DB_NAME`, `DB_PASSWORD`, `DB_PORT`.
- Keep `SUPABASE_SERVICE_ROLE_KEY` private and never expose it in frontend files.

### 3) Start application

```bash
npm start
```

Local URL: http://localhost:3000

## Frontend Configuration

Frontend config is in `frontend/js/config.js` (and mirrored to `docs/js/config.js`).

- Local: `http://localhost:3000`
- Production API base: `https://aita-lab.onrender.com`

## Docs Sync Workflow

Use `frontend/` as source and generate `docs/` by:

```bash
npm run sync:docs
```

This command syncs HTML/CSS/JS from `frontend/` into `docs/` for static deployment scenarios.

## Helpful Scripts

- `npm start`: run backend server
- `npm run sync:docs`: sync frontend assets/pages to `docs/`
- `npm run cleanup:orphan-images`: remove unreferenced uploaded images

## Security Notes

- Protected endpoints require `Authorization: Bearer <token>`.
- JWT token includes user `id` and `role`.
- Passwords are hashed with bcrypt.

## Free-Tier Operational Notes

- Render free tier may sleep on inactivity, so the first API response can be slower (cold start).
- Supabase free tier has storage/database limits; monitor usage regularly.
- DirectAdmin static hosting and Render API deployment are decoupled, so keep API base URL in frontend config aligned with the active backend service.
