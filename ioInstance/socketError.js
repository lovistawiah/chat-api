function socketError(socket, eventName, message) {
  socket.emit(eventName, message);
  return;
}
module.exports = { socketError };
