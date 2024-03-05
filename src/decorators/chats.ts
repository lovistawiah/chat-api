import { Types } from "mongoose"
import { IMessage } from "./messages.js"

export interface IChat {
    chatType: 'private' | 'group',
    members: Types.ObjectId[],
    avatar: string,
    isBlocked: boolean,
    messages: IMessage[]

}