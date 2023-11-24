const { Server } = require("socket.io");
const { authenticateSocket } = require("../Middleware/userAuth");
const {
  getChannels,
  newChannel
} = require("../controllers/Channel");
const {
  createMessage,
  getMessages,
  createNewChannelMessage,
} = require("../controllers/messages");

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
  socket.join(socket.decoded.userId);
  socket.userId = socket.decoded.userId;
  offlineIndicator(io, socket);
  onlineIndicator(socket, io);
});

io.on("connection", (socket) => {
  //from controller/messages.js
  createMessage(io, socket);
  getMessages(socket);
  createNewChannelMessage(socket, io);
});
io.on("connection", (socket) => {
  //from controller/channel.js
  getChannels(socket);
  newChannel(socket);
  typing(socket);
  askUserStatus(socket);
});

module.exports = io;
