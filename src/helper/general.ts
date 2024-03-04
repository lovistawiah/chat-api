import { RemoteSocket, Server } from "socket.io"
import io from "../ioInstance/index.js"
import { Types } from "mongoose"

const replaceMongoIdWithId = (obj: any) => {
    obj.Id = obj._id
    delete obj._id
    return obj

}
const filterMembers = (members: any[], socket: RemoteSocket<any, any>) => {
    return members.filter(
        (mem) => mem.userId.toString() !== socket.data.userId.toString()
    )[0];
}
// do not forget to the add chatId to users when created
const getSockets = async () => {
    return await io.of('/').fetchSockets()
}
const filterSocket = async (members: any[]) => {
    let filteredSocket: Array<RemoteSocket<any, any>> = []
    const sockets = await getSockets()
    members?.forEach((member) => {
        filteredSocket = sockets.filter((sock) => sock.data.userId.toString() === member?.Id)
    })
    return filteredSocket
}

const broadcast = (io: Server, to: Types.ObjectId, eventName: string, eventValue: any) => {
    if (!to) return
    io.to(to.toString()).emit(eventName, eventValue)
}
export { replaceMongoIdWithId, filterMembers, getSockets, filterSocket, broadcast }
