import 'dotenv/config'
import express, { Application } from 'express'
import cors from 'cors'
import http from 'http'
import morgan from 'morgan'

// local files
import ioInstance from "./src/ioInstance/index.js";
import router from './src/routes/routes.js';
import connection from './src/db/connection.js';

const app: Application = express();
const server: http.Server = http.createServer(app); // Attach Express app to the HTTP server
const MONGO_URI = process.env.MONGO_URI;

// use only in dev mode
app.use(morgan("dev"));

app.use(cors({ origin: ["http://localhost:5173", "http://172.20.10.2:5173"] }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/api", router);

// ? attaching the server to the web socket.
ioInstance.attach(server);

const PORT = process.env.PORT || 5000;
async function start(url: string) {
    if (!url) return
    try {
        await connection(url);
        server.listen(PORT, () => {
            console.log(`listening on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.log(err)
    }
}

start(MONGO_URI ?? "");
