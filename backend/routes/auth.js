const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Fake user database (tạm thời)
const users = [
  { id: 1, email: "admin@test.com", password: "123456", role: "admin" },
  { id: 2, email: "user@test.com", password: "123456", role: "user" }
];

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find(
    u => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({ token, role: user.role });
});

module.exports = router;