const Channel = require("../models/Channel");
const Messages = require("../models/Messages");
const { findOrCreateChannel } = require("./channel");
const { messageEvents } = require("../utils/index");
const { socketError } = require("../ioInstance/socketError");

const getMessages = (socket) => {
    socket.on(messageEvents.displayChannelMessages, async ({ channelId }) => {
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

            socket.emit(messageEvents.displayChannelMessages, messages);
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
        
        newMessageAndSend(
            socket,
            channelId,
            loggedUserId,
            message,
            messageReceivers,
            socket,
            io
        );
    });
};

function addMembers(channelMembers) {
    if (!Array.isArray(channelMembers)) return;
    return channelMembers.map((channelMember) => {
        return channelMember._id.toString();
    });
}

async function newMessageAndSend(
    socket,
    channelId,
    loggedUserId,
    message,
    messageReceivers,
    io
) {
    try {
        const messageCreated = await Messages.create({
            channelId,
            sender: loggedUserId,
            message,
        });

        let { sender, createdAt } = messageCreated;
        const messageEdited = {
            message: messageCreated.message,
            sender,
            messageDate: createdAt,
            channelId,
        };
        messageReceivers.forEach((receiver) => {
            io.to(receiver).emit(messageEvents.sendMessage, messageEdited);
        });
        await Channel.findByIdAndUpdate(channelId, {
            $push: { messages: messageCreated._id },
        });
    } catch (e) {
        const message = e.message;
        socketError(socket, messageEvents.errorMessage, message);
    }
}

module.exports = {
    getMessages,
    createMessage,
};
// TODO: send audio and video message and set url as message.
// TODO: learn status page.
