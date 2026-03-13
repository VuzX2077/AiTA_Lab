const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const { runMigrations } = require("./migrations");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const frontendRoot = path.join(__dirname, "..", "frontend");

app.use(express.static(frontendRoot));

const cleanPageRoutes = {
  "/": "pages/public/index.html",
  "/publications": "pages/public/publications.html",
  "/researches": "pages/public/researches.html",
  "/members": "pages/public/members.html",
  "/lectures": "pages/public/lectures.html",
  "/seminars": "pages/public/seminars.html",
  "/archives": "pages/public/archives.html",
  "/contact": "pages/public/contact.html",
  "/login": "pages/auth/login.html",
  "/register": "pages/auth/register.html",
  "/adminDashboard": "pages/admin/adminDashboard.html",
  "/memberDashboard": "pages/member/memberDashboard.html"
};

Object.entries(cleanPageRoutes).forEach(([routePath, relativeFilePath]) => {
  app.get(routePath, (req, res) => {
    res.sendFile(path.join(frontendRoot, relativeFilePath));
  });
});

const legacyRedirectRoutes = {
  "/index.html": "/",
  "/publications.html": "/publications",
  "/researches.html": "/researches",
  "/members.html": "/members",
  "/lectures.html": "/lectures",
  "/seminars.html": "/seminars",
  "/archives.html": "/archives",
  "/contact.html": "/contact",
  "/login.html": "/login",
  "/register.html": "/register",
  "/adminDashboard.html": "/adminDashboard",
  "/userDashboard.html": "/memberDashboard",
  "/memberDashboard.html": "/memberDashboard"
};

Object.entries(legacyRedirectRoutes).forEach(([legacyPath, cleanPath]) => {
  app.get(legacyPath, (req, res) => {
    res.redirect(301, cleanPath);
  });
});

const authRoutes = require("./routes/authRoutes");
const publicationRoutes = require("./routes/publicationRoutes");
const memberRoutes = require("./routes/memberRoutes");
const adminRoutes = require("./routes/adminRoutes");

app.use("/api", authRoutes);
app.use("/api", publicationRoutes);
app.use("/api", memberRoutes);
app.use("/api", adminRoutes);

async function startServer() {
  try {
    await runMigrations();

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
}

startServer();
