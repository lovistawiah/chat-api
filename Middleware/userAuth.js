const jwt = require("jsonwebtoken")
const User = require("../models/Users")

const authenticateSocket = async (socket, next) => {
    let { token } = socket.handshake.auth
    if(!token) {
        token = socket.handshake.headers.token
    }
    try {
        if (!token) {
            return new Error("token not available")
        }
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        if (!payload) {
            return new Error("invalid token")
        }

        const userId = payload.userInfo.userId
        const findUser = await User.findById(userId)
        if (!findUser) {
            return new Error("user does not exist")
        }

        socket.decoded = payload.userInfo
        return next()
    } catch (err) {
        return next(new Error("Authentication failed"))
    }
}
module.exports = {
    authenticateSocket
}