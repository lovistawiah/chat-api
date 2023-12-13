const Channel = require("../models/Channel");
const Messages = require("../models/Messages");
const { findOrCreateChannel } = require("./channel");
const { messageEvents } = require("../utils/index");
const { socketError } = require("../ioInstance/socketError");
const { Server, Socket } = require("socket.io");
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

        newMessageAndSend(
            socket,
            channelId,
            loggedUserId,
            message,
            io
        );
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
//  * @param {[mongoose.Types.ObjectId]} messageReceivers
 *@param {*} io
 */

async function newMessageAndSend(
    socket,
    channelId,
    loggedUserId,
    message,
    io
) {
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
        const { sender, createdAt, _id } = messageCreated;

        // Prepare the message object to send to the channel
        const messageEdited = {
            _id,
            message: messageCreated.message,
            sender,
            messageDate: createdAt,
            channelId,
        };
        // Emit the new message to the channel room
        io.to(channelId.toString()).emit(
            messageEvents.sendMessage,
            messageEdited
        );
        // Update the channel with the new message ID
        await Channel.findByIdAndUpdate(channelId, {
            $push: { messages: _id },
        });
    } catch (e) {
        const errorMessage = e.message;
        console.log(e);
        // Handle the error by sending an error message to the socket
        socketError(socket, messageEvents.errorMessage, errorMessage);
    }
}
module.exports = {
    getMessages,
    createMessage,
};
// TODO: send audio and video message and set url as message.
// TODO: learn status page.
