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

        if (!result.success) {
            if (result.reason === "email_not_found") {
                return res.status(401).json({ message: "Email not found" });
            }
            if (result.reason === "password_incorrect") {
                return res.status(401).json({ message: "Password is incorrect" });
            }
            return res.status(401).json({ message: "Login failed" });
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

async function changePassword(req, res) {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: "Old password and new password are required" });
    }

    if (oldPassword === newPassword) {
        return res.status(400).json({ message: "New password must be different from old password" });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    try {
        const result = await authService.changePassword(userId, oldPassword, newPassword);

        if (!result.success) {
            if (result.reason === "old_password_incorrect") {
                return res.status(400).json({ message: "Old password is incorrect" });
            }
            if (result.reason === "user_not_found") {
                return res.status(404).json({ message: "User not found" });
            }
            return res.status(500).json({ message: "Failed to change password" });
        }

        res.json({ message: "Password changed successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
}

module.exports = {
    login,
    register,
    changePassword
};