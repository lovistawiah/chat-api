const { Server } = require("socket.io");
const { authenticateSocket } = require("../Middleware/userAuth");
const {
    getChannels,
    searchChannels,
    friendsInfo,
} = require("../controllers/channel");
const { createMessage, getMessages } = require("../controllers/messages");
const {
    offlineIndicator,
    onlineIndicator,
    userStatus,
} = require("../controllers/userAccount");

const io = new Server({
    cors: {
        origin: [
            "http://localhost:5173",
            "http://172.24.0.1:5173/",
            "http://172.20.10.2:5173/",
        ],
        credentials: true,
    },
});
io.use(authenticateSocket);

io.on("connection", (socket) => {
    socket.userId = socket.decoded.userId;
    userStatus(socket);
    offlineIndicator(io, socket);
    onlineIndicator(socket, io);
});

io.on("connection", (socket) => {
    //from controller/messages.js
    createMessage(io, socket);
    getMessages(socket);
});
io.on("connection", (socket) => {
    //from controller/channel.js
    getChannels(socket);
    searchChannels(socket);
    friendsInfo(socket);
});

module.exports = io;
