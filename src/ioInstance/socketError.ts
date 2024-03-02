const { Socket } = require("socket.io");

/**
 *
 * @param {Socket} socket
 * @param {string} eventName
 * @param {string} message
 * @returns
 */
function socketError(socket, eventName, message) {
    socket.emit(eventName, message);
    
}
module.exports = { socketError };
