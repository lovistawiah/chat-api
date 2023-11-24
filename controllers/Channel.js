const { socketError } = require("../ioInstance/socketError");
const Channel = require("../models/Channel");
const User = require("../models/Users");
const { channelEvents } = require("../utils");

const getChannels = async (socket) => {
  let message = "";
  try {
    const { userId } = socket.decoded;
    const userChannels = await Channel.find({ members: { $in: userId } })
      .populate([
        {
          path: "members",
          model: "user",
        },
        {
          path: "messages",
          model: "message",
        },
      ])
      .select(["username", "messages"]);
    if (userChannels.length == 0) {
      const message = "no channels found";
      socket.emit(channelEvents.channelAndLastMessage, message);
      return;
    }
    // sorting and return the channel's last message with the latest date
    userChannels.sort((channelA, channelB) => {
      const lastMessageA = channelA.messages[channelA.messages.length - 1];
      const lastMessageB = channelB.messages[channelB.messages.length - 1];
      return (
        new Date(lastMessageB.createdAt) - new Date(lastMessageA.createdAt)
      );
    });

    const channelAndLastMessage = userChannels.map((channel) => {
      const { members, messages } = channel;

      return members.map((member) => {
        if (member._id.toString() != userId) {
          const userInfo = {
            userId: member._id,
            username: member.username,
          };

          const channelInfo = {
            channelId: channel._id,
          };

          const lastMessageDetails = messages.pop();
          const messageInfo = {
            // the content of the last message of the channel
            lastMessage: lastMessageDetails.message,
            sender: lastMessageDetails.sender,
            createdAt: lastMessageDetails.createdAt,
          };

          return {
            channelInfo,
            userInfo,
            messageInfo,
          };
        }
      });
    });
    socket.emit(channelEvents.channelAndLastMessage, channelAndLastMessage);
  } catch (err) {
    message = err.message;
    socketError(socket, channelEvents.errorMessage, message);
  }
};

const findOrCreateChannel = async (members) => {
  try {
    const existingChannel = await Channel.findOne({ members: members });

    if (existingChannel) {
      return {
        channelId: existingChannel._id,
        channelMembers: existingChannel.members,
      };
    }
    const createdChannelObj = await createNewChanel(members);
    if(!createdChannelObj) return;
    return {
      channelId: createdChannelObj.channelId,
      channelMembers: createdChannelObj.members,
    };
  } catch (err) {
    const message = err.message;
    return new Error(message);
  }
};

const searchChannels = (socket) => {
  socket.on(channelEvents.search, async (searchValue) => {
    const { userId } = socket.decoded;
    try {
      if (
        searchValue.includes("+") ||
        searchValue.includes("-") ||
        searchValue.includes("|") ||
        searchValue.includes("\\") ||
        searchValue.includes("=")
      ) {
        return;
      }
      const loggedInUser = await User.findById(userId)
        .populate({
          path: "channels",
          populate: { path: "members", model: "user" },
        })
        .select("channels");
      const registeredMembers = [];
      loggedInUser.channels.forEach((channel) => {
        channel.members.forEach((member) => registeredMembers.push(member._id));
      });

      const newFriends = await User.find({
        //the $and operator query multiple expressions together
        $and: [
          { _id: { $ne: userId } }, //$ne - not equal
          { username: { $regex: searchValue, $options: "i" } },
          { _id: { $nin: registeredMembers } }, // $nin - not in specified array
        ],
      }).select("username");
      socket.emit(channelEvents.displayNewChats, newFriends);
    } catch (err) {
      console.log(err);
    }
  });
};

const createNewChanel = async (members) => {
  const newChannel = await Channel.create({ members });
  if (!newChannel) return;

  newChannel.members.forEach(async (member) => {
    await User.findByIdAndUpdate(member._id, {
      $push: { channels: newChannel._id },
    });
  });

  return {
    channelId: newChannel._id,
    members: newChannel.members,
  };
};
module.exports = {
  getChannels,
  findOrCreateChannel,
  searchChannels,
  createNewChanel
};
