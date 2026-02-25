const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Serve static frontend
app.use(express.static(path.join(__dirname, "frontend")));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});