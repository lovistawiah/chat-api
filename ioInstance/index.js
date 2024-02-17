const { Server } = require("socket.io");
const { authenticateSocket } = require("../Middleware/userAuth");
const { getChats, contacts } = require("../controllers/chat");
const {
    createMessage,
    getMessages,
    deleteMessage,
    updateMessage,
    createNewChatAndMessage,
    replyMessage,
} = require("../controllers/messages");
const {
    updateOnlineStatus,
    updateOfflineStatus,
    joinRooms,
    typing,
    userStatus,
} = require("../controllers/userAccount");

const io = new Server({
    cors: {
        origin: ["http://localhost:5173", "http://172.20.10.2:5173"],
        credentials: true,
    },
});
io.use(authenticateSocket);

io.on("connection", async (socket) => {
    updateOnlineStatus(socket);
    updateOfflineStatus(socket);
    userStatus(socket);
    joinRooms(socket);
    typing(socket);
    socket.on("error", (err) => {
        const msg = err.message;
        socket.emit("error", msg);
        console.log(msg);
    });
});

io.on("connection", (socket) => {
    //from controller/messages.js
    createMessage(io, socket);
    createNewChatAndMessage(io, socket);
    getMessages(socket);
    deleteMessage(socket, io);
    updateMessage(socket, io);
    replyMessage(socket, io);
});
io.on("connection", async (socket) => {
    //from controller/chat.js
    getChats(socket);
    contacts(socket);
});

module.exports = io;
