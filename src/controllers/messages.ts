import Chat, { IChat } from '../models/Chat.js';
import {
    createChat,
    findChat,
    joinMemsToRoom,
    modifyMemsInfo
} from './chat.js';
import { msgEvents } from '../utils/index.js';
import { socketError } from '../ioInstance/socketError.js';
import { Socket, Server } from 'socket.io';
import { Types } from 'mongoose';
import { mongooseError } from '../error/mongooseError.js';
import { createMessage, findMessageById, getChatMessagesById, updateMessageById } from '../helper/messages.js';
import { broadcast, filterMembers, filterSocket, replaceMongoIdWithId } from '../helper/general.js';
import { sendToReceiver } from '../helper/socket.js';
import { findChatByMembers, pushMsgIdToChat } from '../helper/chat.js';
import { IMessage } from '../models/Messages.js';

const onGetMessages = (socket: Socket) => {
    socket.on(msgEvents.msgs, async (chatId: Types.ObjectId) => {
        if (!chatId) return;
        try {
            const messages = await getChatMessagesById(chatId)
            if (!messages) return;
            messages.forEach((msgInfo) => {
                const updatedMsgInfo: IMessage = replaceMongoIdWithId(msgInfo)
                updatedMsgInfo.chatId = chatId
                // sendToReceiver(socket, msgEvents.msgs, updatedMsgInfo)
            });
        } catch (err) {
            const msg = mongooseError(err)
            if (!msg) return
            socketError(socket, msgEvents.errMsg, msg);
        }
    });
};

const onNewChat = (io: Server, socket: Socket) => {
    let chatId: Types.ObjectId | undefined
    let chatMembers: Types.Array<Types.ObjectId> | undefined
    try {
        socket.on(msgEvents.newChat, async ({ userId, message }: { userId: Types.ObjectId, message: string | undefined }) => {
            if (!message) return;
            const lgUsrId = socket.data.userId as Types.ObjectId;

            if (!lgUsrId && !userId) return;

            const members = [lgUsrId, userId];
            const findChat = await findChatByMembers(members)

            if (findChat) {
                chatId = findChat.id
                chatMembers = findChat.members
            } else {
                const createdChat = await createChat(members);
                if (typeof createdChat !== 'object' || typeof createdChat === 'string') {
                    const errMsg = createdChat ?? "Internal Server Error"
                    socketError(socket, msgEvents.errMsg, errMsg)
                    return
                }

                chatId = createdChat.chatId
                chatMembers = createdChat.members
            }

            chatMembers?.forEach((mem) => {
                if (!chatId) return
                joinMemsToRoom(io, mem, chatId);
            });
            if (!chatId || !chatMembers) return
            const msgObj: IMessage = {
                chatId,
                sender: lgUsrId,
                message,
                info: 'created'
            }
            const msgCreated = await createMessage(msgObj)
            if (!msgCreated) return
            const modifiedMems = await modifyMemsInfo(chatId);


            if (Array.isArray(modifiedMems)) {
                const filteredSocket = await filterSocket(modifiedMems)

                modifiedMems.forEach((member) => {
                    for (const sock of filteredSocket) {
                        if (sock.data.userId.toString() === member.Id.toString()) {

                            // the co member of the logged in 
                            const coMember = filterMembers(modifiedMems, sock)

                            const newChat = {
                                Id: msgCreated.chatId,
                                ...coMember
                            };

                            sendToReceiver(socket, msgEvents.newChat, { newChat, msgCreated })
                        }
                    }
                });

            } else {
                if (
                    !Array.isArray(modifiedMems) ||
                    modifiedMems === undefined || typeof modifiedMems === "string"
                ) {
                    const errMsg = modifiedMems ?? 'Members not found';
                    socketError(socket, msgEvents.errMsg, errMsg);
                    return;
                }
            }

            await Chat.findByIdAndUpdate(chatId, {
                $push: { messages: msgCreated._id }
            });
        });
    } catch (err) {
        const msg = mongooseError(err)
        if (!msg) return
        socketError(socket, msgEvents.errMsg, msg);
    }
};


const onCreateMessage = async (io: Server, socket: Socket) => {
    try {
        const lgUsrId = socket.data.userId as Types.ObjectId;

        socket.on(msgEvents.sndMsg, async ({ message, chatId }: { message: string, chatId: Types.ObjectId }) => {
            if (!message) return;
            const fndChat = await findChat(chatId);

            if (typeof fndChat !== 'object' || fndChat === undefined) {
                const errMsg = fndChat ?? 'Chat not found';
                socketError(socket, msgEvents.errMsg, errMsg);
                return;
            }

            const msgObj: IMessage = {
                chatId,
                sender: lgUsrId,
                message,
                info: 'created'
            };

            const msgCreated = await createMessage(msgObj)
            broadcast(io, chatId, msgEvents.sndMsg, msgCreated)
            pushMsgIdToChat(chatId, msgCreated?.id)
        });
    } catch (err) {
        const msg = mongooseError(err)
        if (!msg) return
        socketError(socket, msgEvents.errMsg, msg);
    }
};

const onDeleteMessage = async (socket: Socket, io: Server) => {
    let msg;
    try {
        socket.on(msgEvents.delMsg, async (data: { msgId: Types.ObjectId, chatId: Types.ObjectId }) => {
            const { msgId, chatId } = data;
            const updates = { info: 'deleted' }
            const updatedMessage = await updateMessageById(msgId, updates)

            if (!updatedMessage) {
                msg = 'No message found! Operation failed';
                return;
            }

            const message = {
                Id: msgId,
                info: updatedMessage.info,
                message:
                    updatedMessage.info !== 'deleted'
                        ? updatedMessage.message
                        : 'this message was deleted',
                sender: updatedMessage.sender,
                createdAt: updatedMessage.createdAt,
                updatedAt: updatedMessage.updatedAt,
                chatId
            };
            if (chatId) {
                io.to(chatId.toString()).emit(msgEvents.delMsg, message);
            }
        });
    } catch (err) {
        msg = mongooseError(err)
        if (!msg) return
        socketError(socket, msgEvents.errMsg, msg);
    }
};

/**
 * @param {Socket} socket
 * @param {Server} io
 */
const onUpdateMessage = (socket: Socket, io: Server) => {
    try {
        socket.on(msgEvents.updateMsg, async (data) => {
            const { msgId, message } = data;

            if (!msgId && !message) return;

            const msgObj = {
                message,
                info: 'edited'
            }

            const updatedMessage = await updateMessageById(msgId, msgObj)
            broadcast(io, updatedMessage.chatId, msgEvents.updateMsg, updatedMessage)
        });
    } catch (err) {
        const msg = mongooseError(err)
        if (!msg) return
        socketError(socket, msgEvents.errMsg, msg);
    }
};

const onReplyMessage = (socket: Socket, io: Server) => {
    try {
        socket.on(msgEvents.reply, async ({ msgId, chatId, message }: { msgId: Types.ObjectId, chatId: Types.ObjectId, message: string }) => {
            if (!msgId || !chatId || !message) return;

            const foundMsg = await findMessageById(msgId)
            if (!foundMsg) {
                message = 'original message not found';
                socketError(socket, msgEvents.errMsg, message);
                return;
            }

            const msgObj = {
                chatId,
                sender: socket.data.userId,
                message,
                reply: foundMsg._id
            }

            const msgCreated = await createMessage(msgObj)
            const repliedMessage = {
                Id: msgCreated.Id,
                message: msgCreated.message,
                sender: msgCreated.sender,
                createdAt: msgCreated.createdAt,
                updatedAt: msgCreated.updatedAt,
                chatId: msgCreated.chatId,
                info: msgCreated.info,
                reply: {
                    Id: foundMsg._id,
                    message: foundMsg.message,
                    sender: foundMsg.sender,
                    info: foundMsg.info
                }
            };
            broadcast(io, chatId, msgEvents.reply, repliedMessage)
        });
    } catch (err) {
        const msg = mongooseError(err)
        if (!msg) return
        socketError(socket, msgEvents.errMsg, msg);

    }
};

export {
    onGetMessages,
    onCreateMessage,
    onDeleteMessage,
    onUpdateMessage,
    onNewChat,
    onReplyMessage
};
