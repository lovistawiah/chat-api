import User from "../models/Users.js"

const createUser = (userInfo: any) => {
    return User.create(userInfo)
}
export { createUser }