import mongoose, { Schema, Types } from 'mongoose';
import { IChat } from './Chat.js';
export interface IUser {
    _id: Types.ObjectId,
    username: string,
    email: string,
    password: string,
    bio: string,
    avatarUrl: string,
    lastSeen: string,
    keys: {
        privKey: string,
        pubKey: string
    },
    chats: Types.ObjectId[]
    createdAt: number,
    updatedAt: number
}

interface IUserDoc extends IUser {
    chats: Types.DocumentArray<IChat["_id"]>
}
const usrSchema = new Schema<IUserDoc>(
    {
        username: {
            type: String,
            unique: true,
            required: true
        },
        email: {
            type: String,
            required: true,
            unique: true
        },
        password: {
            type: String,
            required: true
        },
        bio: {
            type: String
        },
        avatarUrl: {
            type: String
        },
        lastSeen: {
            type: String
        },
        keys: {
            privKey: String,
            pubKey: String
        },
        chats: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'chat'
            }
        ]
    },
    { timestamps: true }
);
usrSchema.index({ chats: 1, 'chats.messages': -1 });

const User = mongoose.model<IUserDoc>('user', usrSchema);

export default User;

