import { Types } from "mongoose";
import Chat from "../models/Chat.js";
import User from "../models/Users.js";

const sortChat = (arr: Array<any>) => {
    arr.sort((chatA: any, chatB: any) => {
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

const findChatByMembers = async (members: any[]) => {
    const chat = await Chat.findOne({
        members: { $all: members }
    });
    return chat
}

export { sortChat, findChatByUserId, findFriendsByUserId, findChatByMembers }