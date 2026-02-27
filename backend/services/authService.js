const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const pool = require("../db.js");

function isBcryptHash(passwordValue) {
    return typeof passwordValue === "string" && /^\$2[aby]\$\d{2}\$/.test(passwordValue);
}

async function login({ email, password }) {
    const result = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
    );

    if (result.rows.length === 0) {
        return { success: false, reason: "invalid_credentials" };
    }

    const user = result.rows[0];
    let validPassword = false;

    if (isBcryptHash(user.password)) {
        validPassword = await bcrypt.compare(password, user.password);
    } else {
        validPassword = password === user.password;

        if (validPassword) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query(
                "UPDATE users SET password = $1 WHERE id = $2",
                [hashedPassword, user.id]
            );
        }
    }

    if (!validPassword) {
        return { success: false, reason: "invalid_credentials" };
    }

    const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

    return {
        success: true,
        token,
        role: user.role
    };
}

async function register({ email, password, role }) {
    const exists = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (exists.rows.length > 0) {
        return { success: false, reason: "email_exists" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
        "INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role",
        [email, hashedPassword, role]
    );

    return {
        success: true,
        user: result.rows[0]
    };
}

module.exports = {
    login,
    register
};