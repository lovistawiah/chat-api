import User from '../models/Users.js';
import { Socket } from 'socket.io';
import { verifyToken } from '../utils/token.js';

const authenticateSocket = async (socket: Socket, next: any) => {
    let message = '';
    let { token } = socket.handshake.auth;
    if (!token) {
        token = socket.handshake.headers.token;
    }
    try {
        if (!token) {
            const err = new Error('token not available');
            err.data = 'register account';
            next(err);
        }
        const payload = verifyToken(token);
        if (!payload) {
            const err = new Error('invalid token');
            next(err);
        }
        if (typeof payload === 'object') {
            const userId: string = payload.userInfo.userId;
            const findUser = await User.findById(userId);
        }
        if (!findUser) {
            message = 'user does not exist';
            const err = new Error(message);
            next(err);
        }

        socket.userId = userId;
        return next();
    } catch (err) {
        message = err.message;
        next(err);
    }
};

export { authenticateSocket };
