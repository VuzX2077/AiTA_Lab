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
- Register account  
- Login  

### Authenticated User
- Logout  
- View protected content  

### Admin
- Create publication  
- Update publication  
- Delete publication  
- Add member  
- Delete member  

---

## 5. Role-Based Access Control (RBAC)

The system supports three access levels:

1. Guest (Unauthenticated user)
   - Can view public content only.
   - Cannot access protected endpoints.

2. User (Authenticated user)
   - Can view protected content.
   - Cannot modify system data.

3. Admin
   - Full access to create, update, and delete system data.

### Access Rules

Access control is enforced using authentication and role-based authorization middleware in the backend.

1. Guest (Unauthenticated)
   - Can access public endpoints only.
   - Cannot access protected routes.
   - Does not have permission to modify any data.

2. User (Authenticated)
   - Must provide a valid JWT token.
   - Can access protected read-only endpoints.
   - Cannot create, update, or delete system data.

3. Admin
   - Must provide a valid JWT token.
   - Has full access to all protected endpoints.
   - Can create, update, and delete publications and members.

All protected routes require authentication.
Role-based middleware ensures that only authorized roles can perform restricted operations.

---

## 6. Database Design

### Users Table
- id (Primary Key)  
- email (unique)  
- password (hashed)  
- role (admin / user)  

### Publications Table
- id (Primary Key)  
- title  
- author  
- year  
- description  

### Members Table
- id (Primary Key)  
- name  
- position  
- bio  

---

## 7. API Endpoints

### Authentication
- `POST /register`
- `POST /login`

### Publications
- `GET /publications`
- `POST /publications` (admin only)
- `DELETE /publications/:id` (admin only)

### Members
- `GET /members`
- `POST /members` (admin only)

---

## 8. Security Mechanism

- Passwords are hashed using **bcrypt** before storing in the database.
- JWT is generated after successful login.
- Protected routes require a valid token.
- Role-based middleware checks user permissions before allowing access.
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
│   ├── db.js
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   ├── config/
│   └── .env
│
├── node_modules/
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

---
