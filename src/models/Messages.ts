import mongoose, { Schema, model } from 'mongoose';


const messageSchema = new Schema(
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

const Message = model('message', messageSchema);

export default Message;
