const Channel = require("../models/Channel");
const Messages = require("../models/Messages");
const { createNewChanel, findChannel } = require("./channel");
const { messageEvents } = require("../utils/index");
const { socketError } = require("../ioInstance/socketError");

const getMessages = (socket) => {
  socket.on(messageEvents.displayChannelMessages, async ({ channelId }) => {
    //using the channelId to retrieve the all the messages in a particular channel
    console.log(channelId);
    // try {
    //   const channelMessages = await Channel.findOne({
    //     _id: channelId,
    //   }).populate({
    //     path: "messages",
    //   });
    //   const messages = [];
    //   channelMessages.messages.forEach((messageData) => {
    //     let { isDeleted, message, sender, createdAt, _id } = messageData;

    //     if (isDeleted) {
    //       message = "this message was deleted";
    //     }
    //     messages.push({
    //       _id,
    //       message,
    //       sender,
    //       createdAt,
    //     });
    //   });

    //   callback(messages);
    // } catch (err) {
    //   const message = err.message;
    //   socketError(socket, messageEvents.errorMessage, message);
    // }
  });
};
// TODO: 1. make  createMessage: accept channelId or other userId
const createMessage = async (io, socket) => {
  const loggedUserId = socket.decoded.userId;
  let messageReceivers = [];
  socket.on(messageEvents.sendMessage, async ({ message, channelId }) => {
    try {
      const channelMembers = await findChannel(channelId);
      if (channelMembers instanceof Error) {
        const message = channelMembers.message;
        socketError(socket, messageEvents.errorMessage, message);
      } else if (channelMembers == undefined) {
        const message = "unknown error";
        socketError(socket, messageEvents.errorMessage, message);
      } else {
        messageReceivers = addMembers(channelMembers);
        newMessageAndSend(
          channelId,
          loggedUserId,
          message,
          messageReceivers,
          socket,
          io
        );
      }
      return;
    } catch (err) {
      const message = err.message;
      socketError(socket, messageEvents.errorMessage, message);
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

    const { channelId, channelMembers } = await createNewChanel(members);
    if (!channelId || !channelMembers) {
      return;
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
  createNewChannelAndMessage
};
