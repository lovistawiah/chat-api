const mongoose = require("mongoose");
const messageSchema = new mongoose.Schema(
    {
        chatId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "chat",
            required: true,
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        reaction: {
            type: String,
        },
        info: {
            type: String,
            enum: ["created", "edited", "deleted"],
            default: "created",
        },
    },
    { timestamps: true }
);

const Message = mongoose.model("message", messageSchema);

module.exports = Message;
