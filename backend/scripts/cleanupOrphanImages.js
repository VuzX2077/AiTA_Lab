require("dotenv").config();

const uploadService = require("../services/uploadService");

async function run() {
    const olderThanHours = Number(process.env.ORPHAN_IMAGE_OLDER_THAN_HOURS || 24);
    const limit = Number(process.env.ORPHAN_IMAGE_CLEANUP_LIMIT || 300);

    const summary = await uploadService.cleanupOrphanedImages({ olderThanHours, limit });

    console.log("Orphan image cleanup summary:");
    console.log(`- olderThanHours: ${summary.olderThanHours}`);
    console.log(`- scanned: ${summary.scanned}`);
    console.log(`- deleted: ${summary.deleted}`);
    console.log(`- skippedInUse: ${summary.skippedInUse}`);
    console.log(`- failed: ${summary.failed}`);
}

run()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Orphan image cleanup failed:", error);
        process.exit(1);
    });
