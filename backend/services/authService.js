const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const userRepository = require("../repositories/userRepository");

function isBcryptHash(passwordValue) {
    return typeof passwordValue === "string" && /^\$2[aby]\$\d{2}\$/.test(passwordValue);
}

async function login({ email, password }) {
    const user = await userRepository.findByEmail(email);

    if (!user) {
        return { success: false, reason: "email_not_found" };
    }

    let validPassword = false;

    if (isBcryptHash(user.password)) {
        validPassword = await bcrypt.compare(password, user.password);
    } else {
        validPassword = password === user.password;

        if (validPassword) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await userRepository.updatePasswordById(user.id, hashedPassword);
        }
    }

    if (!validPassword) {
        return { success: false, reason: "password_incorrect" };
    }

    const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

    return {
        success: true,
        token,
        role: user.role
    };
}

async function register({ email, password, role }) {
    const exists = await userRepository.existsByEmail(email);
    if (exists) {
        return { success: false, reason: "email_exists" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await userRepository.createUser({ email, password: hashedPassword, role });

    return {
        success: true,
        user
    };
}

async function changePassword(userId, oldPassword, newPassword) {
    const user = await userRepository.findById(userId);

    if (!user) {
        return { success: false, reason: "user_not_found" };
    }

    const fullUser = await userRepository.findByIdFull(userId);
    if (!fullUser) {
        return { success: false, reason: "user_not_found" };
    }

    let validPassword = false;

    if (isBcryptHash(fullUser.password)) {
        validPassword = await bcrypt.compare(oldPassword, fullUser.password);
    } else {
        validPassword = oldPassword === fullUser.password;
    }

    if (!validPassword) {
        return { success: false, reason: "old_password_incorrect" };
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await userRepository.updatePasswordById(userId, hashedNewPassword);

    return { success: true };
}

module.exports = {
    login,
    register,
    changePassword
};