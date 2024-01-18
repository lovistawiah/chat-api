const jwt = require("jsonwebtoken");
const User = require("../models/Users");
const { Socket } = require("socket.io");
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
        const payload = jwt.verify(token, process.env.JWT_SECRET);
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

        socket.decoded = payload.userInfo;
        return next();
    } catch (err) {
        message = err.message;
        next(err);
    }
};
/**
 *
 * @param {import("express").Request} req
 * @param {Response} res
 * @param {*} next
 */
const authenticateUser = async (req, res, next) => {
    let message = "";
    const token = req.headers.authorization;
    if (!token) {
        message = "token does not exist";
        res.status(401).json({ message });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload) {
        message = "invalid token";
        res.status(401).json({ message });
    }
    const userId = payload.userInfo.userId;
    const findUser = await User.findById(userId);

    if (!findUser) {
        message = "user does not exist";
        res.status(401).json({ message });
    } else {
        const foundUserId = findUser._id;
        req.userId = foundUserId;
        next();
    }
};

module.exports = {
    authenticateSocket,
    authenticateUser,
};
