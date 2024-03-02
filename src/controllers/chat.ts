import { Server, Socket } from 'socket.io';
import { socketError } from '../ioInstance/socketError.js';
import Chat from '../models/Chat.js';
import User from '../models/Users.js';
import { chatEvents } from '../utils/index.js';
import { MongooseError, ObjectId, Schema } from 'mongoose';

const getChats = (socket: Socket) => {
    socket.on(chatEvents.chatLastMsg, async () => {
        let msg = '';
        try {
            const userId = socket.userId as string;
            const userChats = await Chat.find({
                members: { $in: userId }
            })
                .populate([
                    {
                        path: 'members',
                        model: 'user'
                    },
                    {
                        path: 'messages',
                        model: 'message'
                    }
                ])
                .select(['username', 'messages']);
            if (userChats.length === 0) {
                msg = 'no chat found';
                socket.emit(chatEvents.chatLastMsg, msg);
                return;
            }
            // sorting and return the chat's last message with the latest date
            userChats.sort((chatA: any, chatB: any) => {
                const lastMessageA = chatA.messages[chatA.messages.length - 1];
                const lastMessageB = chatB.messages[chatB.messages.length - 1];
                return (
                    new Date(lastMessageB.createdAt).getTime() -
                    new Date(lastMessageA.createdAt).getTime()
                );
            });
            userChats.forEach((chat) => {
                const { members, messages } = chat;
                const lstMsgInfo = messages.pop();

                members.forEach((member) => {
                    if (member._id.toString() !== userId) {
                        const chatInfo = {
                            Id: chat._id,
                            userId: member._id,
                            username: member.username,
                            avatarUrl: member.avatarUrl,
                            lastMessage: lstMsgInfo.message,
                            lstMsgDate: lstMsgInfo.createdAt
                        };
                        socket.emit(chatEvents.chatLastMsg, chatInfo);
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
            const userId = socket.userId as string;

            const friends = await User.find({
                _id: { $ne: userId }
            })
                .select(['username', 'avatarUrl', 'bio', 'chats'])
                .sort('asc');

            friends.forEach(async (friend: any) => {
                const chat = await Chat.findOne({
                    members: { $all: [friend._id, userId] }
                });

                if (chat) {
                    const oldFriend = {
                        Id: friend._id,
                        username: friend.username,
                        avatarUrl: friend.avatarUrl,
                        chatId: chat._id,
                        bio: friend.bio
                    };

                    socket.emit(chatEvents.contacts, oldFriend);
                } else {
                    const newContact = {
                        Id: friend._id,
                        username: friend.username,
                        avatarUrl: friend.avatarUrl,
                        bio: friend.bio
                    };

                    socket.emit(chatEvents.contacts, newContact);
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

async function findChat(chatId: Schema.Types.ObjectId) {
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

async function createChat(members: Schema.Types.ObjectId[]) {
    try {
        const fndChat = await Chat.findOne({ members: { $all: members } });
        if (fndChat) {
            return {
                chatId: fndChat._id,
                chatMems: fndChat.members
            };
        }

        const createdChat = await Chat.create({ members });
        if (createdChat) {
            createdChat.members.forEach((memberId) => {
                addChatIdToUsers(createdChat._id, memberId);
            });
        }

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
    chatId: Schema.Types.ObjectId,
    memberId: Schema.Types.ObjectId
) {
    await User.findByIdAndUpdate(memberId, { $push: { chats: chatId } });
}

async function modifyMemsInfo(chatId: ObjectId) {
    let errMsg;
    try {
        const chat = await Chat.findById(chatId)
            .populate({
                path: 'members',
                model: 'user'
            })
            .select(['username', 'avatarUrl']);
        if (!chat) {
            errMsg = 'Chat not found';
            return errMsg;
        }
        return chat.members.map((member) => {
            return {
                userId: member._id,
                username: member.username,
                avatarUrl: member.avatarUrl
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
    userId: Schema.Types.ObjectId,
    chatId: Schema.Types.ObjectId
) => {
    const sockets = await io.of('/').fetchSockets();
    for (const sock of sockets) {
        if (!sock.rooms.has(chatId.toString())) {
            if (sock.userId.toString() === userId.toString()) {
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
