const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/Users");
const Channel = require("../models/Channel");
const { userEvents } = require("../utils/index");
const { getUserFromEmail } = require("../utils/user");
const { saveAndGetUserProfileUrl } = require("../utils/modifyProfilePic");

// ? signup controller
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
        const uniqueUserName = await getUserFromEmail(email);
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
        message = "ok";
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

async function offlineIndicator(io, socket) {
    const { userId } = socket.decoded;

    socket.on("disconnect", async () => {
        const status = new Date();
        const userFound = await User.findByIdAndUpdate(
            userId,
            { lastSeen: status },
            { new: true }
        );
        if (!userFound) return;

        const channels = await Channel.find({
            members: { $in: userFound._id },
        });
        channels.forEach((channel) => {
            const members = channel.members;
            members.forEach((member) => {
                const memberId = member._id.toString();
                if (memberId != userId) {
                    io.to(memberId).volatile.emit(userEvents.status, {
                        userId,
                        status,
                    });
                }
            });
        });
    });
}

const onlineIndicator = async (socket, io) => {
    const status = "online";
    const { userId } = socket.decoded;
    const userFound = await User.findByIdAndUpdate(
        userId,
        { lastSeen: status },
        { new: true }
    );
    if (!userFound) return;
    const channels = await Channel.find({ members: { $in: userFound._id } });
    channels.forEach((channel) => {
        const members = channel.members;
        members.forEach((member) => {
            const memberId = member._id.toString();
            if (memberId != userId) {
                io.to(memberId).volatile.emit(userEvents.status, {
                    userId,
                    status,
                });
            }
        });
    });
};

const userStatus = (socket) => {
    socket.on(userEvents.status, async (data) => {
        const userId = data;
        const userFound = await User.findById(userId);
        if (!userFound) return;
        const status = userFound.lastSeen;
        socket.emit(userEvents.status, { status, userId });
    });
};

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
 * @returns {Response}
 */
async function updateUserAvatar(req, res) {
    const userId = req.userId;
    let message = "";
    const file = req.file;
    const url = await saveAndGetUserProfileUrl(file, userId);
    if (url instanceof Error) {
        message = url.message;
        res.status(400).json({ message });
    } else {
        const findUser = await User.findById(userId);
        if (!findUser) {
            message = "user does not exist";
            res.status(400).json({ message });
            return;
        } else {
            // the url returns an array of one link,
            const shortUrl = url[0].split("?")[0];
            console.log(shortUrl);
            findUser.avatarUrl = shortUrl;
            await findUser.save();
            message = "profile updated!";
            res.status(200).json({ shortUrl });
            return;
        }
    }
}

module.exports = {
    signup,
    login,
    offlineIndicator,
    onlineIndicator,
    typing,
    userStatus,
    updateUserAvatar,
};
