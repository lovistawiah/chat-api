const Channel = require("../models/Channel");
const Messages = require("../models/Messages");
const { findOrCreateChannel } = require("./channel");
const { messageEvents } = require("../utils/index");
const { socketError } = require("../ioInstance/socketError");
const { Socket, Server } = require("socket.io");
const { default: mongoose, Types } = require("mongoose");

/**
 *
 * @param {Socket} socket
 */
const getMessages = (socket) => {
    socket.on(messageEvents.channelMessages, async (channelId) => {
        //using the channelId to retrieve the all the messages in a particular channel
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
        // Create a new message
        const messageCreated = await Messages.create({
            channelId,
            sender: loggedUserId,
            message,
        });

        // Join the socket to the channel room
        socket.join(channelId.toString());
        // Extract necessary information from the created message

        // Prepare the message object to send to the channel
        const messageEdited = {
            _id: messageCreated._id,
            message: messageCreated.message,
            sender: messageCreated.sender,
            createdAt: messageCreated.createdAt,
            channelId: messageCreated.channelId,
        };
        // Emit the new message to the channel room
        io.to(channelId.toString()).emit(
            messageEvents.sendMessage,
            messageEdited
        );

        // Update the channel with the new message ID
        await Channel.findByIdAndUpdate(channelId, {
            $push: { messages: messageCreated._id },
        });
    } catch (e) {
        const errorMessage = e.message;
        // Handle the error by sending an error message to the socket
        socketError(socket, messageEvents.errorMessage, errorMessage);
    }
}

module.exports = {
    getMessages,
    createMessage,
};
