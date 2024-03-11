import User from "../models/Users.js"

const createUser = (userInfo: {
    email: string,
    password: string,
    username: string,
    avatarUrl: string,
    bio: string
}) => {
    return User.create(userInfo)
}
export { createUser }