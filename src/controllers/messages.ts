import Chat from '../models/Chat.js';
import {
    createChat,
    findChat,
    joinMemsToRoom,
    modifyMemsInfo
} from './chat.js';
import { msgEvents } from '../utils/index.js';
import { socketError } from '../ioInstance/socketError.js';
import { Socket, Server } from 'socket.io';
import { MongooseError, Schema } from 'mongoose';
import Message from '../models/Messages.js';
import User from '../models/Users.js';

const getMessages = (socket: Socket) => {
    socket.on(msgEvents.msgs, async (chatId) => {
        if (!chatId) return;
        try {
            const chatMsgs = await Chat.findOne({
                _id: chatId
            }).populate({
                path: 'messages'
            });
            if (!chatMsgs) return;
            chatMsgs.messages.forEach((msgInfo) => {
                let { info, message, sender, createdAt, _id, updatedAt } =
                    msgInfo as any;

                message = {
                    Id: _id,
                    info,
                    message,
                    sender,
                    createdAt,
                    updatedAt,
                    chatId: chatMsgs._id
                };
                socket.emit(msgEvents.msgs, message);
            });
        } catch (err) {
            const msg = err.message;
            socketError(socket, msgEvents.errMsg, msg);
        }
    });
};

const createNewChatAndMessage = (io: Server, socket: Socket) => {
    try {
        socket.on(msgEvents.newChat, async ({ userId, message }) => {
            if (!message) return;


            const lgUsrId = socket.data.userId;
            if (!lgUsrId && !userId) return;
            const mems = [lgUsrId, userId];
            const createdChat = await createChat(mems);

            if (typeof createdChat !== 'object' || createdChat === undefined) {
                const errMsg = createdChat ?? 'Chat not created';
                socketError(socket, msgEvents.errMsg, errMsg);
                return;
            }
            const chatId = createdChat.chatId;
            const chatMems = createdChat.members;

            chatMems.forEach((mem) => {
                joinMemsToRoom(io, mem, chatId);
            });

            const msgCreated = await Message.create({
                chatId,
                sender: lgUsrId,
                message
            });
            const msgObj = {
                Id: msgCreated._id,
                message: msgCreated.message,
                sender: msgCreated.sender,
                updatedAt: msgCreated.updatedAt,
                createdAt: msgCreated.createdAt,
                chatId: msgCreated.chatId,
                info: msgCreated.info
            };

            const modifiedMems = await modifyMemsInfo(chatId);

            const sockets = await io.of('/').fetchSockets();
            if (Array.isArray(modifiedMems)) {
                modifiedMems.forEach((member) => {
                    for (const sock of sockets) {
                        if (sock.userId === member.userId.toString()) {
                            let newChat = modifiedMems.filter(
                                (mem) => mem.userId.toString() !== sock.userId
                            )[0];

                            newChat = {
                                Id: msgCreated.chatId,
                                ...newChat
                            };
                            sock.emit(msgEvents.newChat, { newChat, msgObj });
                        }
                    }
                });
            } else {
                if (
                    !Array.isArray(modifyMemsInfo) ||
                    modifyMemsInfo === undefined
                ) {
                    const errMsg = modifyMemsInfo ?? 'Members not found';
                    socketError(socket, msgEvents.errMsg, errMsg);
                    return;
                }
            }
            await Chat.findByIdAndUpdate(chatId, {
                $push: { messages: msgCreated._id }
            });
        });
    } catch (err) {
        const msg = err.message;
        socketError(socket, msgEvents.errMsg, msg);
    }
};
/**
 *
 * @param {Server} io
 * @param {Socket} socket
 */
const createMessage = async (io: Server, socket: Socket) => {
    try {
        const lgUsrId = socket.userId;
        socket.on(msgEvents.sndMsg, async ({ message, chatId }) => {
            if (!message) return;
            const fndChat = await findChat(chatId);
            if (typeof fndChat !== 'object' || fndChat === undefined) {
                const errMsg = fndChat ?? 'Chat not found';
                socketError(socket, msgEvents.errMsg, errMsg);
                return;
            }
            // sockets join room when connected and have chat.length > 0
            // sockets join new chat when new chat and message is created
            saveMessageAndSend({ socket, chatId, lgUsrId, message, io });
        });
    } catch (err) {
        const msg = err.message;
        socketError(socket, msgEvents.errMsg, msg);
    }
};

const deleteMessage = async (socket: Socket, io: Server) => {
    try {
        socket.on(msgEvents.delMsg, async (data) => {
            const { msgId, chatId } = data;
            const msgUpdated = await Message.findByIdAndUpdate(
                msgId,
                { info: 'deleted' },
                { new: true }
            );

            if (!msgUpdated) {
                msg = 'No message found! Operation failed';
                return;
            }

            const message = {
                Id: msgId,
                info: msgUpdated.info,
                message:
                    msgUpdated.info !== 'deleted'
                        ? msgUpdated.message
                        : 'this message was deleted',
                sender: msgUpdated.sender,
                createdAt: msgUpdated.createdAt,
                updatedAt: msgUpdated.updatedAt,
                chatId
            };
            if (chatId) {
                io.to(chatId.toString()).emit(msgEvents.delMsg, message);
            }
        });
    } catch (err) {
        const msg = err.message;
        socketError(socket, msgEvents.errMsg, msg);
    }
};

/**
 * @param {Socket} socket
 * @param {Server} io
 */
const updateMessage = (socket: Socket, io: Server) => {
    try {
        socket.on(msgEvents.updateMsg, async (data) => {
            let { msgId, message } = data;
            if (!msgId && !message) return;
            const findMsg = await Message.findByIdAndUpdate(
                msgId,
                { message, info: 'edited' },
                { new: true }
            );
            if (!findMsg) return;
            const chatId = findMsg.chatId;
            message = {
                Id: msgId,
                info: findMsg.info,
                message: findMsg.message,
                sender: findMsg.sender,
                createdAt: findMsg.createdAt,
                updatedAt: findMsg.updatedAt,
                chatId
            };
            if (chatId) {
                io.to(chatId.toString()).emit(msgEvents.updateMsg, message);
            }
        });
    } catch (err) {
        const msg = err.message;
        socketError(socket, msgEvents.errMsg, msg);
    }
};

const replyMessage = (socket: Socket, io: Server) => {
    let message;
    try {
        socket.on(msgEvents.reply, async ({ msgId, chatId, message }) => {
            if (!msgId || !chatId || !message) return;
            const findMsg = await Message.findById(msgId);

            if (!findMsg) {
                message = 'original message not found';
                socketError(socket, msgEvents.errMsg, message);
                return;
            }

            const msgCreated = await Message.create({
                chatId,
                sender: socket.userId,
                message,
                reply: findMsg._id
            });

            const repliedMessage = {
                Id: msgCreated._id,
                message: msgCreated.message,
                sender: msgCreated.sender,
                createdAt: msgCreated.createdAt,
                updatedAt: msgCreated.updatedAt,
                chatId: msgCreated.chatId,
                info: msgCreated.info,
                reply: {
                    Id: findMsg._id,
                    message: findMsg.message,
                    sender: findMsg.sender,
                    info: findMsg.info
                }
            };
            io.to(chatId.toString()).emit(msgEvents.reply, repliedMessage);
        });
    } catch (err) {
        if (err instanceof MongooseError) {
            const message = err.message;
            socketError(socket, msgEvents.errMsg, message);
        }
    }
};

async function saveMessageAndSend({
    socket,
    chatId,
    lgUsrId,
    message,
    io
}: {
    socket: Socket;
    chatId: Schema.Types.ObjectId;
    lgUsrId: Schema.Types.ObjectId;
    message: string;
    io: Server;
}) {
    try {
        const msgObj = {
            chatId,
            sender: lgUsrId,
            message
        };
        const msgCreated = await Message.create(msgObj);
        const messageObj = {
            Id: msgCreated._id,
            message: msgCreated.message,
            sender: msgCreated.sender,
            createdAt: msgCreated.createdAt,
            updatedAt: msgCreated.updatedAt,
            chatId: msgCreated.chatId,
            info: msgCreated.info
        };
        if (chatId) {
            io.to(chatId.toString()).emit(msgEvents.sndMsg, messageObj);
        }
        await Chat.findByIdAndUpdate(chatId, {
            $push: { messages: msgCreated._id }
        });
    } catch (e) {
        const msg = e.message;
        socketError(socket, msgEvents.errMsg, msg);
    }
}

export {
    getMessages,
    createMessage,
    deleteMessage,
    updateMessage,
    createNewChatAndMessage,
    replyMessage
};
