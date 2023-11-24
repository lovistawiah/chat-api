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
    console.log(message);
  }
};

const createChannel = async (members) => {
  try {
    const createdChannel = await Channel.findOne({ members: members });
    if (createdChannel) {
      return {
        channelId: createdChannel._id,
        channelMembers: createdChannel.members,
      };
    }

    const newChannelCreated = await Channel.create({ members });
    if (!newChannelCreated) return;

    newChannelCreated.members.forEach(async (member) => {
      await User.findByIdAndUpdate(member._id, {
        $push: { channels: newChannelCreated._id },
      });
    });

    return {
      channelId: newChannelCreated._id,
      channelMembers: newChannelCreated.members,
    };
  } catch (err) {
    console.log(err);
  }
};

const findChannel = async (channelId) => {
  try {
    const findChannel = await Channel.findById(channelId);
    if (!findChannel) return;

    return findChannel.members;
  } catch (err) {
    console.log(err);
  }
};

const newChannel = (socket) => {
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
      const loggedUser = await User.findById(userId)
        .populate({
          path: "channels",
          populate: { path: "members", model: "user" },
        })
        .select("channels");
      const loggedInUserMembers = [];
      loggedUser.channels.forEach((channel) => {
        channel.members.forEach((member) =>
          loggedInUserMembers.push(member._id.toString())
        );
      });

      const newFriends = await User.find({
        //the $and operator query multiple expressions together
        $and: [
          { _id: { $ne: userId } }, //$ne - not equal
          { username: { $regex: searchValue, $options: "i" } },
          { _id: { $nin: loggedInUserMembers } }, // $nin - not in specified array
        ],
      }).select("username");
      socket.emit(channelEvents.displayNewChats, newFriends);
    } catch (err) {
      console.log(err);
    }
  });
};

module.exports = {
  newChannel,
  getChannels,
  createChannel,
  findChannel,
};
