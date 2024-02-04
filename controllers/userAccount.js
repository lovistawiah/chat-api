const bcrypt = require("bcrypt");
const User = require("../models/Users");
const { usrEvents, chatEvents, msgEvents } = require("../utils/index");
const { getUserNameFromEmail, sanitize } = require("../utils/user");
const { Socket } = require("socket.io");
const { createToken } = require("../utils/token");
const Chat = require("../models/Chat");
const { MongooseError } = require("mongoose");
const { socketError } = require("../ioInstance/socketError");

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
        email = sanitize(email);
        if (password !== confirmPassword) {
            message = "passwords do not match";
            res.status(401).json({ message });
            return;
        }
        let uniqueUserName = await getUserNameFromEmail(email);
        if (!uniqueUserName) {
            message = "unknown error, try again!";
            res.status(400).json({ message });
            return;
        }
        const defaultUrl = "https://robohash.org/" + uniqueUserName;
        password = await bcrypt.hash(password, 10);

        const bio = `hey there, I'm on You and I`;
        const account = {
            email: email,
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
        if (err instanceof MongooseError) {
            const message = err.message;
            res.status(StatusCode).json({ message });
        }
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
        let { usernameEmail, password } = req.body;
        if (!usernameEmail || !password) {
            message = "username, email or password required";
            res.status(401).json({ message });
            return;
        }
        usernameEmail = sanitize(usernameEmail);
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

        const userObj = {
            userId: user._id,
            username: user.username,
            bio: user.bio,
            avatarUrl: user.avatarUrl,
        };

        res.status(200).json({ message: "ok", token, userInfo: userObj });
        return;
    } catch (err) {
        if (err instanceof MongooseError) {
            const message = err.message;
            res.status(500).json({ message });
        }
    }
};

/**
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 */
const updateUserInfo = async (req, res) => {
    let { userId, username } = req.body;
    username = sanitize(username);
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
    } catch (err) {
        if (err instanceof MongooseError) {
            const message = err.message;
            res.status(statusCode).json({ message });
        }
    }
};

/**
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 */
const userSettings = async (req, res) => {
    let message = "";
    try {
        let {
            userId,
            newPassword,
            confirmPassword,
            currentPassword,
            username,
            bio,
        } = req.body;
        if (!userId) {
            message = "user details not provided";
            res.status(401).json({ message });
            return;
        }
        if (!currentPassword) {
            message = "current password not provided";
            res.status(401).json({ message });
            return;
        }
        const findUsr = await User.findById(userId);
        if (!findUsr) {
            message = "user not found";
            res.status(401).json({ message });
            return;
        }
        const comparePassword = await bcrypt.compare(
            currentPassword,
            findUsr.password
        );
        if (!comparePassword) {
            message = "incorrect password";
            res.status(401).json({ message });
            return;
        }
        username = sanitize(username);
        const isUsrExist = await User.findOne({ username });
        if (isUsrExist) {
            message = "username is already taken";
            res.status(401).json({ message });
            return;
        }

        findUsr.username = username ? username : findUsr.username;
        findUsr.bio = bio ? bio : findUsr.bio;
        await findUsr.save({ new: true });

        if (
            !newPassword ||
            (!confirmPassword && newPassword !== confirmPassword)
        ) {
            message = "passwords do not match";
            res.status(401).json({ message });
            return;
        } else if (
            confirmPassword.length > 0 &&
            newPassword.length > 0 &&
            newPassword === confirmPassword
        ) {
            const hashedPass = await bcrypt.hash(newPassword, 10);
            findUsr.password = hashedPass;
        } else {
            message = "passwords do not match";
            res.status(401).json({ message });
            return;
        }
        message = "user updated successfully";
        const userInfo = {
            Id: findUsr._id,
            username: findUsr.username,
            bio: findUsr.bio,
        };
        res.status(200).json({ message, userInfo });
        return;
    } catch (err) {
        if (err instanceof MongooseError) {
            message = err.message;
            res.status(500).json({ message });
        }
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

            socket.broadcast.emit(usrEvents.status, {
                userId: findUser._id,
                status: findUser.lastSeen,
            });
        }
    } catch (err) {
        if (err instanceof MongooseError) {
            const message = err.message;
            socketError(socket, msgEvents.errMsg, message);
        }
    }
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
            if (findUser) {
                socket.broadcast.emit(usrEvents.status, {
                    userId: findUser._id,
                    status: findUser.lastSeen,
                });
            }
        });
    } catch (err) {
        if (err instanceof MongooseError) {
            const message = err.message;
            socketError(socket, msgEvents.errMsg, message);
        }
    }
};

/**
 *
 * @param {Socket} socket
 */
const typing = (socket) => {
    socket.on(usrEvents.typing, async (data) => {
        const { chatId } = data;
        if (!chatId) return;
        socket
            .to(chatId.toString())
            .emit(usrEvents.typing, { chatId, typing: "typing..." });
    });
};

/**
 *
 * @param {Socket} socket
 */
const joinRooms = async (socket) => {
    try {
        const userId = socket.decoded.userId;
        const findChats = await Chat.find({ members: { $in: userId } });
        if (findChats && findChats.length > 0) {
            findChats.forEach((chat) => {
                const chatRoom = chat._id.toString();
                joinRoom(chatRoom);
            });
        }
    } catch (err) {
        if (err instanceof MongooseError) {
            const errMsg = err.message;
            socketError(socket, chatEvents.errMsg, errMsg);
        }
    }
};

/**
 *
 * @param {string} chatRoom
 * @param {Socket} socket
 */
const joinRoom = (chatRoom, socket) => {
    try {
        if (chatRoom) {
            socket.join(chatRoom);
        }
    } catch (err) {
        const msg = err.message;
        socketError(socket, msgEvents.errMsg, msg);
    }
};

module.exports = {
    signup,
    login,
    typing,
    updateUserInfo,
    updateOfflineStatus,
    updateOnlineStatus,
    joinRooms,
    joinRoom,
    userSettings,
};
