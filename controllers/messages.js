const Channel = require("../models/Channel");
const Messages = require("../models/Messages");
const { createChannel, findChannel } = require("./channel");
const { msgEvents } = require("../utils/index");
const { socketError } = require("../ioInstance/socketError");
const { Socket, Server } = require("socket.io");
const { default: mongoose, Types } = require("mongoose");
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
            const chatMsgs = await Channel.findOne({
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
                    msgId: _id,
                    info,
                    message,
                    sender,
                    msgDate,
                };
                socket.emit(msgEvents.channelMessages, msg);
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

        socket.on(msgEvents.sndMsg, async ({ msg, userId }) => {
            if (!msg) return;
            let chatMems;
            let chatId;
            const mems = [lgUsrId, userId];

            const fndChat = await findChannel(mems);
            if (fndChat.chatId) {
                chatId = fndChat.chatId;
                chatMems = fndChat.members;
            } else {
                const createdChat = await createChannel(mems);

                if (createdChat.chatId) {
                    chatId = createdChat.chatId;
                    chatMems = createdChat.members;
                }
            }

            const msgReceivers = addMembers(chatMems);
            if (!msgReceivers) return;

            saveMessageAndSend({ socket, chatId, lgUsrId, msg, io });
        });
    } catch (err) {
        const msg = err.message;
        socketError(socket, msgEvents.errMsg, msg);
    }
};

/**
 *
 * @param {new Server()} io
 * @param {Socket} socket
 */
const deleteMessage = async (socket, io) => {
    const userId = socket.decoded.userId;
    let msg;
    socket.on(msgEvents.deleteMessage, async (data) => {
        const { msgId, chatId } = data;
        const msgUpdated = await Message.findOne({
            channelId: chatId,
            _id: msgId,
        });

        if (!msgUpdated) {
            msg = "No message found! Operation failed";
            return;
        }
        msgUpdated.info = "deleted";
        await msgUpdated.save();

        msg = {
            _id: msgId,
            message: "this message was deleted",
            sender: userId,
            createdAt: msgUpdated.updatedAt,
        };
    });
};

/**
 *
 * @param {[Types.ObjectId]} channelMembers
 * @returns {[string]}
 */
function addMembers(channelMembers) {
    return channelMembers.map((channelMember) => {
        return channelMember._id.toString();
    });
}
/**
 *
 * @param {Socket} socket
 * @param {mongoose.Types.ObjectId} channelId
 * @param {mongoose.Types.ObjectId} loggedUserId
 * @param {string} message
 *@param {new Server} io
 */

async function saveMessageAndSend({ socket, chatId, lgUsrId, msg, io }) {
    try {
        const msgCreated = await Messages.create({
            channelId: chatId,
            sender: lgUsrId,
            message: msg,
        });

        const messageEdited = {
            _id: msgCreated._id,
            message: msgCreated.message,
            sender: msgCreated.sender,
            createdAt: msgCreated.createdAt,
            channelId: msgCreated.channelId,
        };

        io.to(chatId.toString()).emit(msgEvents.sndMsg, messageEdited);

        await Channel.findByIdAndUpdate(chatId, {
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
