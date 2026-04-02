# AiTA Lab

AiTA Lab is a web application for managing lab members and research publications with JWT authentication and role-based access control.

## Overview

- Public users can view approved publications.
- Members (`role: user`) can manage their own publications.
- Admins (`role: admin`) can review publications and manage users/members.

## Architecture

```text
Browser (HTML/CSS/JS)
        |
        | HTTP (REST)
        v
Node.js + Express
        |
        v
PostgreSQL
```

The backend serves both:
- API endpoints under `/api`
- Static frontend files from `frontend/`

This project follows a layered structure:
- Routes -> Controllers -> Services -> Database
- Middleware handles authentication and authorization

## Tech Stack

- Frontend: HTML5, CSS3, Vanilla JavaScript (Fetch API)
- Backend: Node.js, Express
- Database: PostgreSQL (`pg`)
- Security: JWT (`jsonwebtoken`), Password hashing (`bcrypt`)

## Key Features

### Public
- View home and public pages
- View approved publications

### Member (`user`)
- Login / Logout
- View profile
- View own publications
- Create publication
- Edit/Delete own publication only

### Admin (`admin`)
- View pending publications
- Approve / Reject / Delete publications
- View members
- Create/Delete members
- Update member role (`user` <-> `admin`)

## Clean Page Routes

The app uses clean routes and maps them to files in `frontend/pages`:

- `/` -> public index
- `/publications`, `/researches`, `/members`, `/lecturers`, `/seminars`, `/archives`, `/contact`
- `/login`, `/register`
- `/adminDashboard`, `/memberDashboard`

Legacy `.html` paths are redirected to these clean routes.

## API Endpoints

Base prefix: `/api`

### Auth
- `POST /api/login`
- `POST /api/register`

### Profile
- `GET /api/profile` (user/admin)

### Publications
- `GET /api/publications/public` (public, approved only)
- `GET /api/publications` (user/admin)
- `GET /api/my-publications` (user/admin)
- `POST /api/publications` (user only)
- `PUT /api/publications/:id` (user only, own publication)
- `DELETE /api/publications/:id` (user only, own publication)

### Admin
- `GET /api/publications/pending` (admin)
- `PATCH /api/publications/:id/approve` (admin)
- `PATCH /api/publications/:id/reject` (admin)
- `DELETE /api/admin/publications/:id` (admin)
- `GET /api/members` (admin)
- `POST /api/members` (admin)
- `DELETE /api/members/:id` (admin)
- `PATCH /api/members/:id/role` (admin)

## Project Structure

```text
AiTA_Lab/
|-- package.json
|-- README.md
|-- backend/
|   |-- db.js
|   |-- server.js
|   |-- controllers/
|   |   |-- adminController.js
|   |   |-- authController.js
|   |   |-- memberController.js
|   |   |-- publicationController.js
|   |-- middleware/
|   |   |-- authMiddleware.js
|   |-- routes/
|   |   |-- adminRoutes.js
|   |   |-- authRoutes.js
|   |   |-- memberRoutes.js
|   |   |-- publicationRoutes.js
|   |-- services/
|       |-- adminService.js
|       |-- authService.js
|       |-- memberService.js
|       |-- publicationService.js
|
|-- frontend/
|   |-- script.js
|   |-- css/
|   |   |-- admin.css
|   |   |-- base.css
|   |   |-- components.css
|   |   |-- layout.css
|   |   |-- member.css
|   |   |-- auth.css
|   |   |-- public-home.css
|   |   |-- public-news.css
|   |   |-- public-content-pages.css
|   |   |-- public-members.css
|   |-- js/
|   |   |-- adminDashboard.js
|   |   |-- login.js
|   |   |-- main.js
|   |   |-- publications.js
|   |   |-- userDashboard.js
|   |-- pages/
|       |-- admin/
|       |   |-- adminDashboard.html
|       |-- auth/
|       |   |-- login.html
|       |   |-- register.html
|       |-- member/
|       |   |-- memberDashboard.html
|       |-- public/
|           |-- index.html
|           |-- publications.html
|           |-- researches.html
|           |-- members.html
|           |-- lecturers.html
|           |-- seminars.html
|           |-- archives.html
|           |-- contact.html
```

## Local Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Create `backend/.env`:

```env
PORT=3000
DATABASE_URL=postgresql://username:password@host:5432/database_name
JWT_SECRET=your_strong_secret_key
```

Notes:
- `PORT` defaults to `3000` if omitted.
- `DATABASE_URL` is preferred; fallback vars (`DB_USER`, `DB_HOST`, `DB_NAME`, `DB_PASSWORD`, `DB_PORT`) are also supported.

### 3) Run the app

```bash
npm start
```

Open: `http://localhost:3000`

## Frontend to Docs Sync Workflow

Use `frontend/` as the source of truth for UI changes.

- Edit HTML/CSS/JS in `frontend/`
- Run the sync command to regenerate `docs/` for GitHub Pages

```bash
npm run sync:docs
```

What the sync script does:
- Copies `frontend/css` into `docs/css`
- Copies `frontend/js` into `docs/js`
- Keeps `docs/js/config.js` for GitHub Pages API configuration
- Generates root pages like `docs/index.html`, `docs/publications.html`, `docs/login.html`
- Regenerates `docs/pages/*` as redirects to the root `docs/*.html` pages

Recommended workflow:
1. Update the UI in `frontend/`
2. Run `npm run sync:docs`
3. Review the generated `docs/` changes
4. Commit and push

For GitHub Pages, set the source to the `/docs` folder and update `docs/js/config.js` with your deployed backend URL if needed.

## Security Notes

- Protected endpoints require `Authorization: Bearer <token>`.
- JWT payload contains `id` and `role`, expires in 1 hour.
- Passwords are hashed with bcrypt.
- Legacy plain-text passwords are migrated to bcrypt on successful login.

## Deployment (GitHub + Render/Railway)

1. Push source code to GitHub.
2. Create a Node web service from the repository.
3. Set build/start commands:
   - Build: `npm install`
   - Start: `npm start`
4. Provision PostgreSQL and set environment variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `PORT` (if required by platform)

Because Express serves frontend static files, one backend service is enough for the full app.
