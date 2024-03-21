import { Server, Socket } from 'socket.io';
import { socketError } from '../ioInstance/socketError.js';
import Chat, { PopulatedChatMembers } from '../models/Chat.js';
import User from '../models/Users.js';
import { chatEvents } from '../utils/index.js';
import { findChatByMembers, findChatByUserId, findFriendsByUserId, sortChat } from '../helper/chat.js';
import { sendToReceiver } from '../helper/socket.js';
import { MongooseError, Types } from 'mongoose';

const getChats = (socket: Socket) => {
    socket.on(chatEvents.chatLastMsg, async () => {
        let msg = '';
        try {
            const userId = socket.data.userId as Types.ObjectId;
            const userChats = await findChatByUserId(userId)

            if (userChats.length === 0) {
                msg = 'no chat found';
                sendToReceiver(socket, chatEvents.errMsg, msg)
                return;
            }

            const sortedChat = sortChat(userChats)
            sortedChat.forEach((chat) => {
                const { members, messages } = chat as PopulatedChatMembers;
                const lstMsgInfo = messages.pop();

                members.forEach((member) => {
                    if (member._id.toString() !== userId.toString()) {
                        const chatInfo = {
                            id: chat._id,
                            userId: member._id,
                            username: member.username,
                            avatarUrl: member.avatarUrl,
                            lastMessage: lstMsgInfo?.message,
                            lstMsgDate: lstMsgInfo?.createdAt,
                            reply: {
                                id: lstMsgInfo?.reply?._id,
                                message: lstMsgInfo?.reply?.message,
                                sender: lstMsgInfo?.reply?.sender,
                                updated: lstMsgInfo?.reply?.updatedAt
                            }
                        };
                        sendToReceiver(socket, chatEvents.chatLastMsg, chatInfo)
                    }
                });
            });
        } catch (err) {
            if (err instanceof MongooseError) {
                const msg = err.message;
                socketError(socket, chatEvents.errMsg, msg);
            }
        }
    });
};

const contacts = (socket: Socket) => {
    socket.on(chatEvents.contacts, async () => {
        try {
            const userId = socket.data.userId as Types.ObjectId;
            const friends = await findFriendsByUserId(userId)
            friends.forEach(async (friend) => {

                const members = [friend._id, userId]
                const chat = await findChatByMembers(members)

                if (chat) {
                    const oldFriend = {
                        id: friend._id,
                        username: friend.username,
                        avatarUrl: friend.avatarUrl,
                        chatId: chat._id,
                        bio: friend.bio
                    };

                    sendToReceiver(socket, chatEvents.contacts, oldFriend)
                } else {
                    const newContact = {
                        id: friend._id,
                        username: friend.username,
                        avatarUrl: friend.avatarUrl,
                        bio: friend.bio
                    };
                    sendToReceiver(socket, chatEvents.contacts, newContact)
                }
            });
        } catch (err) {
            if (err instanceof MongooseError) {
                const msg = err.message;
                socketError(socket, chatEvents.errMsg, msg);
            }
        }
    });
};

async function findChat(chatId: Types.ObjectId) {
    try {
        const fndChat = await Chat.findById(chatId);
        if (!fndChat) return;
        return {
            chatId: fndChat._id,
            members: fndChat.members
        };
    } catch (err) {
        if (err instanceof MongooseError) {
            const message = err.message;
            return message;
        }
    }
}

async function createChat(members: Types.ObjectId[]) {
    try {
        const createdChat = await Chat.create({ members });
        if (!createdChat) return
        return {
            chatId: createdChat._id,
            members: createdChat.members
        };
    } catch (err) {
        if (err instanceof MongooseError) {
            const message = err.message;
            return message;
        }
    }
}

async function addChatIdToUsers(
    chatId: Types.ObjectId,
    memberId: Types.ObjectId
) {
    await User.findByIdAndUpdate(memberId, { $push: { chats: chatId } });
}

async function modifyMemsInfo(chatId: Types.ObjectId) {
    let errMsg;
    try {
        const chat = await Chat.findById(chatId)
            .populate({
                path: 'members',
                model: 'user'
            })

        if (!chat) {
            errMsg = 'Chat not found';
            return errMsg;
        }
        return chat.members.map((member: any) => {
            return {
                id: member.id,
                username: member?.username,
                avatarUrl: member?.avatarUrl,
                status: member?.lastSeen,
                bio: member?.bio

            };
        });
    } catch (err) {
        if (err instanceof MongooseError) {
            errMsg = err.message;
        }
        return errMsg;
    }
}

const joinMemsToRoom = async (
    io: Server,
    userId: Types.ObjectId,
    chatId: Types.ObjectId
) => {
    const sockets = await io.of('/').fetchSockets();
    for (const sock of sockets) {
        if (!sock.rooms.has(chatId.toString())) {
            if (sock.data.userId.toString() === userId.toString()) {
                sock.join(chatId.toString());
            }
        }
    }
};

export {
    getChats,
    contacts,
    findChat,
    createChat,
    joinMemsToRoom,
    modifyMemsInfo,
    addChatIdToUsers
};
