const memberService = require("../services/memberService");

async function getProfile(req, res) {
    try {
        const profile = await memberService.getProfileByUserId(req.user.id);

        res.json({
            message: "This is protected profile data",
            user: req.user,
            member: profile
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to load profile" });
    }
}

module.exports = {
    getProfile
};