import { Socket } from 'socket.io';

function socketError(socket: Socket, eventName: string, message: string) {
    socket.emit(eventName, message);
}
export { socketError };
