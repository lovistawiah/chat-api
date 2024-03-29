const jwt = require("jsonwebtoken");
const User = require("../models/Users");
const { Socket } = require("socket.io");
const { verifyToken } = require("../utils/token");
/**
 *
 * @param {Socket} socket
 * @param {*} next
 * @returns
 */
const authenticateSocket = async (socket, next) => {
    let message = "";
    let { token } = socket.handshake.auth;
    if (!token) {
        token = socket.handshake.headers.token;
    }
    try {
        if (!token) {
            const err = new Error("token not available");
            err.data = "register account";
            next(err);
        }
        const payload = verifyToken(token);
        if (!payload) {
            const err = new Error("invalid token");
            next(err);
        }

        const userId = payload.userInfo.userId;
        const findUser = await User.findById(userId);
        if (!findUser) {
            message = "user does not exist";
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

module.exports = {
    authenticateSocket,
};
