import { MongooseError } from "mongoose"

export const mongooseError = (err: unknown) => {
    let msg;
    if (err instanceof MongooseError) {
        msg = err.message
    }
    if (msg) return msg
}