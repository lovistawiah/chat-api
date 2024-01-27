const Channel = require("../models/Channel");
const Messages = require("../models/Messages");
const { findOrCreateChannel } = require("./channel");
const { messageEvents } = require("../utils/index");
const { socketError } = require("../ioInstance/socketError");
const { Socket, Server } = require("socket.io");
const { default: mongoose, Types } = require("mongoose");
const { saveFileInBucket } = require("../utils/saveFiles");

/**
 *
 * @param {Socket} socket
 */
const getMessages = (socket) => {
    socket.on(messageEvents.channelMessages, async (channelId) => {
        //using the channelId to retrieve all the messages in a particular channel
        try {
            const channelMessages = await Channel.findOne({
                _id: channelId,
            }).populate({
                path: "messages",
            });
            const messages = [];
            channelMessages.messages.forEach((messageData) => {
                let { isDeleted, message, sender, createdAt, _id } =
                    messageData;

                if (isDeleted) {
                    message = "this message was deleted";
                }
                messages.push({
                    _id,
                    message,
                    sender,
                    createdAt,
                });
            });
            socket.emit(messageEvents.channelMessages, messages);
        } catch (err) {
            const message = err.message;
            socketError(socket, messageEvents.errorMessage, message);
        }
    });
};
/**
 *
 * @param {new Server} io
 * @param {Socket} socket
 */
const createMessage = async (io, socket) => {
    const loggedUserId = socket.decoded.userId;
    socket.on(messageEvents.sendMessage, async ({ message, userId }) => {
        if (!message) return;
        const members = [loggedUserId, userId];
        const channel = await findOrCreateChannel(members);
        if (!channel) return;
        const channelMembers = channel.channelMembers;
        const channelId = channel.channelId;
        const messageReceivers = addMembers(channelMembers);
        if (!messageReceivers) return;
        newMessageAndSend(socket, channelId, loggedUserId, message, io);
    });
};
// TODO: check if socket decoded userId is in channel members for joining the channel
/**
 *
 * @param {[Types.ObjectId]} channelMembers
 * @returns {[string]}
 */
function addMembers(channelMembers) {
    if (!Array.isArray(channelMembers)) return;
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

async function newMessageAndSend(socket, channelId, loggedUserId, message, io) {
    try {
        const messageCreated = await Messages.create({
            channelId,
            sender: loggedUserId,
            message: message.fileType ? message.fileName : message,
        });

        if (message.fileType) {
            const url = await saveFileInBucket({
                arrayBuffer: message.arrayBuffer,
                fileName: message.fileName,
                messageId: messageCreated._id,
                socket: socket,
            });
            messageCreated.message = url;
            await messageCreated.save();
        }
        socket.join(channelId.toString());

        const messageEdited = {
            _id: messageCreated._id,
            message: messageCreated.message,
            sender: messageCreated.sender,
            createdAt: messageCreated.createdAt,
            channelId: messageCreated.channelId,
        };

        io.to(channelId.toString()).emit(
            messageEvents.sendMessage,
            messageEdited
        );

        await Channel.findByIdAndUpdate(channelId, {
            $push: { messages: messageCreated._id },
        });
        socket.leave(channelId.toString());
    } catch (e) {
        const errorMessage = e.message;
        socketError(socket, messageEvents.errorMessage, errorMessage);
    }
}

module.exports = {
    getMessages,
    createMessage,
};
