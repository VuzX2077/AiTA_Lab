const path = require("path");
const { Pool } = require("pg");

require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const pool = process.env.DATABASE_URL
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        family: 4, // Use IPv4
    })
    : new Pool({
        user: process.env.DB_USER || "postgres",
        host: process.env.DB_HOST || "localhost",
        database: process.env.DB_NAME || "aitalab",
        password: process.env.DB_PASSWORD || "",
        port: Number(process.env.DB_PORT || 5432),
        family: 4, // Use IPv4
    });

module.exports = pool;
