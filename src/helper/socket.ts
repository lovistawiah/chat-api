import { Socket } from "socket.io";

const sendToReceiver = (socket: Socket, eventName: string, eventValue: any) => {
    socket.emit(eventName, eventValue)
}
export { sendToReceiver }