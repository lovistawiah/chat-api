const mongoose = require("mongoose");
const {
    decryptMessage,
    encryptMessage,
    generateIV,
    generateKey,
} = require("../utils/encrypt-decrypt");
const key = generateKey();
const iv = generateIV();

const messageSchema = new mongoose.Schema(
    {
        channelId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "channel",
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
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

const Message = mongoose.model("message", messageSchema);

module.exports = Message;
