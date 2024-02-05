const { Socket } = require("socket.io");
const { socketError } = require("../ioInstance/socketError");
const Chat = require("../models/Chat");
const User = require("../models/Users");
const { chatEvents } = require("../utils");
const { MongooseError } = require("mongoose");
/**
 *
 * @param {Socket} socket
 * @returns
 */
const getChats = (socket) => {
    socket.on(chatEvents.chatLastMsg, async () => {
        let msg = "";
        try {
            const userId = socket.userId;
            const userChats = await Chat.find({
                members: { $in: userId },
            })
                .populate([
                    {
                        path: "members",
                        model: "user",
                    },
                    {
                        path: "messages",
                        model: "message",
                    },
                ])
                .select(["username", "messages"]);
            if (userChats.length == 0) {
                msg = "no chat found";
                socket.emit(chatEvents.chatLastMsg, msg);
                return;
            }
            // sorting and return the chat's last message with the latest date
            userChats.sort((chatA, chatB) => {
                const lastMessageA = chatA.messages[chatA.messages.length - 1];
                const lastMessageB = chatB.messages[chatB.messages.length - 1];
                return (
                    new Date(lastMessageB.createdAt) -
                    new Date(lastMessageA.createdAt)
                );
            });
            userChats.forEach((chat) => {
                const { members, messages } = chat;
                const lstMsgInfo = messages.pop();

                members.forEach((member) => {
                    if (member._id.toString() != userId) {
                        const chatInfo = {
                            Id: chat._id,
                            userId: member._id,
                            username: member.username,
                            avatarUrl: member.avatarUrl,
                            lastMessage: lstMsgInfo.message,
                            lstMsgDate: lstMsgInfo.createdAt,
                        };
                        socket.emit(chatEvents.chatLastMsg, chatInfo);
                    }
                });
            });
        } catch (err) {
            if (err instanceof MongooseError) {
                const msg = err.message;
                socketError(socket, chatEvents.errMsg, msg);
            }
        }
    });
};

/**
 *
 * @param {Socket} socket
 */
const contacts = (socket) => {
    socket.on(chatEvents.contacts, async () => {
        try {
            const userId = socket.userId;

            const friends = await User.find({
                _id: { $ne: userId },
            })
                .select(["username", "avatarUrl", "bio", "chats"])
                .sort("asc");

            friends.forEach(async (friend) => {
                const chat = await Chat.findOne({
                    members: { $all: [friend._id, userId] },
                });

                if (chat) {
                    const oldFriend = {
                        _id: friend._id,
                        username: friend.username,
                        avatarUrl: friend.avatarUrl,
                        chatId: chat._id,
                        bio: friend.bio,
                    };

                    socket.emit(chatEvents.contacts, oldFriend);
                } else {
                    const newContact = {
                        _id: friend._id,
                        username: friend.username,
                        avatarUrl: friend.avatarUrl,
                        bio: friend.bio,
                    };

                    socket.emit(chatEvents.contacts, newContact);
                }
            });
        } catch (err) {
            if (err instanceof MongooseError) {
                const msg = err.message;
                socketError(socket, chatEvents.errMsg, msg);
            }
        }
    });
};

/**
 * @param {import("mongoose").ObjectId} chatId
 *
 */
async function findChat(chatId) {
    try {
        const fndChat = await Chat.findById(chatId);
        return {
            chatId: fndChat._id,
            members: fndChat.members,
        };
    } catch (err) {
        if (err instanceof MongooseError) {
            const message = err.message;
            return message;
        }
    }
}

/**
 *
 * @param {[import("mongoose").ObjectId]} members
 *
 */
async function createChat(members) {
    try {
        const createdChat = await Chat.create({ members });
        return {
            chatId: createdChat._id,
            members: createdChat.members,
        };
    } catch (err) {
        if (err instanceof MongooseError) {
            const message = err.message;
            return message;
        }
    }
}
/**
 * Gets the other User Info from a new chat
 *
 * this is sent to client socket as a new chat created
 * @param {import("mongoose").ObjectId} chatId
 * @param {Socket} socket
 * @returns
 */
async function getUsrInfo(chatId, socket) {
    let errMsg;
    try {
        const chat = await Chat.findById(chatId).populate({
            path: "members",
            model: "user",
        });
        if (!chat) {
            errMsg = "Chat not found";
            return errMsg;
        }
        const userId = socket.userId;
        const otherUsr = chat.members.filter(
            (member) => member._id.toString() !== userId
        )[0];

        return {
            Id: chat._id,
            userId: otherUsr._id,
            username: otherUsr.username,
            avatarUrl: otherUsr.avatarUrl,
        };
    } catch (err) {
        if (err instanceof MongooseError) {
            errMsg = err.message;
        }
        return errMsg;
    }
}

/**
 * Retrieve all connected sockets and join members of a chat to the socket room
 *
 * connects to a chatId when socket userId matches a member of chat
 *
 * this makes client members receive new chat and messages instantly
 * @param {Server} io
 * @param {import("mongoose").ObjectId} userId
 * @param {import("mongoose").ObjectId} chatId
 */
const joinMemsToRoom = async (io, userId, chatId) => {
    userId = userId.toString();
    chatId = chatId.toString();
    const sockets = await io.of("/").fetchSockets();
    for (const sock of sockets) {
        if (!sock.rooms.has(chatId)) {
            if (sock.userId === userId) {
                sock.join(chatId);
            }
        }
    }
};

module.exports = {
    getChats,
    searchChats,
    contacts,
    findChat,
    createChat,
    searchNewNOldChats,
    joinMemsToRoom,
    getUsrInfo,
};
