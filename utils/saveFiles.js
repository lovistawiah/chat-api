const { Types } = require("mongoose");
const { saveFile, getFileUrl } = require("./modifyProfilePic");
const { socketError } = require("../ioInstance/socketError");
const { messageEvents } = require(".");
const { Socket } = require("socket.io");

/**
 * @param {ArrayBuffer} arrayBuffer
 * @param {String} fileName
 * @param {Types.ObjectId} messageId
 * @param {Socket} socket
 */
async function saveFileInBucket({ fileName, arrayBuffer, messageId, socket }) {
    try {
        const fileExtension = fileName.split(".")[1];
        fileName = `media/images/${messageId}.${fileExtension}`;
        await saveFile(fileName, arrayBuffer);
        const url = await getFileUrl(fileName);
        return url;
    } catch (error) {
        socketError(socket, messageEvents.errorMessage, error.message);
    }
}
module.exports = { saveFileInBucket };
