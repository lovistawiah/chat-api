import { Types } from "mongoose";
import Chat, { IChat, } from "../models/Chat.js";
import User from "../models/Users.js";

const sortChat = (arr: Array<IChat>) => {
    arr.sort((chatA, chatB) => {
        const lastMessageA = chatA.messages[chatA.messages.length - 1];
        const lastMessageB = chatB.messages[chatB.messages.length - 1];
        return (
            new Date(lastMessageB.createdAt).getTime() -
            new Date(lastMessageA.createdAt).getTime()
        );
    });
    return arr
}
const findChatByUserId = async (userId: Types.ObjectId) => {

    const userChats = await Chat.find({
        members: { $in: userId }
    })
        .populate([
            {
                path: 'members',
                model: 'user'
            },
            {
                path: 'messages',
                model: 'message'
            }
        ])
        .select(['username', 'messages']);
    return userChats
}
const findFriendsByUserId = async (userId: Types.ObjectId) => {

    const friends = await User.find({
        _id: { $ne: userId }
    })
        .select(['username', 'avatarUrl', 'bio', 'chats'])
        .sort('asc');
    return friends
}

const findChatByMembers = async (members: Types.ObjectId[]) => {
    const chat = await Chat.findOne({
        members: { $all: members }
    });
    if (chat) {
        return chat

    }
}

const pushMsgIdToChat = async (chatId: Types.ObjectId, messageId: Types.ObjectId) => {
    if (!chatId && !messageId) return
    await Chat.findByIdAndUpdate(chatId, {
        $push: { messages: messageId }
    });

}
export { sortChat, findChatByUserId, findFriendsByUserId, findChatByMembers, pushMsgIdToChat }