require("dotenv").config();
const express = require("express");
require("dotenv").config();
const cors = require("cors");
const http = require("http");
const morgan = require("morgan");

//local files
const ioInstance = require("./src/ioInstance/index");
const router = require("./src/routes/routes");
const connection = require("./src/db/connection");

const app = express();
const server = http.createServer(app); // Attach Express app to the HTTP server
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
async function start(url) {
    try {
        await connection(url);
        server.listen(PORT, () => {
            console.log(`listening on http://localhost:${PORT}`);
        });
    } catch (err) {
        throw new Error(err.message);
    }
}

start(MONGO_URI);
