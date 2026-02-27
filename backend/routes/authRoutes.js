const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const pool = require("../db.js");

const router = express.Router();

router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    try {
        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email.trim()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({ token, role: user.role });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

router.post("/register", async (req, res) => {
    const { email, password, role } = req.body;
    const userRole = role === "admin" ? "admin" : "user";

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    try {
        const exists = await pool.query("SELECT id FROM users WHERE email = $1", [email.trim()]);
        if (exists.rows.length > 0) {
            return res.status(409).json({ message: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            "INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role",
            [email.trim(), hashedPassword, userRole]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to register" });
    }
});

module.exports = router;