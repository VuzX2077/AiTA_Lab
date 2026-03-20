const pool = require("../db");
const createUsersTable = require("./001-create-users-table");
const createMembersTable = require("./002-create-members-table");
const createPublicationsTable = require("./003-create-publications-table");
const createSeminarsTable = require("./004-create-seminars-table");
const createImageAssetsTable = require("./005-create-image-assets-table");
const linkMembersPhotoToImageAssets = require("./006-link-members-photo-to-image-assets");
const dropMembersPhotoUrl = require("./007-drop-members-photo-url");

const migrations = [
    createUsersTable,
    createMembersTable,
    createPublicationsTable,
    createSeminarsTable,
    createImageAssetsTable,
    linkMembersPhotoToImageAssets,
    dropMembersPhotoUrl
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
