import mongoose from "mongoose";

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
        chats: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "chat",
            },
        ],
    },
    { timestamps: true }
);
usrSchema.index({ chats: 1, "chats.messages": -1 });

const User = mongoose.model("user", usrSchema);

export default User;
