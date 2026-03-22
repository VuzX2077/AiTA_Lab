const pool = require("../db");
const createUsersTable = require("./001-create-users-table");
const createMembersTable = require("./002-create-members-table");
const createPublicationsTable = require("./003-create-publications-table");
const createSeminarsTable = require("./004-create-seminars-table");
const createImageAssetsTable = require("./005-create-image-assets-table");
const createHomeNewsTable = require("./006-create-home-news-table");
const addContentToHomeNewsTable = require("./007-add-content-to-home-news-table");

const migrations = [
    createUsersTable,
    createMembersTable,
    createPublicationsTable,
    createSeminarsTable,
    createImageAssetsTable,
    createHomeNewsTable,
    addContentToHomeNewsTable
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
