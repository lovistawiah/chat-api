const { Socket } = require("socket.io");
const { socketError } = require("../ioInstance/socketError");
const Chat = require("../models/Chat");
const User = require("../models/Users");
const { chatEvents } = require("../utils");
/**
 *
 * @param {Socket} socket
 * @returns
 */
const getChats = (socket) => {
    socket.on(chatEvents.chatLastMsg, async () => {
        let msg = "";
        try {
            const { userId } = socket.decoded;
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
            message = err.message;
            socketError(socket, chatEvents.errMsg, message);
        }
    });
};

/**
 *
 * @param {Socket} socket
 */
const searchNewNOldChats = (socket) => {
    socket.on(chatEvents.search, async (value) => {
        try {
            const { userId } = socket.decoded;
            if (
                value.includes("+") ||
                value.includes("-") ||
                value.includes("|") ||
                value.includes("\\") ||
                value.includes("=")
            ) {
                return;
            }

            const oldAndNewFriends = await User.find({
                //the $and operator query multiple expressions together
                $and: [
                    { _id: { $ne: userId } }, //$ne - not equal
                    { username: { $regex: value, $options: "i" } },
                ],
            })
                .select(["username", "avatarUrl"])
                .sort("asc");
            // emitting to the old and new chats
            socket.emit(chatEvents.oldnNewChats, oldAndNewFriends);
        } catch (err) {
            const message = err.message;
            socketError(socket, chatEvents.errMsg, message);
        }
    });
};

/**
 *
 * @param {Socket} socket
 */
// get all old and new users except the logged in user.
// if the the other user and the logged in user are in a chat add the chat id to the contact obj
const contacts = (socket) => {
    socket.on(chatEvents.contacts, async () => {
        try {
            const { userId } = socket.decoded;

            const friends = await User.find({
                _id: { $ne: userId },
            })
                .select(["username", "avatarUrl"])
                .sort("asc");

            await Promise.all(
                friends.map(async (friend) => {
                    const chat = await Chat.find({
                        members: { $all: [friend._id, userId] },
                    });

                    if (!chat.length) {
                        const newContact = {
                            _id: friend._id,
                            username: friend.username,
                            avatarUrl: friend.avatarUrl,
                            bio: friend.bio,
                        };
                        socket.emit(chatEvents.contacts, newContact);
                    }

                    if (chat[0]?._id) {
                        const oldFriend = {
                            _id: friend._id,
                            username: friend.username,
                            avatarUrl: friend.avatarUrl,
                            chatId: chat[0]?._id,
                            bio: friend.bio,
                        };
                        socket.emit(chatEvents.contacts, oldFriend);
                    }
                })
            );
        } catch (err) {
            const message = err.message;
            socketError(socket, chatEvents.errMsg, message);
        }
    });
};

/**
 *
 * @param {[import("mongoose").ObjectId]} members
 *
 */
async function findChat(members) {
    try {
        const fndChat = await Chat.findOne({
            members: { $all: members },
        });
        return {
            chatId: fndChat._id,
            members: fndChat.members,
        };
    } catch (err) {
        //
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
        //
    }
}

/**
 * @param {Socket} socket
 */
const searchChats = (socket) => {
    //? the chat with last message
    try {
        const { userId } = socket.decoded;
        socket.on(chatEvents.searchChats, async (value) => {
            if (
                value.includes("+") ||
                value.includes("-") ||
                value.includes("|") ||
                value.includes("\\") ||
                value.includes("=")
            ) {
                return;
            }
            // check chat that belong to the user Id
            const searchedChats = await Chat.find({
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
            let searchResults = [];
            searchedChats?.map((chat) => {
                const otherUser = chat.members.filter(
                    (user) =>
                        user._id !== userId &&
                        user.username.includes(value.trim())
                )[0];

                if (!otherUser) return;

                const lstMsg = chat.messages.pop();
                const chatInfo = {
                    Id: chat._id,
                    userId: otherUser._id,
                    status: otherUser.lastSeen,
                    username: otherUser.username,
                    avatarUrl: otherUser.avatarUrl,
                    lastMessage: lstMsg.message,
                    lstMsgDate: lstMsg.createdAt,
                };
                searchResults.push(chatInfo);
            });
            if (searchResults.length < 1) {
                searchResults = "no chats found";
            }
            socket.emit(chatEvents.chatLastMsg, ...searchResults);
        });
    } catch (err) {
        const msg = err.message;
        socketError(socket, chatEvents.errMsg, msg);
    }
};

module.exports = {
    getChats,
    searchChats,
    contacts,
    findChat,
    createChat,
    searchNewNOldChats,
};
