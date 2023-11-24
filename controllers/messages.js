const Channel = require("../models/Channel");
const Messages = require("../models/Messages");
const { createChannel, findChannel } = require("./Channel");
const { messageEvents } = require("../utils/index");

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
      const channelMembers = await findChannel(channelId);
      if (!channelMembers) return;
      messageReceivers = addMembers(channelMembers);
      newMessage(
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

function createNewChannelMessage(socket, io) {
  const loggedUserId = socket.decoded.userId;
  let messageReceivers = [];
  socket.on(messageEvents.newChannelMessage, async ({ userId, message }) => {
    // userId is the other user's Id that appears on the page.
    const members = [loggedUserId, userId];

    const { channelId, channelMembers } = await createChannel(members);
    if (!channelId || !channelMembers) {
      return;
    }
    messageReceivers = addMembers(channelMembers);
    newMessage(channelId, loggedUserId, message, messageReceivers, socket, io);
    return;
  });
}

function addMembers(channelMembers) {
  const members = channelMembers.map((channelMember) => {
    const memberId = channelMember._id.toString();
    return memberId;
  });
  return members;
}

async function newMessage(
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
    console.log(e);
  }
}

module.exports = {
  getMessages,
  createMessage,
  createNewChannelMessage,
};
