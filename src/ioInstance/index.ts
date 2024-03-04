import { Server } from 'socket.io';
import { authenticateSocket } from '../Middleware/userAuth.js';
import { getChats, contacts } from '../controllers/chat.js';
import {
    onCreateMessage,
    onDeleteMessage,
    onGetMessages,
    onNewChat,
    onReplyMessage,
    onUpdateMessage
} from '../controllers/messages.js';
import {
    updateOnlineStatus,
    updateOfflineStatus,
    joinRooms,
    typing,
    userStatus
} from '../controllers/userAccount.js';

const io = new Server({
    cors: {
        origin: ['http://localhost:5173', 'http://172.20.10.2:5173'],
        credentials: true
    }
});
io.use(authenticateSocket);

io.on('connection', async (socket) => {
    updateOnlineStatus(socket);
    updateOfflineStatus(socket);
    userStatus(socket);
    joinRooms(socket);
    typing(socket);
    socket.on('error', (err) => {
        const msg = err.message;
        socket.emit('error', msg);
    });
});

io.on('connection', (socket) => {
    // from controller/messages.js
    onCreateMessage(io, socket);
    onNewChat(io, socket);
    onGetMessages(socket);
    onDeleteMessage(socket, io);
    onUpdateMessage(socket, io);
    onReplyMessage(socket, io);
});
io.on('connection', async (socket) => {
    // from controller/chat.js
    getChats(socket);
    contacts(socket);
});

export default io;
