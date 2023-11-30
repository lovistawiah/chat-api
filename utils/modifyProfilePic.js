function updateProfilePic(req, res) {
    const file = req.file;
    const newFileObj = {
        fieldName: file.fieldname,
        originalName: req.userId,
        encoding: file.encoding,
        mimetype: file.mimetype,
        buffer: file.buffer,
        size: file.size,
    };
    res.send({ newFileObj });
}

module.exports = { updateProfilePic };
