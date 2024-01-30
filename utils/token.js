const jwt = require("jsonwebtoken");
/**
 * the userInfo object accepts **userId**, **username**
 * @param {{}} userInfo
 * @returns {string}
 */
function createToken(userInfo) {
    const token = jwt.sign(userInfo, process.env.JWT_SECRET, {
        expiresIn: "30d",
    });
    return token;
}

function verifyToken(token) {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload) {
        const err = new Error("invalid token");
        return err;
    }
    return payload.userInfo;
}

module.exports = { createToken, verifyToken };
