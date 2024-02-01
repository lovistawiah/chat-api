const { Server } = require("socket.io");
const { authenticateSocket } = require("../Middleware/userAuth");
const { getChats, oldnNewChats, searchChats } = require("../controllers/chat");
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
});

io.on("connection", (socket) => {
    //from controller/messages.js
    createMessage(io, socket);
    getMessages(socket);
    deleteMessage(socket, io);
});
io.on("connection", (socket) => {
    //from controller/chat.js
    getChats(socket);
    searchChats(socket);
    oldnNewChats(socket);
    searchChats(socket);
});

module.exports = io;
