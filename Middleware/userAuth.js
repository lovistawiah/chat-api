const jwt = require("jsonwebtoken");
const User = require("../models/Users");
const { socketError } = require("../ioInstance/socketError");
const { userEvents } = require("../utils");

const authenticateSocket = async (socket, next) => {
  let message = "";
  let { token } = socket.handshake.auth;
  if (!token) {
    token = socket.handshake.headers.token;
  }
  try {
    if (!token) {
      message = "token not available";
      socketError(socket, userEvents.errorMessage, message);
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload) {
      message = "invalid token";
      socketError(socket, userEvents.errorMessage, message);
    }

    const userId = payload.userInfo.userId;
    const findUser = await User.findById(userId);
    if (!findUser) {
      message = "user does not exist";
      socketError(socket, userEvents.errorMessage, message);
    }

    socket.decoded = payload.userInfo;
    return next();
  } catch (err) {
    message = err.message;
    socketError(socket, userEvents.errorMessage, message);
  }
};
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
  }

  const foundUserId = findUser._id;
  req.userId = foundUserId;
  next();
};

module.exports = {
  authenticateSocket,
};
