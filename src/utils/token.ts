import jwt, { JwtPayload } from 'jsonwebtoken';
import { Types } from 'mongoose';
interface IUserInfo {
    userId: Types.ObjectId,
    username: string
}

function createToken(userInfo: IUserInfo) {
    const token = jwt.sign(userInfo, process.env.JWT_SECRET as string, {
        expiresIn: '30d'
    });
    return token;
}

function verifyToken(token: string): string | Error | JwtPayload {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string);
    return payload;
}

export { createToken, verifyToken };
