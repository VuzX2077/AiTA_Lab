const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const { runMigrations } = require("./migrations");

const app = express();
const PORT = process.env.PORT || 3000;

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const frontendRoot = path.join(__dirname, "..", "frontend");

app.use(express.static(frontendRoot));

const cleanPageRoutes = {
  "/": "pages/public/index.html",
  "/news": "pages/public/news.html",
  "/newsDetail": "pages/public/newsDetail.html",
  "/publications": "pages/public/publications.html",
  "/researches": "pages/public/researches.html",
  "/members": "pages/public/members.html",
  "/lectures": "pages/public/lectures.html",
  "/seminars": "pages/public/seminars.html",
  "/archives": "pages/public/archives.html",
  "/contact": "pages/public/contact.html",
  "/memberDetail": "pages/public/memberDetail.html",
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

app.get("/newsDetail/:slug", (req, res) => {
  res.sendFile(path.join(frontendRoot, "pages/public/newsDetail.html"));
});

app.get("/news/:slug", (req, res) => {
  res.redirect(301, `/newsDetail/${encodeURIComponent(req.params.slug)}`);
});

app.get("/member/:id", (req, res) => {
  res.sendFile(path.join(frontendRoot, "pages/public/memberDetail.html"));
});

const legacyRedirectRoutes = {
  "/index.html": "/",
  "/news.html": "/news",
  "/newsDetail.html": "/newsDetail",
  "/publications.html": "/publications",
  "/researches.html": "/researches",
  "/members.html": "/members",
  "/lectures.html": "/lectures",
  "/seminars.html": "/seminars",
  "/archives.html": "/archives",
  "/contact.html": "/contact",
  "/memberDetail.html": "/memberDetail",
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
const seminarRoutes = require("./routes/seminarRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const homeNewsRoutes = require("./routes/homeNewsRoutes");

app.use("/api", authRoutes);
app.use("/api", publicationRoutes);
app.use("/api", memberRoutes);
app.use("/api", adminRoutes);
app.use("/api", seminarRoutes);
app.use("/api", uploadRoutes);
app.use("/api", homeNewsRoutes);

async function startServer() {
  try {
    await runMigrations();

    const server = app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });

    server.on("error", (error) => {
      console.error("HTTP server error:", error);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
}

startServer();
