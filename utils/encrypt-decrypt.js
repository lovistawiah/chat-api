const crypto = require("crypto");

const generateKey = () => crypto.randomBytes(32);
const generateIV = () => crypto.randomBytes(16);

// Function to encrypt a message using AES-256
const encryptMessage = (message, key, iv) => {
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(message, "utf-8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
};

const decryptMessage = (encryptedMessage, key, iv) => {
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encryptedMessage, "hex", "utf-8");
    decrypted += decipher.final("utf-8");
    return decrypted;
};

module.exports = { decryptMessage, encryptMessage, generateIV, generateKey };
