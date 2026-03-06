const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const frontendRoot = path.join(__dirname, "..", "frontend");

app.use(express.static(frontendRoot));

const pageRoutes = {
  "/": "pages/public/index.html",
  "/index.html": "pages/public/index.html",
  "/publications.html": "pages/public/publications.html",
  "/researches.html": "pages/public/researches.html",
  "/members.html": "pages/public/members.html",
  "/lectures.html": "pages/public/lectures.html",
  "/seminars.html": "pages/public/seminars.html",
  "/archives.html": "pages/public/archives.html",
  "/contact.html": "pages/public/contact.html",
  "/login.html": "pages/auth/login.html",
  "/register.html": "pages/auth/register.html",
  "/adminDashboard.html": "pages/admin/adminDashboard.html",
  "/userDashboard.html": "pages/member/memberDashboard.html",
  "/memberDashboard.html": "pages/member/memberDashboard.html"
};

Object.entries(pageRoutes).forEach(([routePath, relativeFilePath]) => {
  app.get(routePath, (req, res) => {
    res.sendFile(path.join(frontendRoot, relativeFilePath));
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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
