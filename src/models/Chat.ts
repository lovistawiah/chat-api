import mongoose, { Schema, model } from 'mongoose';

const chatSchema = new Schema(
    {
        chatType: {
            type: String,
            enum: ['private', 'group'],
            required: true,
            default: 'private'
        },
        members: [
            {
                type: mongoose.Schema.Types.ObjectId,
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
                type: mongoose.Schema.Types.ObjectId,
                ref: 'message'
            }
        ]
    },
    { timestamps: true }
);
const Chat = model('chat', chatSchema);

export default Chat;
