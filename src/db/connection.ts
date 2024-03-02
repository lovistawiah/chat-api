import mongoose from 'mongoose';

const connection = async (url: string) => {
    return mongoose.connect(url);
};
export default connection;
