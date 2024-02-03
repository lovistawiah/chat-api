const Chat = require("../models/Chat");
const Messages = require("../models/Messages");
const { createChat, findChat } = require("./chat");
const { msgEvents } = require("../utils/index");
const { socketError } = require("../ioInstance/socketError");
const { Socket, Server } = require("socket.io");
const { default: mongoose, Types } = require("mongoose");
const Message = require("../models/Messages");
const { joinRoom } = require("./userAccount");

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

                if (info == "deleted") {
                    message = "this message was deleted";
                }

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
 * @param {new Server} io
 * @param {Socket} socket
 */
const createMessage = async (io, socket) => {
    try {
        const lgUsrId = socket.decoded.userId;

        socket.on(msgEvents.sndMsg, async ({ message, userId }) => {
            if (!message) return;
            let chatMems;
            let chatId;
            const mems = [lgUsrId, userId];
            const fndChat = await findChat(mems);
            if (fndChat.chatId) {
                chatId = fndChat.chatId;
                chatMems = fndChat.members;
            } else {
                const createdChat = await createChat(mems);
                if (createdChat.chatId) {
                    chatId = createdChat.chatId;
                    chatMems = createdChat.members;
                }
            }
            if (!chatId && !chatMems) return;
            saveMessageAndSend({ socket, chatId, lgUsrId, message, io });
        });
    } catch (err) {
        const msg = err.message;
        socketError(socket, msgEvents.errMsg, msg);
    }
};

/**
 *
 * @param {new Server} io
 * @param {Socket} socket
 */
const deleteMessage = async (socket, io) => {
    const userId = socket.decoded.userId;
    let msg;
    socket.on(msgEvents.deleteMessage, async (data) => {
        const { msgId, chatId } = data;
        const msgUpdated = await Message.findOne({
            _id: msgId,
            chatId,
        });

        if (!msgUpdated) {
            msg = "No message found! Operation failed";
            return;
        }
        msgUpdated.info = "deleted";
        await msgUpdated.save();

        msg = {
            Id: msgId,
            message: "this message was deleted",
            sender: userId,
            createdAt: msgUpdated.updatedAt,
        };

        io.to(chatId.toString()).emit(msgEvents.delMsg, msg);
    });
};

/**
 *
 * @param {Socket} socket
 * @param {mongoose.Types.ObjectId} chatId
 * @param {mongoose.Types.ObjectId} loggedUserId
 * @param {string} message
 *@param {new Server} io
 */

async function saveMessageAndSend({ socket, chatId, lgUsrId, message, io }) {
    try {
        const msgCreated = await Messages.create({
            chatId: chatId,
            sender: lgUsrId,
            message,
        });
        //join room
        joinRoom(chatId.toString(), socket);
        const msgEdited = {
            Id: msgCreated._id,
            message: msgCreated.message,
            sender: msgCreated.sender,
            msgDate: msgCreated.createdAt,
            chatId: msgCreated.chatId,
            info: msgCreated.info,
        };
        io.to(chatId.toString()).emit(msgEvents.sndMsg, msgEdited);

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
};
// send and receive message
// how do i send and receive a message instantly
//  using a common channel that exist between two users
