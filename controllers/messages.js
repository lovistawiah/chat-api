const Channel = require("../models/Channel");
const Messages = require("../models/Messages");
const { findOrCreateChannel } = require("./channel");
const { messageEvents } = require("../utils/index");
const { socketError } = require("../ioInstance/socketError");

const getMessages = (socket) => {
  socket.on(
    messageEvents.displayChannelAllMessages,
    async (channelId, callback) => {
      //using the channelId to retrieve the all the messages in a particular channel
      try {
        const channelMessages = await Channel.findOne({
          _id: channelId,
        }).populate({
          path: "messages",
        });
        const messages = [];
        channelMessages.messages.forEach((messageData) => {
          let { isDeleted, message, sender, createdAt, _id } = messageData;

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

        callback(messages);
      } catch (error) {
        console.log(error);
      }
    }
  );
};

const createMessage = async (io, socket) => {
  const loggedUserId = socket.decoded.userId;
  let messageReceivers = [];
  socket.on(messageEvents.sendMessage, async ({ message, channelId }) => {
    try {
      const channelMembers = await findOrCreateChannel(channelId);
      if (channelMembers instanceof Error) {
        const message = channelMembers.message;
        socketError(socket, messageEvents.errorMessage, message);
      }
      messageReceivers = addMembers(channelMembers);
      newMessageAndSend(
        channelId,
        loggedUserId,
        message,
        messageReceivers,
        socket,
        io
      );
      return;
    } catch (err) {
      console.log(err);
    }
  });
};

// in use when members do not have common channelId
function createNewChannelAndMessage(socket, io) {
  const loggedUserId = socket.decoded.userId;
  let messageReceivers = [];
  socket.on(messageEvents.newChannelMessage, async ({ userId, message }) => {
    // userId is the other user's Id that appears on the page.
    const members = [loggedUserId, userId];

    const { channelId, ChannelMembers } = await findOrCreateChannel(members);
    if (!channelId || !ChannelMembers) {
      return;
    }
    messageReceivers = addMembers(newChannelMembers);
    newMessageAndSend(
      channelId,
      loggedUserId,
      message,
      messageReceivers,
      socket,
      io
    );
    return;
  });
}

function addMembers(channelMembers) {
  const members = channelMembers?.map((channelMember) => {
    const memberId = channelMember._id.toString();
    return memberId;
  });
  return members;
}

async function newMessageAndSend(
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
      io.to(receiver).emit(messageEvents.SingleMessage, messageEdited);
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
  createNewChannelAndMessage,
};
