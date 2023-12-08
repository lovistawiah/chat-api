const { Socket} = require("socket.io");
const { socketError } = require("../ioInstance/socketError");
const Channel = require("../models/Channel");
const User = require("../models/Users");
const { channelEvents } = require("../utils");
/**
 *
 * @param {Socket} socket
 * @returns
 */
const getChannels = async (socket) => {
    const channelAndLastMessage = [];
    let message = "";
    try {
        const { userId } = socket.decoded;
        console.log(userId);
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
            const lastMessageA =
                channelA.messages[channelA.messages.length - 1];
            const lastMessageB =
                channelB.messages[channelB.messages.length - 1];
            return (
                new Date(lastMessageB.createdAt) -
                new Date(lastMessageA.createdAt)
            );
        });

        userChannels.map((channel) => {
            const { members, messages } = channel;

            members.forEach((member) => {
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
                    channelAndLastMessage.push({
                        channelInfo,
                        userInfo,
                        messageInfo,
                    });
                }
            });
        });
        if (channelAndLastMessage) {
            socket.emit(
                channelEvents.channelAndLastMessage,
                channelAndLastMessage
            );
        }
    } catch (err) {
        message = err.message;
        console.log(message);
        socketError(socket, channelEvents.errorMessage, message);
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

            const oldAndNewFriends = await User.find({
                //the $and operator query multiple expressions together
                $and: [
                    { _id: { $ne: userId } }, //$ne - not equal
                    { username: { $regex: searchValue, $options: "i" } },
                ],
            })
                .select(["username", "avatarUrl"])
                .sort("asc");
            socket.emit(channelEvents.contacts, oldAndNewFriends);
        } catch (err) {
            const message = err.message;
            socketError(socket, channelEvents.errorMessage, message);
        }
    });
};

const friendsInfo = async (socket) => {
    const { userId } = socket.decoded;

    try {
        const friends = await User.find({
            _id: { $ne: userId }, //$ne - not equal
        })
            .select(["username", "avatarUrl"])
            .sort("asc");
        socket.emit(channelEvents.contacts, friends);
    } catch (err) {
        const message = err.message;
        socketError(socket, channelEvents.errorMessage, message);
    }
};

const findOrCreateChannel = async (members) => {
    const findChannel = await Channel.findOne({ members: members });
    if (findChannel) {
        return {
            channelId: findChannel._id,
            channelMembers: findChannel.members,
        };
    } else {
        const newChannel = await Channel.create({ members });
        if (!newChannel) return;
        newChannel.members.forEach(async (member) => {
            await User.findByIdAndUpdate(member._id, {
                $push: { channels: newChannel._id },
            });
        });
        return {
            channelId: newChannel._id,
            channelMembers: newChannel.members,
        };
    }
};
module.exports = {
    getChannels,
    searchChannels,
    friendsInfo,
    findOrCreateChannel,
};
