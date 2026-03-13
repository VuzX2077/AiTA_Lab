const jwt = require("jsonwebtoken");
const userRepository = require("../repositories/userRepository");

// Verify token
async function verifyToken(req, res, next) {
    if (!process.env.JWT_SECRET) {
        return res.status(500).json({ message: "Server auth configuration error" });
    }

    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        return res.status(403).json({ message: "No token provided" });
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ message: "Invalid authorization header format" });
    }

    let decoded;

    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }

    if (!decoded || !decoded.id) {
        return res.status(401).json({ message: "Invalid token payload" });
    }

    try {
        const currentUser = await userRepository.findById(decoded.id);

        if (!currentUser) {
            return res.status(401).json({ message: "User no longer exists" });
        }

        req.user = { id: currentUser.id, role: currentUser.role };
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to verify user session" });
    }
}

// Check role
function authorizeRole(roles) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied" });
        }

        next();
    };
}

module.exports = { verifyToken, authorizeRole };