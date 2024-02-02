const bcrypt = require("bcrypt");
const User = require("../models/Users");
const { userEvents, usrEvents } = require("../utils/index");
const { getUserNameFromEmail } = require("../utils/user");
const { Socket } = require("socket.io");
const { createToken } = require("../utils/token");

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const signup = async (req, res) => {
    let message = "";
    try {
        let { email, password, confirmPassword } = req.body;
        if (!email || !password || !confirmPassword) {
            message = "all fields are required";
            res.status(400).json({ message });
            return;
        }
        if (password !== confirmPassword) {
            message = "passwords do not match";
            res.status(401).json({ message });
            return;
        }
        const uniqueUserName = await getUserNameFromEmail(email);
        if (!uniqueUserName) {
            message = "unknown error, try again!";
            res.status(400).json({ message });
            return;
        }
        const defaultUrl = "https://robohash.org/" + uniqueUserName;
        password = await bcrypt.hash(password, 10);

        const bio = `hey there, I'm on You and I`;
        const account = {
            email,
            password,
            username: uniqueUserName,
            avatarUrl: defaultUrl,
            bio,
        };

        const user = await User.create(account);

        if (!user) {
            message = "account cannot be created, try again later";
            res.status(401).json({ message });
            return;
        }
        message = "account created";
        const userInfo = {
            userId: user._id,
            username: user.username,
            avatarUrl: user.avatarUrl,
            bio: user.bio,
        };
        res.status(200).json({ message, userInfo });
        return;
    } catch (err) {
        let StatusCode = 500;
        message = "Internal Server Error";
        if (err.code == 11000) {
            const errValue = Object.keys(err.keyValue);
            message = `${errValue} already exists`;
            StatusCode = 400;
        }
        res.status(StatusCode).json({ message });
    }
};

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns
 */
const login = async (req, res) => {
    let message = "";
    try {
        const { usernameEmail, password } = req.body;
        if (!usernameEmail || !password) {
            message = "username, email or password required";
            res.status(401).json({ message });
            return;
        }
        const user = await User.findOne({
            $or: [{ username: usernameEmail }, { email: usernameEmail }],
        });
        if (!user) {
            message = `${usernameEmail} does not exist`;
            res.status(401).json({ message });
            return;
        }

        const comparePassword = await bcrypt.compare(password, user.password);
        if (!comparePassword) {
            message = "incorrect password";
            res.status(401).json({ message });
            return;
        }
        const userInfo = {
            userId: user._id,
            username: user.username,
        };
        const token = createToken({ userInfo });
        res.status(200).json({ message: "ok", token });
        return;
    } catch (err) {
        message = "Internal Server Error";
        res.status(500).json({ message });
    }
};

/**
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 */
const updateUserInfo = async (req, res) => {
    const { userId, username } = req.body;
    try {
        let message = "";
        if (!userId) {
            message = "User not found";
            res.status(304).json({ message });
            return;
        }
        if (!username) {
            message = "username and bio not updated";
            res.status(304).json({ message });
            return;
        }
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                username,
            },
            { new: true }
        );
        if (updatedUser) {
            const userInfo = {
                userId: updatedUser._id,
                username: updatedUser.username,
            };
            const token = createToken({ userInfo });
            message = "username updated successfully";
            res.status(200).json({ message, userInfo, token });
        }
    } catch (error) {
        let statusCode = 500;
        message = error.message;
        if (error.code === 11000) {
            message = `${username} already exists`;
            statusCode = 401;
        }
        res.status(statusCode).json({ message });
    }
};

/**
 *
 * @param {Socket} socket
 */
const updateOnlineStatus = async (socket) => {
    try {
        const userId = socket.decoded.userId;
        const status = "Online";
        if (socket.connected) {
            const findUser = await User.findByIdAndUpdate(
                userId,
                {
                    lastSeen: status,
                },
                { new: true }
            );

            socket.emit(usrEvents.status, {
                userId: findUser._id,
                status: findUser.lastSeen,
            });
        }
    } catch (err) {}
};
/**
 *
 * @param {Socket} socket
 */
const updateOfflineStatus = async (socket) => {
    try {
        const userId = socket.decoded.userId;
        const status = new Date();
        socket.on("disconnecting", async () => {
            const findUser = await User.findByIdAndUpdate(
                userId,
                {
                    lastSeen: status,
                },
                { new: true }
            );
            socket.emit(usrEvents.status, {
                userId: findUser._id,
                status: findUser.lastSeen,
            });
        });
    } catch (err) {}
};
/**
 *
 * @param {Socket} socket
 */

const userStatus = (socket) => {
    try {
        socket.on(usrEvents.status, async (data) => {
            const usrId = data;
            if (!usrId) return;
            const findUser = await User.findOne({ _id: usrId });
            socket.emit(usrEvents.status, {
                userId: findUser._id,
                status: findUser.lastSeen,
            });
        });
    } catch (err) {
        const msg = err.message;
        //socketError
    }
};

/**
 *
 * @param {Socket} socket
 */
const typing = (socket) => {
    socket.on(userEvents.typing, async (data) => {
        let receiver;
        const { chatId, userId } = data;
        // const chatMembers = await findChat(chatId);
        if (!chatMembers) return;

        chatMembers.forEach((member) => {
            if (member._id.toString() != socket.userId) {
                receiver = member._id.toString();
            }
        });
        const message = "typing...";
        socket
            .to(receiver)
            .volatile.emit(userEvents.typing, { message, chatId, userId });
    });
};

module.exports = {
    signup,
    login,
    typing,
    userStatus,
    updateUserInfo,
    updateOfflineStatus,
    updateOnlineStatus,
};
