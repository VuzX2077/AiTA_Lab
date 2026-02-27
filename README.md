# AiTA Lab Project

## 1. Project Overview

The system is designed to manage and display information about a research lab, including members, publications, and user authentication with role-based access control.

### Project Goals

The main goal of this project is to demonstrate:

- Client–Server Architecture
- RESTful API design
- Authentication and Authorization
- Role-based Access Control (RBAC)
- Basic Software Engineering documentation and design principles

---

## 2. System Architecture

The system follows a 3-tier architecture:

```
Client (Browser)
      ↓
Frontend (HTML, CSS, JavaScript)
      ↓ HTTP Requests (REST API)
Backend (Node.js + Express)
      ↓
Cloud Database (PostgreSQL)
```

### Production Architecture

```
Frontend (GitHub Pages)
        ↓
Backend (Render)
        ↓
PostgreSQL (Cloud Database)
```

---

## 3. Technology Stack

### Frontend
- HTML5  
- CSS3  
- JavaScript (Vanilla JS)  
- Fetch API  

### Backend
- Node.js  
- Express.js  

### Database
- PostgreSQL (Cloud-hosted)

### Authentication & Security
- JWT (JSON Web Token)  
- bcrypt (Password hashing)  

### Deployment
- Frontend: GitHub Pages  
- Backend: Render  
- Database: Render PostgreSQL / Railway / Supabase  

---

## 4. Main Features

### Public (Guest)
- View homepage  
- View publications  
- View members  
- Cannot login as member without credentials
- Cannot create, edit, or delete any data

### Authenticated Member
- Login / Logout  
- Create new publication  
- Eite their own publication  
- Delete their own publication
- Cannot approve publications
- Cannote manage members

### Admin
- Review and approve publications
- Delete publication (if necessary)
- Add new members  
- Delete members  

---

## 5. Role-Based Access Control (RBAC)

The system supports three access levels:

1. Guest (Unauthenticated user)
   - Can access public endpoints only
   - Cannot access protected routes
   - Has no permission to modify any data

2. Member (Authenticated user)
   - Must provide a valid JWT token.
   - Can create, update and delete publications created my themselves only
   - Cannot approve publications
   - Cannot add or remove members

3. Admin
   - Must provide a valid JWT token.
   - Can approve or reject publications.
   - Can delete publications
   - Can add new members
   - Can remove existing members

### Access Rules
 - All protected routes require authentication via JWT.
 - Authorization middleware verifies user role.
 - Additional ownership validation ensures members can only modify their own publications.
 - Admin-only routes are strictly protected by role-check middleware.

---

## 6. Database Design

### Users Table
- id (Primary Key)  
- email (unique)  
- password (hashed)  
- role (admin / user)
- create at

### Publications Table
- id (Primary Key)  
- title  
- author_id (Foreign Key -> Users.id) 
- year  
- description
- status (pending/approved/rejected)
- create at

### Members Table
- id (Primary Key)  
- name  
- position  
- bio
- user_id (Foreign Key -> Users.id)

---

## 7. API Endpoints

### Authentication
- `POST /register` (Admin only - create member account)
- `POST /login`

### Publications

#### Public
- `GET /publications` (Approved publications only)

#### Member
- `POST /publications`
- `PUT /publications/:id` (only if owner)
- `DELETE /publications/:id` (only if owner)

#### Admin
- `GET /admin/publications` (view all publications including pending)
- `PATCH /admin/publication/:id/approve`
- `DELETE /admin/publication/:id`

### Members
#### Public
- `GET /members`

#### Admin Only
- `POST /members`
- `DELETE /members`

---

## 8. Security Mechanism

- Passwords are hashed using **bcrypt** before storing in the database.
- JWT is generated after successful login.
- Protected routes require a valid token.
- Role-based middleware checks user permissions before allowing access.
- Ownership validation ensures members can only modify their own publications.
- Environment variables are used to protect database credentials.

---

## 9. Installation & Setup

### 1. Clone the repository

```bash
git clone <your-repository-url>
```

---

## 9.1 Backend Setup (Development Mode)

### Install backend dependencies

```bash
cd backend
npm install
```

### Create `.env` file

Create a `.env` file inside the backend folder:

```
PORT=3000
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_secret_key
```

### Run backend server

```bash
node server.js
```

Backend runs at:

```
http://localhost:3000
```

---

## 9.2 Frontend Setup (Development Mode)

### Navigate to frontend folder

```bash
cd frontend
```

You can run the frontend in one of the following ways:

**Option 1:**
- Open `index.html` directly in your browser.

**Option 2 (Recommended):**
- Use **Live Server extension** in VS Code.

---

## 10. Deployment (Production)

### Backend Deployment (Render)

1. Push project to GitHub.
2. Connect repository to Render.
3. Add environment variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
4. Deploy the service.

Backend example URL:

```
https://your-backend-url.onrender.com
```

---

### Database Deployment (PostgreSQL)

Create a PostgreSQL database using:

- Render PostgreSQL
- Railway
- Supabase

Copy the generated `DATABASE_URL` and set it in the backend environment variables.

---

### Frontend Deployment (GitHub Pages)

1. Push frontend to GitHub.
2. Enable GitHub Pages in repository settings.
3. Set branch to `main` (or `gh-pages`).

Frontend example URL:

```
https://yourname.github.io/project-name/
```

---

## 11. Project Structure

```
AITA-Lab/
│
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── user-dashboard.html
│   ├── admin-dashboard.html
│   ├── css/
│   └── js/
│
├── backend/
│   ├── server.js
│   ├── app.js
│   ├── db.js
│   ├── config/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── middleware/
│   └── .env
|
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

---
