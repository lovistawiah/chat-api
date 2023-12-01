const { Storage } = require("@google-cloud/storage");

const storage = new Storage({
    projectId: process.env.PROJECT_ID,
    keyFilename: "./keyFileName.json",
});
const bucketName = "you-and-i-testing";
const bucket = storage.bucket(bucketName);

async function updateProfilePic(req, res) {
    try {
        let message = "";
        const file = req.file;
        console.log(file);
        if (!req.file) {
            message = "file not uploaded, try again!";
            res.status(400).json({ message });
        } else {
            const fileExtension = file.mimetype.split("/")[1];
            const extensions = ["jpeg", "png", "webp"];
            if (!extensions.includes(fileExtension)) {
                message = "unsupported image file";
                res.status(400).json({ message });
                return;
            }
            const fileObj = {
                fileName: `profile/${req.userId}.${fileExtension}`,
                buffer: file.buffer,
            };
            saveProfile(fileObj.fileName, fileObj.buffer);
            const getSignedUrl = await profileUrl(fileObj.fileName);
            res.status(200).json({ getSignedUrl });
            return;
        }
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
}

async function saveProfile(fileName, contents) {
    await bucket.file(fileName).save(contents);
}

async function profileUrl(fileName) {
    const urlOptions = {
        version: "v2",
        action: "read",
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
    };
    const url = bucket.file(fileName).getSignedUrl(urlOptions);
    return url;
}
module.exports = { updateProfilePic };
