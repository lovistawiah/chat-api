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

module.exports = { createToken };
