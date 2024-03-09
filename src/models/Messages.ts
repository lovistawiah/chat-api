import mongoose, { Schema, Types, model } from 'mongoose';
export interface IMessage {
    _id: Types.ObjectId
    chatId: Types.ObjectId,
    sender: Types.ObjectId,
    message: string,
    reaction: string,
    info: 'created' | 'edited' | 'deleted',
    createdAt: number,
    updatedAt: number
}
export interface IMessageExt extends IMessage {
    reply?: IMessage["_id"]
}

interface IMessageExtDoc extends IMessageExt {
    reply?: IMessage["_id"]

}

const messageSchema = new Schema<IMessageExtDoc>(
    {
        chatId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'chat',
            required: true
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true
        },
        message: {
            type: String,
            required: true
        },
        reaction: {
            type: String
        },
        info: {
            type: String,
            enum: ['created', 'edited', 'deleted'],
            default: 'created'
        },
        reply: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'message'
        }
    },
    { timestamps: true }
);

const Message = model<IMessageExtDoc>('message', messageSchema);

export default Message;
