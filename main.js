require("dotenv").config();
const express = require("express");
require("dotenv").config();
const cors = require("cors");

const http = require("http");

//local files
const ioInstance = require("./ioInstance/index");
const router = require("./routes/routes");
const connection = require("./db/connection");

const app = express();
const server = http.createServer(app); // Attach Express app to the HTTP server
const MONGO_URI = process.env.MONGO_URI;

// use only in dev mode
if (process.env.NODE_ENV === "production") {
    app.use(morgan("dev"));
    const morgan = require("morgan");
}
app.use(cors({ origin: true }));
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
