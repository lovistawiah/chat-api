import { Schema, Types, model, } from 'mongoose';
import { IUser, } from './Users.js';
import { IMessageExt } from './Messages.js';

export interface IChat {
    _id: Types.ObjectId,
    chatType: 'private' | 'group',
    avatar: string,
    isBlocked: boolean
    members: Types.Array<Types.ObjectId>,
    messages: Types.Array<IMessageExt>,
    createdAt: number,
    updatedAt: number
}
interface PopulatedMember {
    members: Types.Array<IUser>
}

export type PopulatedChatMembers = PopulatedMember & IChat;



const chatSchema = new Schema<IChat>(
    {
        chatType: {
            type: String,
            enum: ['private', 'group'],
            required: true,
            default: 'private'
        },
        members: [
            {
                type: Schema.Types.ObjectId,
                required: true,
                ref: 'user'
            }
        ],
        avatar: {
            type: String
        },
        isBlocked: {
            type: Boolean,
            default: false
        },
        messages: [
            {
                type: Schema.Types.ObjectId,
                ref: 'message'
            }
        ]
    },
    { timestamps: true }
);


const Chat = model<IChat>('chat', chatSchema);

export default Chat;
