const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "..", "frontend")));

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
