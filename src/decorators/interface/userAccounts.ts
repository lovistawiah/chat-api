import { Types } from "mongoose";

export interface IUserInfo {
    userId: Types.ObjectId;
    username: string;
}
