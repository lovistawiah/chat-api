import { Types } from "mongoose";
import Chat from "../models/Chat.js";
import Message from "../models/Messages.js";
import { replaceMongoIdWithId } from "./general.js";
import { IMessage } from "../decorators/messages.js";


const getChatMessagesById = async (chatId: Types.ObjectId) => {
    const chat = await Chat.findOne({
        _id: chatId
    }).lean().populate({
        path: 'messages',
    });
    if (!chat) return
    return chat.messages
}

const createMessage = async (messageObj: IMessage) => {
    const messageCreated = await Message.create(messageObj)
    if (!messageCreated) return
    const updatedObj = replaceMongoIdWithId(messageCreated)
    return updatedObj
}

const findMessageById = async (messageId: Types.ObjectId) => {
    return await Message.findById(messageId)
}
const updateMessageById = async (messageId: Types.ObjectId, updatesObj: any) => {
    const update = await Message.findByIdAndUpdate(
        messageId,
        updatesObj,
        { new: true }
    ).lean();
    if (!update) return
    const updatedMessage = replaceMongoIdWithId(update)
    return updatedMessage
}
export { getChatMessagesById, createMessage, findMessageById, updateMessageById }