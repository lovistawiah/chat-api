const { Storage } = require("@google-cloud/storage");
const { Types } = require("mongoose");

const storage = new Storage({
    projectId: process.env.PROJECT_ID,
    keyFilename: "./keyFileName.json",
});
const bucketName = "you-and-i-testing";
const bucket = storage.bucket(bucketName);
/**
 * 
 * @param {*} file 
 * @param {Types.ObjectId} id 
 * @returns 
 */
async function saveAndGetUserProfileUrl(file, id) {
    let message;
    try {
        if (!file) {
            message = new Error('"file not uploaded, try again!"');
            return message;
        } else {
            const fileExtension = file.mimetype.split("/")[1];
            const extensions = ["jpeg", "png", "webp"];

            if (!extensions.includes(fileExtension)) {
                message = new Error("unsupported image file");
                return message;
            }

            const fileObj = {
                fileName: `profiles/${id}.${fileExtension}`,
                buffer: file.buffer,
            };
            saveProfile(fileObj.fileName, fileObj.buffer);
            const getSignedUrl = await getFileUrl(fileObj.fileName);
            // the url returns an array of one link,
            const shortUrl = getSignedUrl[0].split("?")[0];
            return shortUrl;
        }
    } catch (error) {
        message = new Error(error.message);
        return message;
    }
}
/**
 * 
 * @param {string} fileName 
 * @param {Buffer} contents 
 */
async function saveProfile(fileName, contents) {
    await bucket.file(fileName).save(contents);
}

/**
 * 
 * @param {string} fileName 
 * @returns 
 */
async function getFileUrl(fileName) {
    const urlOptions = {
        version: "v2",
        action: "read",
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
    };
    const url = bucket.file(fileName).getSignedUrl(urlOptions);
    return url;
}
module.exports = { saveAndGetUserProfileUrl };
