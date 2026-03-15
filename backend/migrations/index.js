const pool = require("../db");
const createUsersTable = require("./001-create-users-table");
const createMembersTable = require("./002-create-members-table");
const createPublicationsTable = require("./003-create-publications-table");
const extendMembersTable = require("./004-extend-members-table");

const migrations = [
    createUsersTable,
    createMembersTable,
    createPublicationsTable,
    extendMembersTable
];

let didRunMigrations = false;

async function runMigrations() {
    if (didRunMigrations) {
        return;
    }

    for (const migration of migrations) {
        await migration.up(pool);
    }

    didRunMigrations = true;
}

module.exports = {
    runMigrations
};
