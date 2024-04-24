import bcrypt from 'bcrypt';
import User from '../models/Users.js';
import { usrEvents, chatEvents, msgEvents } from '../utils/index.js';
import { Socket } from 'socket.io';
import { emailExist, getUserNameFromEmail, sanitize } from '../utils/user.js';
import { createToken } from '../utils/token.js';
import Chat from '../models/Chat.js';
import { MongooseError } from 'mongoose';
import { socketError } from '../ioInstance/socketError.js';
import { Request, Response } from 'express';
import { mongooseError } from '../error/mongooseError.js';
import { createUser } from '../helper/userAccount.js';

const signup = async (req: Request, res: Response) => {
    let message = '';
    try {
        let { email, password, confirmPassword } = req.body;
        if (!email || !password || !confirmPassword) {
            message = 'all fields are required';
            res.status(400).json(message);
            return;
        }
        if (password !== confirmPassword) {
            message = 'passwords do not match';
            res.status(401).json(message);
            return;
        }

        const sanitizedEmail = sanitize(email);
        const foundEmail = await emailExist(sanitizedEmail)
        if (foundEmail) {
            message = "email exists"
            res.status(401).json(message)
            return;
        }

        const uniqueUserName = await getUserNameFromEmail(sanitizedEmail);
        if (!uniqueUserName) {
            message = 'unknown error, try again!';
            res.status(400).json(message);
            return;
        }

        const defaultUrl = 'https://robohash.org/' + uniqueUserName;
        password = await bcrypt.hash(password, 10);

        const bio = `hey there, I'm on You and I`;
        const account = {
            email: sanitizedEmail,
            password,
            username: uniqueUserName,
            avatarUrl: defaultUrl,
            bio
        };

        const user = await createUser(account)
        if (!user) {
            message = 'account cannot be created, try again later';
            res.status(401).json(message);
            return;
        }
        const token = createToken({ id: user.id, username: user.username })
        const userInfo = {
            id: user.id,
            username: user.username,
            avatarUrl: user.avatarUrl,
            bio: user.bio
        };
        res.status(200).json({ userInfo, token });
    } catch (err) {
        const message = mongooseError(err)
        if (!message) return
        res.status(500).json(message);

    }
};

const login = async (req: Request, res: Response) => {
    let message = '';
    try {
        let { usernameEmail, password } = req.body;
        if (!usernameEmail || !password) {
            message = 'username, email or password required';
            res.status(401).json(message);
            return;
        }
        usernameEmail = sanitize(usernameEmail);
        const user = await User.findOne({
            $or: [{ username: usernameEmail }, { email: usernameEmail }]
        });
        if (!user) {
            message = `${usernameEmail} does not exist`;
            res.status(401).json(message);
            return;
        }

        const comparePassword = await bcrypt.compare(password, user.password);
        if (!comparePassword) {
            message = 'incorrect password';
            res.status(401).json(message);
            return;
        }
        const userInfo = {
            id: user._id,
            username: user.username
        };
        const token = createToken(userInfo);

        const userObj = {
            id: user.id,
            username: user.username,
            bio: user.bio,
            avatarUrl: user.avatarUrl
        };

        res.status(200).json({ token, userInfo: userObj });
    } catch (err) {
        if (err instanceof MongooseError) {
            const message = err.message;
            res.status(500).json(message);
        }
    }
};

const updateUserName = async (req: Request, res: Response) => {
    let { id, username } = req.body;
    username = sanitize(username);
    try {
        let message = '';
        if (!id) {
            message = 'User not found';
            res.status(304).json(message);
            return;
        }
        if (!username) {
            message = 'username and bio not updated';
            res.status(304).json(message);
            return;
        }
        const updatedUser = await User.findByIdAndUpdate(
            id,
            {
                username
            },
            { new: true }
        );
        if (updatedUser) {
            const userInfo = {
                id: updatedUser._id,
                username: updatedUser.username
            };
            const token = createToken(userInfo);
            message = 'username updated successfully';
            res.status(200).json({ message, userInfo, token });
        }
    } catch (err) {
        if (err instanceof MongooseError) {
            const message = err.message;
            res.status(500).json(message);
        }
    }
};

const userSettings = async (req: Request, res: Response) => {
    let message = '';
    try {
        let {
            id,
            newPassword,
            confirmPassword,
            currentPassword,
            username,
            bio
        } = req.body;
        if (!id) {
            message = 'user details not provided';
            res.status(401).json(message);
            return;
        }
        if (!currentPassword) {
            message = 'current password not provided';
            res.status(401).json(message);
            return;
        }
        const findUsr = await User.findById(id);
        if (!findUsr) {
            message = 'user not found';
            res.status(401).json(message);
            return;
        }
        const comparePassword = await bcrypt.compare(
            currentPassword,
            findUsr.password
        );
        if (!comparePassword) {
            message = 'incorrect password';
            res.status(401).json(message);
            return;
        }
        username = sanitize(username);
        const isUsrExist = await User.findOne({ username });
        if (isUsrExist) {
            message = 'username is already taken';
            res.status(401).json(message);
            return;
        }

        findUsr.username = username || findUsr.username;
        findUsr.bio = bio || findUsr.bio;
        await findUsr.save();

        if (
            !newPassword ||
            (!confirmPassword && newPassword !== confirmPassword)
        ) {
            message = 'passwords do not match';
            res.status(401).json(message);
            return;
        } else if (
            confirmPassword.length > 0 &&
            newPassword.length > 0 &&
            newPassword === confirmPassword
        ) {
            const hashedPass = await bcrypt.hash(newPassword, 10);
            findUsr.password = hashedPass;
        } else {
            message = 'passwords do not match';
            res.status(401).json(message);
            return;
        }
        message = 'user updated successfully';
        const userInfo = {
            id: findUsr._id,
            username: findUsr.username,
            bio: findUsr.bio
        };
        res.status(200).json({ message, userInfo });
    } catch (err) {
        const message = mongooseError(err)
        if (!message) return
        res.status(500).json(message);

    }
};

const userStatus = (socket: Socket) => {
    socket.on(usrEvents.status, async (userId) => {
        const findUser = await User.findById(userId);
        if (!findUser) return;
        const status = findUser.lastSeen;
        socket.emit(usrEvents.status, { userId, status });
    });
};

const updateOnlineStatus = async (socket: Socket) => {
    try {
        const userId = socket.data.userId;
        const status = 'Online';
        if (socket.connected) {
            const findUser = await User.findByIdAndUpdate(
                userId,
                {
                    lastSeen: status
                },
                { new: true }
            );
            if (!findUser) return
            socket.broadcast.emit(usrEvents.status, {
                userId: findUser._id,
                status: findUser.lastSeen
            });
        }
    } catch (err) {
        const message = mongooseError(err)
        if (!message) return
        socketError(socket, msgEvents.errMsg, message);

    }
};

const updateOfflineStatus = async (socket: Socket) => {
    try {
        const userId = socket.data.userId;
        const status = new Date();
        socket.on('disconnecting', async () => {
            const findUser = await User.findByIdAndUpdate(
                userId,
                {
                    lastSeen: status
                },
                { new: true }
            );
            if (findUser) {
                socket.broadcast.emit(usrEvents.status, {
                    userId: findUser._id,
                    status: findUser.lastSeen
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

const typing = (socket: Socket) => {
    socket.on(usrEvents.typing, async (data: { chatId: string | undefined }) => {
        const chatId = data?.chatId
        if (!chatId) return
        socket
            .to(chatId.toString())
            .emit(usrEvents.typing, { chatId, typing: 'typing...' });
    });
};

const joinRooms = async (socket: Socket) => {
    try {
        const userId = socket.data.userId;
        const findChats = await Chat.find({ members: { $in: userId } });

        if (findChats && findChats.length > 0) {
            findChats.forEach((chat) => {
                const chatRoom = chat._id.toString();
                if (!socket.rooms.has(chatRoom)) {
                    socket.join(chatRoom);
                }
            });
        }
    } catch (err) {
        const message = mongooseError(err);
        if (!message) return
        socketError(socket, chatEvents.errMsg, message);

    }
};

export {
    signup,
    login,
    typing,
    updateUserName,
    updateOfflineStatus,
    updateOnlineStatus,
    joinRooms,
    userStatus,
    userSettings
};
