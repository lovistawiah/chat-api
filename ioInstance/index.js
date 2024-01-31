const { Server } = require("socket.io");
const { authenticateSocket } = require("../Middleware/userAuth");
const {
    getChannels,
    searchChannels,
    contacts,
    searchChats,
} = require("../controllers/channel");
const { createMessage, getMessages } = require("../controllers/messages");
// FIXME: fix userStatus function
const {
    // userStatus,
} = require("../controllers/userAccount");

const io = new Server({
    cors: {
        origin: ["https://youandi.vercel.app/"],
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
});
io.on("connection", (socket) => {
    //from controller/channel.js
    getChannels(socket);
    searchChannels(socket);
    contacts(socket);
    searchChats(socket);
});

module.exports = io;
