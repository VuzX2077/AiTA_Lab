const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "aitalab",
    password: "12345",
    port: 5433,
});

module.exports = pool;