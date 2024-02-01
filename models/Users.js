const mongoose = require("mongoose");

const usrSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            unique: true,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
        },
        bio: {
            type: String,
        },
        avatarUrl: {
            type: String,
        },
        lastSeen: {
            type: String,
        },
        keys: {
            privKey: String,
            pubKey: String,
        },
        channels: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "channel",
            },
        ],
    },
    { timestamps: true }
);
userSchema.index({ channels: 1, "channels.messages": -1 });

const User = mongoose.model("user", usrSchema);

module.exports = User;
