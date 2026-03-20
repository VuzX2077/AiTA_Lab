const memberService = require("../services/memberService");
const userRepository = require("../repositories/userRepository");

async function getPublicMembers(req, res) {
    try {
        const query = typeof req.query.q === "string" ? req.query.q : "";
        const section = typeof req.query.section === "string" ? req.query.section : "";
        const members = await memberService.getPublicMembers({ query, section });
        res.json(members);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to load members" });
    }
}

async function getProfile(req, res) {
    try {
        const profile = await memberService.getProfileByUserId(req.user.id);
        const userInfo = await userRepository.findByIdFull(req.user.id);

        res.json({
            message: "This is protected profile data",
            user: {
                id: req.user.id,
                role: req.user.role,
                email: userInfo?.email || ""
            },
            member: profile
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to load profile" });
    }
}

async function updateProfile(req, res) {
    const { name, bio, photo_asset_id } = req.body;

    if (!name || !String(name).trim()) {
        return res.status(400).json({ message: "Name is required" });
    }

    if (photo_asset_id !== undefined && photo_asset_id !== null && photo_asset_id !== "" && !Number.isInteger(Number(photo_asset_id))) {
        return res.status(400).json({ message: "photo_asset_id must be an integer" });
    }

    try {
        const member = await memberService.updateOwnProfile(req.user.id, {
            name: String(name).trim(),
            bio: bio ? String(bio).trim() : "",
            photo_asset_id: photo_asset_id === undefined || photo_asset_id === null || photo_asset_id === "" ? null : Number(photo_asset_id)
        });

        return res.json({ member });
    } catch (err) {
        if (err && err.code === "23503") {
            return res.status(400).json({ message: "Invalid photo_asset_id" });
        }
        console.error(err);
        return res.status(500).json({ message: "Failed to update profile" });
    }
}

module.exports = {
    getPublicMembers,
    getProfile,
    updateProfile
};
