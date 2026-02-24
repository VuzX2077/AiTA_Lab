AiTA Lab Project
## 1. Project Overview

The system is designed to manage and display information about a research lab, including members, publications, and user authentication with role-based access control.

The main goal of this project is to demonstrate:

 - Client–Server Architecture

 - RESTful API design

 - Authentication and Authorization

 - Role-based Access Control (RBAC)

 - Basic Software Engineering documentation and design principles

## 2. System Architecture

The system follows a 3-tier architecture:

```
Client (Browser)
      ↓
Frontend (HTML, CSS, JavaScript)
      ↓ HTTP Requests
Backend (Node.js + Express)
      ↓
Database (SQLite)
```

## 3. Technology Stack
Frontend:

 - HTML5

 - CSS3

 - JavaScript (Vanilla JS)

 - Fetch API

Backend: 

 - Node.js

 - Express.js

Database:

 - SQLite

Authentication & Security:

 - JWT (JSON Web Token)

 - bcrypt (Password hashing)

Deployment:

 - Frontend: GitHub Pages

 - Backend: Render

## 4. Main Features
Public (Guest):

 - View homepage

 - View publications

 - View members

 - Register account

 - Login

User:

 - Logout

 - View protected content

Admin:

 - Create publication

 - Update publication

 - Delete publication

 - Add member

 - Delete member

## 5. Role-Based Access Control

The system implements two roles:

 - admin

 - user

Access rules:

Only admin can create, update, or delete data.

Normal users can only view data.

Unauthorized access is blocked using middleware in backend.

## 6. Database Design
Users Table:

 - id (Primary Key)

 - username

 - password (hashed)

 - role (admin / user)

Publications Table:

 - id (Primary Key)

 - title

 - author

 - year

 - description

Members Table:

 - id (Primary Key)

 - name

 - position

 - bio

## 7. API Endpoints
Authentication:

 - POST /register

 - POST /login

Publications:

 - GET /publications

 - POST /publications (admin only)

 - DELETE /publications/:id (admin only)

Members:

 - GET /members

 - POST /members (admin only)

## 8. Security Mechanism

Passwords are hashed using bcrypt before storing in the database.

JWT is generated after successful login.

Protected routes require a valid token.

Role-based middleware checks user permissions before allowing access.

## 9. Installation & Setup
1. Clone the repository

git clone <your-repository-url>

2. Install backend dependencies

cd backend
npm install

3. Run backend server

node server.js

Server runs on:
http://localhost:3000

4. Open frontend

Open index.html in browser
or use Live Server extension

## 10. Project Structure

/project-root
```
project-root/
│
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── publications.html
│   └── script.js
│
├── backend/
│   ├── server.js
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   └── database.db
│
└── README.md
```
