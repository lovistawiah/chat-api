const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/Users");
const Channel = require("../models/Channel");
const { userEvents } = require("../utils/index");
const { getUserNameFromEmail } = require("../utils/user");
const { saveAndGetUserProfileUrl } = require("../utils/modifyProfilePic");
const { Socket, Server } = require("socket.io");

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

        const account = {
            email,
            password,
            username: uniqueUserName,
            avatarUrl: defaultUrl,
        };

        const user = await User.create(account);

        if (!user) {
            message = "account cannot be created, try again later";
            res.status(401).json({ message });
            return;
        }
        message = "account created";
        res.status(200).json({ message });
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
        const token = jwt.sign(
            { userInfo: { userId: user._id, username: user.username } },
            process.env.JWT_SECRET,
            {
                expiresIn: "30d",
            }
        );
        res.status(200).json({ message: "ok", token });
        return;
    } catch (err) {
        message = "Internal Server Error";
        res.status(500).json({ message });
    }
};
// TODO: work on user offline and online status.
// /**
//  *
//  * @param {new Server} io
//  * @param {Socket} socket
//  */
// const userStatus = async (socket) => {
//     const roomName = "Status";
//     try {
//         let status = "Online";
//         if (socket.connected) {
//             const { userId } = socket.decoded;
//             socket.join(roomName);
//             const userFound = await User.findByIdAndUpdate(
//                 userId,
//                 { lastSeen: status },
//                 { new: true }
//             );
//             if (!userFound) return;
//             socket
//                 .to(roomName)
//                 .emit({ userId: userFound._id, status: userFound.lastSeen });
//             return;
//         } else {
//             status = new Date();
//             const { userId } = socket.decoded;
//             socket.join(roomName);
//             const userFound = await User.findByIdAndUpdate(
//                 userId,
//                 { lastSeen: status },
//                 { new: true }
//             );
//             if (!userFound) return;
//             socket
//                 .to(roomName)
//                 .emit({ userId: userFound._id, status: userFound.lastSeen });
//             return;
//         }
//     } catch (error) {}
// };
/**
 *
 * @param {Socket} socket
 */
const typing = (socket) => {
    socket.on(userEvents.typing, async (data) => {
        let receiver;
        const { channelId, userId } = data;
        const channelMembers = await findChannel(channelId);
        if (!channelMembers) return;

        channelMembers.forEach((member) => {
            if (member._id.toString() != socket.userId) {
                receiver = member._id.toString();
            }
        });
        const message = "typing...";
        socket
            .to(receiver)
            .volatile.emit(userEvents.typing, { message, channelId, userId });
    });
};

/**
 * @param {Request} req
 * @param {Response} res
 * @returns {void}
 */
async function updateUserAvatar(req, res) {
    const file = req.file;
    const userId = req.userId;
    const { username } = req.body;
    let message = "";

    if (username) {
        const foundUsername = await User.find({ username });
        if (foundUsername) {
            message = "username already exist";
            res.status(400).json({ message });
            return;
        }
    }
    if (!file) {
        message = "profile pic not selected";
        res.status(400).json({ message });
        return;
    }
    const url = await saveAndGetUserProfileUrl(file, userId);
    if (url instanceof Error) {
        message = url.message;
        res.status(400).json({ message });
        return;
    } else {
        const findUser = await User.findById(userId);
        if (!findUser) {
            message = "user does not exist";
            res.status(400).json({ message });
            return;
        } else {
            findUser.avatarUrl = url;
            await findUser.save();
            message = "profile updated!";
            res.status(200).json({ url });
            return;
        }
    }
}

module.exports = {
    signup,
    login,
    typing,
    userStatus,
    updateUserAvatar,
};
