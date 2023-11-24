function socketError(socket, eventName, message) {
  socket.emit(eventName, message);
}
module.exports = { socketError };
