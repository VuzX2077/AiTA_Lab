# AiTA Lab Project

## 1. Project Overview

AiTA Lab is a web application for managing research publications and members with role-based access control.

- Public users can view approved publications.
- Authenticated members can create/update/delete their own publications.
- Admin can approve/reject publications and manage members.

---

## 2. System Architecture

```text
Browser (Frontend: HTML/CSS/JS)
        ↓ HTTP (REST API)
Node.js + Express (Backend)
        ↓
PostgreSQL
```

The backend also serves static frontend files from `frontend/`.

---

## 3. Technology Stack

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript (Fetch API)

### Backend
- Node.js
- Express

### Database
- PostgreSQL (`pg`)

### Security
- JWT (`jsonwebtoken`)
- Password hashing (`bcrypt`)

---

## 4. Main Features

### Public
- View homepage
- View approved publications

### Member (`role: user`)
- Login / Logout
- View profile
- View own publications
- Create publication
- Edit/Delete own publication only

### Admin (`role: admin`)
- Review pending publications
- Approve/Reject publications
- Delete publications
- Add/Delete members

---

## 5. API Endpoints (Current)

Base prefix: `/api`

### Auth
- `POST /api/login`
- `POST /api/register`

### Member / Profile
- `GET /api/profile` (user/admin)

### Publications
- `GET /api/publications/public` (public approved list)
- `GET /api/publications` (user/admin)
- `GET /api/my-publications` (user/admin)
- `POST /api/publications` (user/admin)
- `PUT /api/publications/:id` (user/admin, ownership checked)
- `DELETE /api/publications/:id` (user/admin, ownership checked)

### Admin
- `GET /api/publications/pending` (admin)
- `PATCH /api/publications/:id/approve` (admin)
- `PATCH /api/publications/:id/reject` (admin)
- `DELETE /api/admin/publications/:id` (admin)
- `GET /api/members` (admin)
- `POST /api/members` (admin)
- `DELETE /api/members/:id` (admin)

---

## 6. Setup & Run (Local)

### 1) Install dependencies
Run at project root:

```bash
npm install
```

### 2) Create environment file
Create `backend/.env`:

```env
PORT=3000
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_secret_key
```

### 3) Start server
Run at project root:

```bash
npm start
```

Server runs at:

```text
http://localhost:3000
```

---

## 7. Frontend CSS Architecture

`frontend/css/` has been split into focused files:

- `base.css`: global foundation (body, container)
- `layout.css`: header, nav, footer, dashboard layout, sidebar layout
- `components.css`: buttons, forms, cards/lists, reusable UI blocks
- `admin.css`: admin-only overrides/styles
- `member.css`: member dashboard/overview/profile/settings styles
- `public.css`: public pages (index, login, general public sections)

---

## 8. Current Project Structure

```text
AiTA_Lab/
├── package.json
├── README.md
├── backend/
│   ├── db.js
│   ├── server.js
│   ├── controllers/
│   │   ├── adminController.js
│   │   ├── authController.js
│   │   ├── memberController.js
│   │   └── publicationController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── routes/
│   │   ├── adminRoutes.js
│   │   ├── authRoutes.js
│   │   ├── memberRoutes.js
│   │   └── publicationRoutes.js
│   └── services/
│       ├── adminService.js
│       ├── authService.js
│       ├── memberService.js
│       └── publicationService.js
└── frontend/
    ├── adminDashboard.html
    ├── index.html
    ├── login.html
    ├── publications.html
    ├── register.html
    ├── script.js
    ├── userDashboard.html
    ├── css/
    │   ├── admin.css
    │   ├── base.css
    │   ├── components.css
    │   ├── layout.css
    │   ├── member.css
    │   └── public.css
    └── js/
        ├── adminDashboard.js
        ├── login.js
        ├── main.js
        ├── publications.js
        └── userDashboard.js
```

---

## 9. Notes

- Authentication is JWT-based; protected routes require `Authorization: Bearer <token>`.
- `register.html` currently exists in structure but is empty.
- If deploying frontend separately (e.g., GitHub Pages), update API base URL in frontend JS as needed.
