import User from '../models/Users.js';

async function getUserNameFromEmail(email: string) {
    let isUnique = false;
    let message = '';

    if (!email || !email.includes('@')) {
        message = 'Email is not accepted';
        return message;
    }

    let username = email.split('@')[0];
    while (!isUnique) {
        const uniqueUserName = await User.findOne({ username });
        if (!uniqueUserName) {
            isUnique = true;
            return username;
        }
        const splitUniqueId = new Date().getTime().toString().slice(0, 3);
        username += splitUniqueId;
    }
}

function sanitize(string: string) {
    return string.toLowerCase().trim();
}
export { getUserNameFromEmail, sanitize };
