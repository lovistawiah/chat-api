import { Types } from "mongoose"

export interface IMessage {
    chatId: Types.ObjectId,
    sender: Types.ObjectId,
    message: string,
    reaction?: string,
    info: 'created' | 'edited' | 'deleted',
    reply?: IMessage[],
};
