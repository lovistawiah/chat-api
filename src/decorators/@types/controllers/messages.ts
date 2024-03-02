import { ObjectId } from "mongoose"

type MessageData = {
    chatId: ObjectId,
    sender: ObjectId,
    message: string,
    reaction: string,
    info: ["created", "edited", "deleted"],
    createdAt: Date,
    updatedAt: Date
}
export type Message = MessageData & {
    reply?: {
        chatId: ObjectId,
        sender: ObjectId,
        message: string,
        reaction: string,
        info: ["created", "edited", "deleted"],
        createdAt: Date,
        updatedAt: Date
    },

}
