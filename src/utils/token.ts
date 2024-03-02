import jwt from 'jsonwebtoken'
import { IUserInfo } from '../decorators/interface/userAccounts.js';

function createToken(userInfo: IUserInfo) {
    const token = jwt.sign(userInfo, process.env.JWT_SECRET as string, {
        expiresIn: "30d",
    });
    return token;
}

function verifyToken(token: string) {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string);
    if (!payload) {
        const err = new Error("invalid token");
        return err;
    }
    return payload;
}

module.exports = { createToken, verifyToken };
