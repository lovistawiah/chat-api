const mongoose = require("mongoose")

const groupChannelSchema = new mongoose.Schema({
    channelName: {
        type: String,
        required: true
    }, bio: {
        type: String,
    },
    avatar: {
        type: String,
    },
    admins: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    }],
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    }]

}, { timestamps: true })

module.exports = groupChannelSchema