const { Server } = require("socket.io");
const { authenticateSocket } = require("../Middleware/userAuth");
const {
    getChannels,
    searchChannels,
    contacts,
    searchChats,
    joinChannels,
} = require("../controllers/channel");
const {
    createMessage,
    getMessages,
    deleteMessage,
} = require("../controllers/messages");
// FIXME: fix userStatus function
const {
    // userStatus,
} = require("../controllers/userAccount");

const io = new Server({
    cors: {
        origin: ["http://localhost:5173", "http://172.20.10.2:5173"],
        credentials: true,
    },
});
io.use(authenticateSocket);

io.on("connection", async (socket) => {
    socket.userId = socket.decoded.userId;
    // userStatus(socket, io);
});

io.on("connection", (socket) => {
    //from controller/messages.js
    createMessage(io, socket);
    getMessages(socket);
    deleteMessage(socket, io);
});
io.on("connection", (socket) => {
    //from controller/channel.js
    getChannels(socket);
    searchChannels(socket);
    contacts(socket);
    searchChats(socket);
    joinChannels(socket);
});

module.exports = io;
