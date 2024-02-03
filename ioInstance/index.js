const { Server } = require("socket.io");
const { authenticateSocket } = require("../Middleware/userAuth");
const {
    getChats,
    searchChats,
    searchNewNOldChats,
    contacts,
} = require("../controllers/chat");
const {
    createMessage,
    getMessages,
    deleteMessage,
    updateMessage,
} = require("../controllers/messages");
const {
    userStatus,
    updateOnlineStatus,
    updateOfflineStatus,
    joinRooms,
} = require("../controllers/userAccount");

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
    userStatus(socket);
    updateOnlineStatus(socket);
    updateOfflineStatus(socket);
    joinRooms(socket);
});

io.on("connection", (socket) => {
    //from controller/messages.js
    createMessage(io, socket);
    getMessages(socket);
    deleteMessage(socket, io);
    updateMessage(socket, io);
});
io.on("connection", (socket) => {
    //from controller/chat.js
    getChats(socket);
    searchChats(socket);
    contacts(socket);
    searchChats(socket);
    searchNewNOldChats(socket);
});

module.exports = io;
