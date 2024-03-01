const User = require("../models/Users");
const { v4: uuid } = require("uuid");
/**
 *
 * @param {string} email
 * @returns
 */
async function getUserNameFromEmail(email) {
    let isUnique = false;
    let message = "";

    if (!email || !email.includes("@")) {
        message = "Email is not accepted";
        return message;
    }

    let username = email.split("@")[0];
    while (!isUnique) {
        const uniqueUserName = await User.findOne({ username });
        if (!uniqueUserName) {
            isUnique = true;
            return username;
        }
        const splitUniqueId = uuid().split("-")[1];
        username += splitUniqueId;
    }
}
/**
 *
 * @param {string} string
 */
function sanitize(string) {
    return string.toLowerCase().trim();
}
module.exports = { getUserNameFromEmail, sanitize };
