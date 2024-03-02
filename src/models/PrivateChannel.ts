import mongoose from "mongoose";

const privateChatSchema = new mongoose.Schema(
    {
        members: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'user',
                required: true,
                limit: 2
            }
        ],
        isBlocked: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

module.exports = privateChatSchema;
