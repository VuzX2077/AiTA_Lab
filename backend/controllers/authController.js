const authService = require("../services/authService");

async function login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    try {
        const result = await authService.login({
            email: email.trim(),
            password
        });

        if (!result.success && result.reason === "invalid_credentials") {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        res.json({ token: result.token, role: result.role });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
}

async function register(req, res) {
    const { email, password, role } = req.body;
    const userRole = role === "admin" ? "admin" : "user";

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    try {
        const result = await authService.register({
            email: email.trim(),
            password,
            role: userRole
        });

        if (!result.success && result.reason === "email_exists") {
            return res.status(409).json({ message: "Email already exists" });
        }

        res.status(201).json(result.user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to register" });
    }
}

module.exports = {
    login,
    register
};