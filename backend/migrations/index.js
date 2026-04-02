const pool = require("../db");
const createUsersTable = require("./001-create-users-table");
const createImageAssetsTable = require("./005-create-image-assets-table");
const createMembersTable = require("./002-create-members-table");
const createPublicationsTable = require("./003-create-publications-table");
const createSeminarsTable = require("./004-create-seminars-table");
const createHomeNewsTable = require("./006-create-home-news-table");
const createAdminProfileDetailsTable = require("./007-create-admin-profile-details-table");
const createMemberProfileDetailsTable = require("./008-create-member-profile-details-table");
const createLecturersTable = require("./009-create-lecturers-table");

const migrations = [
    createUsersTable,
    createImageAssetsTable,
    createMembersTable,
    createPublicationsTable,
    createSeminarsTable,
    createHomeNewsTable,
    createAdminProfileDetailsTable,
    createMemberProfileDetailsTable,
    createLecturersTable
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
