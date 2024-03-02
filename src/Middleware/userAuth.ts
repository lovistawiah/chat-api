import User from '../models/Users.js';
import { Socket } from 'socket.io';
import { verifyToken } from '../utils/token.js';
import { Schema } from 'mongoose';
import { mongooseError } from '../error/mongooseError.js';

const authenticateSocket = async (socket: Socket, next: any) => {
    let message = '';
    let { token } = socket.handshake.auth;
    if (!token) {
        token = socket.handshake.headers.token;
    }
    try {
        if (!token) {
            const err = new Error('token not available');
            next(err);
        }
        const payload = verifyToken(token);
        if (!payload) {
            const err = new Error('invalid token');
            next(err);
        }
        if (typeof payload === 'string' || payload instanceof Error) {
            next(payload)
            return
        }
        const userId: Schema.Types.ObjectId = payload.userInfo?.userId;
        const findUser = await User.findById(userId);
        if (!findUser) {
            message = 'user does not exist';
            const err = new Error(message);
            next(err);
            return
        }
        socket.data.userId = userId.toString();
        return next();
    } catch (err) {
        const message = mongooseError(err)
        if (!message) return
        next(new Error(message));
    }
};

export { authenticateSocket };
