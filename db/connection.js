const mongoose = require("mongoose")

module.exports = connect = async (url) => {
    return mongoose.connect(url)
}