const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, "frontend")));

// Routes
const authRoutes = require("./backend/routes/auth");
app.use("/api", authRoutes);

const protectedRoutes = require("./backend/routes/protected");
app.use("/api", protectedRoutes);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});