const jwt = require("jsonwebtoken");

// Verify token
function verifyToken(req, res, next) {
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

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: "Invalid token" });
        }

        if (!decoded || !decoded.id || !decoded.role) {
            return res.status(401).json({ message: "Invalid token payload" });
        }

        req.user = decoded; // { id, role }
        next();
    });
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