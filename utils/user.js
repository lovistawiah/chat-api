const User = require("../models/Users");
const { v4: uuid } = require("uuid");

async function getUserNameFromEmail(email) {
    let isUnique = false;
    let message = "";

    if (!email || typeof email !== "string") {
        message = "Email is not accepted";
        return message;
    }

    let username = email.split("@")[0];

    while (!isUnique) {
        const uniqueUserName = await User.findOne({ username }).exec();

        if (!uniqueUserName) {
            isUnique = true;
            return username;
        }

        const splitUniqueId = uuid().split("-")[1];
        username += splitUniqueId;
    }
}

module.exports = { getUserNameFromEmail };
