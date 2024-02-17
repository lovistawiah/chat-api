const Chat = require("../models/Chat");
const Messages = require("../models/Messages");
const {
    createChat,
    findChat,
    joinMemsToRoom,
    modifyMemsInfo,
} = require("./chat");
const { msgEvents } = require("../utils/index");
const { socketError } = require("../ioInstance/socketError");
const { Socket, Server } = require("socket.io");
const { default: mongoose, MongooseError } = require("mongoose");
const Message = require("../models/Messages");

/**
 *
 * @param {Socket} socket
 */
const getMessages = (socket) => {
    socket.on(msgEvents.msgs, async (chatId) => {
        if (!chatId) return;
        try {
            const chatMsgs = await Chat.findOne({
                _id: chatId,
            }).populate({
                path: "messages",
            });
            chatMsgs.messages.forEach((msgInfo) => {
                let { info, message, sender, createdAt, _id, updatedAt } =
                    msgInfo;

                message = {
                    Id: _id,
                    info,
                    message,
                    sender,
                    createdAt,
                    updatedAt,
                    chatId: chatMsgs._id,
                };
                socket.emit(msgEvents.msgs, message);
            });
        } catch (err) {
            const msg = err.message;
            socketError(socket, msgEvents.errMsg, msg);
        }
    });
};

/**
 *
 * @param {Server} io
 * @param {Socket} socket
 */
const createNewChatAndMessage = (io, socket) => {
    try {
        socket.on(msgEvents.newChat, async ({ userId, message }) => {
            if (!message) return;
            let chatId, chatMems;

            const lgUsrId = socket.userId;
            if (!lgUsrId && !userId) return;
            const mems = [lgUsrId, userId];
            //TODO: avoid duplication chat creation
            //TODO: send the other usrInfo
            const fndChat = await Chat.findOne({ members: { $all: mems } });

            if (fndChat) {
                chatId = fndChat._id;
                chatMems = findChat.members;
            } else {
                const createdChat = await createChat(mems);
                if (
                    typeof createdChat !== "object" ||
                    createdChat === undefined
                ) {
                    const errMsg = createdChat ?? "Chat not created";
                    socketError(socket, msgEvents.errMsg, errMsg);
                    return;
                }
                chatId = createdChat.chatId;
                chatMems = createdChat.members;
            }

            chatMems.forEach((mem) => {
                joinMemsToRoom(io, mem, chatId);
            });

            const msgCreated = await Messages.create({
                chatId: chatId,
                sender: lgUsrId,
                message,
            });
            const msgObj = {
                Id: msgCreated._id,
                message: msgCreated.message,
                sender: msgCreated.sender,
                updatedAt: msgCreated.updatedAt,
                createdAt: msgCreated.createdAt,
                chatId: msgCreated.chatId,
                info: msgCreated.info,
            };

            const modifiedMems = await modifyMemsInfo(chatId);

            const sockets = await io.of("/").fetchSockets();
            if (Array.isArray(modifiedMems)) {
                modifiedMems.forEach((member) => {
                    for (const sock of sockets) {
                        if (sock.userId === member.userId.toString()) {
                            let newChat = modifiedMems.filter(
                                (mem) => mem.userId.toString() !== sock.userId
                            )[0];

                            newChat = {
                                Id: msgCreated.chatId,
                                ...newChat,
                            };

                            console.log(sock.userId, sock.rooms, newChat);
                            sock.emit(msgEvents.newChat, { newChat, msgObj });
                        }
                    }
                });
            } else {
                if (
                    !Array.isArray(modifyMemsInfo) ||
                    modifyMemsInfo === undefined
                ) {
                    const errMsg = modifyMemsInfo ?? "Members not found";
                    socketError(socket, msgEvents.errMsg, errMsg);
                    return;
                }
            }

            await Chat.findByIdAndUpdate(chatId, {
                $push: { messages: msgCreated._id },
            });
        });
    } catch (err) {
        const msg = err.message;
        socketError(socket, msgEvents.errMsg, msg);
    }
};
/**
 *
 * @param {Server} io
 * @param {Socket} socket
 */
const createMessage = async (io, socket) => {
    try {
        const lgUsrId = socket.userId;
        socket.on(msgEvents.sndMsg, async ({ message, chatId }) => {
            if (!message) return;
            const fndChat = await findChat(chatId);
            if (typeof fndChat !== "object" || fndChat === undefined) {
                const errMsg = fndChat ?? "Chat not found";
                socketError(socket, msgEvents.errMsg, errMsg);
                return;
            }
            // sockets join room when connected and have chat.length > 0
            // sockets join new chat when new chat and message is created
            saveMessageAndSend({ socket, chatId, lgUsrId, message, io });
        });
    } catch (err) {
        const msg = err.message;
        socketError(socket, msgEvents.errMsg, msg);
    }
};

/**
 *
 * @param {Server} io
 * @param {Socket} socket
 */
const deleteMessage = async (socket, io) => {
    try {
        socket.on(msgEvents.delMsg, async (data) => {
            const { msgId, chatId } = data;
            const msgUpdated = await Message.findByIdAndUpdate(
                msgId,
                { message: "this message was deleted", info: "deleted" },
                { new: true }
            );

            if (!msgUpdated) {
                msg = "No message found! Operation failed";
                return;
            }

            const message = {
                Id: msgId,
                info: msgUpdated.info,
                message: msgUpdated.message,
                sender: msgUpdated.sender,
                createdAt: msgUpdated.createdAt,
                updatedAt: msgUpdated.updatedAt,
                chatId,
            };
            if (chatId) {
                io.to(chatId.toString()).emit(msgEvents.delMsg, message);
            }
        });
    } catch (err) {
        const msg = err.message;
        socketError(socket, msgEvents.errMsg, msg);
    }
};

/**
 * @param {Socket} socket
 * @param {Server} io
 */
const updateMessage = (socket, io) => {
    try {
        socket.on(msgEvents.updateMsg, async (data) => {
            let { msgId, message } = data;
            if (!msgId && !message) return;
            const findMsg = await Message.findByIdAndUpdate(
                msgId,
                { message, info: "edited" },
                { new: true }
            );
            if (!findMsg) return;
            const chatId = findMsg.chatId;
            message = {
                Id: msgId,
                info: findMsg.info,
                message: findMsg.message,
                sender: findMsg.sender,
                createdAt: findMsg.createdAt,
                updatedAt: findMsg.updatedAt,
                chatId,
            };
            if (chatId) {
                io.to(chatId.toString()).emit(msgEvents.updateMsg, message);
            }
        });
    } catch (err) {
        const msg = err.message;
        socketError(socket, msgEvents.errMsg, msg);
    }
};
/**
 *
 * @param {Socket} socket
 * @param {Server} io
 */
const replyMessage = (socket, io) => {
    try {
        socket.on(msgEvents.reply, async ({ msgId, chatId, message }) => {
            console.log(msgId, chatId, message);
            if (!msgId || !chatId || !message) return;
            const repliedMessage = await Message.create({
                chatId,
                sender: socket.userId,
                message,
                // populate before the message Id in the reply object for sending
                reply: {
                    message: msgId,
                    sender: socket.userId,
                },
            });
            io.to(chatId.toString()).emit(msgEvents.reply, repliedMessage);
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
 * @param {mongoose.Types.ObjectId} chatId
 * @param {mongoose.Types.ObjectId} loggedUserId
 * @param {string} message
 *@param {Server} io
 */

async function saveMessageAndSend({ socket, chatId, lgUsrId, message, io }) {
    try {
        const msgCreated = await Messages.create({
            chatId: chatId,
            sender: lgUsrId,
            message,
        });
        message = {
            Id: msgCreated._id,
            message: msgCreated.message,
            sender: msgCreated.sender,
            createdAt: msgCreated.createdAt,
            updatedAt: msgCreated.updatedAt,
            chatId: msgCreated.chatId,
            info: msgCreated.info,
        };
        if (chatId) {
            io.to(chatId.toString()).emit(msgEvents.sndMsg, message);
        }
        await Chat.findByIdAndUpdate(chatId, {
            $push: { messages: msgCreated._id },
        });
    } catch (e) {
        const msg = e.message;
        socketError(socket, msgEvents.errMsg, msg);
    }
}

module.exports = {
    getMessages,
    createMessage,
    deleteMessage,
    updateMessage,
    createNewChatAndMessage,
    replyMessage,
};
