const Chat = require("../models/Chat");
const Messages = require("../models/Messages");
const { createChat, findChat, joinMemsToRoom } = require("./chat");
const { msgEvents } = require("../utils/index");
const { socketError } = require("../ioInstance/socketError");
const { Socket, Server } = require("socket.io");
const { default: mongoose } = require("mongoose");
const Message = require("../models/Messages");

/**
 *
 * @param {Socket} socket
 */
const getMessages = (socket) => {
    socket.on(msgEvents.msgs, async (chatId) => {
        if (!chatId) return;
        try {
            let msgDate;
            const chatMsgs = await Chat.findOne({
                _id: chatId,
            }).populate({
                path: "messages",
            });
            chatMsgs.messages.forEach((msgInfo) => {
                let { info, message, sender, createdAt, _id, updatedAt } =
                    msgInfo;

                if (createdAt === updatedAt) {
                    msgDate = createdAt;
                } else {
                    msgDate = updatedAt;
                }

                const msg = {
                    Id: _id,
                    info,
                    message,
                    sender,
                    msgDate,
                    chatId: chatMsgs._id,
                };
                socket.emit(msgEvents.msgs, msg);
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
            const lgUsrId = socket.userId;
            if (!lgUsrId && !userId) return;
            const mems = [lgUsrId, userId];

            const createdChat = await createChat(mems);
            if (
                typeof createdChat !== "object" ||
                typeof createdChat === undefined
            ) {
                const errMsg = createdChat ?? "Chat not created";
                socketError(socket, msgEvents.errMsg, errMsg);
                return;
            }
            const chatId = createdChat.chatId;
            const chatMems = createdChat.members;

            chatMems.forEach((mem) => {
                joinMemsToRoom(io, mem, chatId);
            });

            const msgCreated = await Messages.create({
                chatId: chatId,
                sender: lgUsrId,
                message,
            });
            const msgEdited = {
                Id: msgCreated._id,
                message: msgCreated.message,
                sender: msgCreated.sender,
                msgDate: msgCreated.createdAt,
                chatId: msgCreated.chatId,
                info: msgCreated.info,
            };

            if (chatId) {
                io.to(chatId.toString()).emit(msgEvents.newChat, msgEdited);
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
            if (typeof fndChat !== "object" || typeof fndChat === undefined) {
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

            const msg = {
                Id: msgId,
                info: msgUpdated.info,
                message: msgUpdated.message,
                sender: msgUpdated.sender,
                msgDate: msgUpdated.updatedAt,
                chatId,
            };
            if (chatId) {
                io.to(chatId.toString()).emit(msgEvents.delMsg, msg);
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
            const { msgId, message } = data;
            if (!msgId && !message) return;
            const findMsg = await Message.findByIdAndUpdate(
                msgId,
                { message, info: "edited" },
                { new: true }
            );
            if (!findMsg) return;
            const chatId = findMsg.chatId;
            const msg = {
                Id: msgId,
                info: findMsg.info,
                message: findMsg.message,
                sender: findMsg.sender,
                msgDate: findMsg.updatedAt,
                chatId,
            };
            if (chatId) {
                io.to(chatId.toString()).emit(msgEvents.updateMsg, msg);
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
        const msgEdited = {
            Id: msgCreated._id,
            message: msgCreated.message,
            sender: msgCreated.sender,
            msgDate: msgCreated.createdAt,
            chatId: msgCreated.chatId,
            info: msgCreated.info,
        };
        if (chatId) {
            io.to(chatId.toString()).emit(msgEvents.sndMsg, msgEdited);
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
};
