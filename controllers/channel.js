const { Socket } = require("socket.io");
const { socketError } = require("../ioInstance/socketError");
const Channel = require("../models/Channel");
const User = require("../models/Users");
const { channelEvents } = require("../utils");
/**
 *
 * @param {Socket} socket
 * @returns
 */
const getChannels = (socket) => {
    socket.on(channelEvents.channelAndLastMessage, async () => {
        const channelAndLastMessage = [];
        let message = "";
        try {
            const { userId } = socket.decoded;
            const userChannels = await Channel.find({
                members: { $in: userId },
            })
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

            userChannels.forEach((channel) => {
                const { members, messages } = channel;
                const lastMsgInfo = messages.pop();

                members.forEach((member) => {
                    if (member._id.toString() != userId) {
                        const info = {
                            channelId: channel._id,
                            userId: member._id,
                            username: member.username,
                            avatarUrl: member.avatarUrl,
                            lastMessage: lastMsgInfo.message,
                            createdAt: lastMsgInfo.createdAt,
                        };

                        channelAndLastMessage.push(info);
                    }
                });
            });
            socket.emit(
                channelEvents.channelAndLastMessage,
                channelAndLastMessage
            );
        } catch (err) {
            message = err.message;
            socketError(socket, channelEvents.errorMessage, message);
        }
    });
};

/**
 *
 * @param {Socket} socket
 */
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
            socket.emit(channelEvents.search, oldAndNewFriends);
        } catch (err) {
            const message = err.message;
            socketError(socket, channelEvents.errorMessage, message);
        }
    });
};

/**
 *
 * @param {Socket} socket
 */
// get all old and new users except the logged in user.
// if the the other user and the logged in user are in a channel add the channel id to the contact obj
const contacts = (socket) => {
    socket.on(channelEvents.contacts, async () => {
        try {
            const { userId } = socket.decoded;
            const contacts = [];
            const friends = await User.find({
                _id: { $ne: userId },
            })
                .select(["username", "avatarUrl"])
                .sort("asc");

            await Promise.all(
                friends.map(async (friend) => {
                    const channel = await Channel.find({
                        members: { $all: [friend._id, userId] },
                    });

                    if (!channel.length) {
                        contacts.push(friend);
                    }
                    if (channel[0]?._id) {
                        contacts.push({
                            _id: friend._id,
                            username: friend.username,
                            avatarUrl: friend.avatarUrl,
                            channelId: channel[0]?._id,
                        });
                    }
                })
            );

            socket.emit(channelEvents.contacts, contacts);
        } catch (err) {
            const message = err.message;
            socketError(socket, channelEvents.errorMessage, message);
        }
    });
};

/**
 *
 * @param {[import("mongoose").ObjectId]} members
 *
 */
const findOrCreateChannel = async (members) => {
    const findChannel = await Channel.findOne({ members: { $all: members } });
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
async function findChannel(members) {
    try {
        const foundChannel = await Channel.findOne({
            members: { $all: members },
        });
        if (foundChannel) {
            return {
                channelId: foundChannel._id,
                members: foundChannel.members,
            };
        }
        return "channels not found";
    } catch (err) {
        const message = err.message;
    }
}

async function createNewChannel(members) {
    try {
        const createdChannel = await Channel.create(members);
        if (!createdChannel) return "channel not created";
        return {
            channelId: createdChannel._id,
            members: createdChannel.members,
        };
    } catch (err) {
        const message = err.message;
        return message;
    }
}

/**
 * @param {Socket} socket
 */
const searchChats = (socket) => {
    const { userId } = socket.decoded;
    try {
        socket.on(channelEvents.searchChats, async (searchValue) => {
            if (
                searchValue.includes("+") ||
                searchValue.includes("-") ||
                searchValue.includes("|") ||
                searchValue.includes("\\") ||
                searchValue.includes("=")
            ) {
                return;
            }
            // check channels that belong to the user Id
            const searchChannels = await Channel.find({
                members: { $in: userId },
            })
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
            let searchResults = [];
            searchChannels?.map((channel) => {
                const otherUser = channel.members.filter(
                    (user) =>
                        user._id !== userId &&
                        user.username.includes(searchValue.trim())
                )[0];
                if (!otherUser) return;
                const lastMessage = channel.messages.pop();
                const channelInfo = {
                    channelId: channel._id,
                };
                const messageInfo = {
                    lastMessage: lastMessage.message,
                    sender: lastMessage.sender,
                    createdAt: lastMessage.createdAt,
                };
                const userInfo = {
                    userId: otherUser._id,
                    username: otherUser.username,
                    avatarUrl: otherUser.avatarUrl,
                };
                searchResults.push({
                    channelInfo,
                    messageInfo,
                    userInfo,
                });
            });
            if (searchResults.length < 1) {
                searchResults = "no chats found";
            }
            socket.emit(channelEvents.channelAndLastMessage, searchResults);
        });
    } catch (error) {
        socketError(socket, channelEvents.errorMessage, error.message);
    }
};
module.exports = {
    getChannels,
    searchChannels,
    contacts,
    searchChats,
    findOrCreateChannel,
};
