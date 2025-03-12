import { createWorker } from "./media-server/mediasoupWorker";
import { Server as socketIo } from "socket.io";
import { connectTransport, consume, createTransport, disconnect, exitRoom, joinRoom, produce } from "./media-server/webSocket/signaling";

require('dotenv').config();
const cors = require("cors");
const express = require("express");
const http = require("http");
// const socketIo = require("socket.io");
// const mediasoup = require("mediasoup");
const studentRoutes = require("./build/routes/student");
const bodyParser = require("body-parser");

const app = express();
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true
}));
app.use(bodyParser.json());

// routes are here
app.use('/student', studentRoutes);


//------
const server = http.createServer(app);

export const io = new socketIo(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ["websocket", "polling"]
});

createWorker();

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("joinRoom", joinRoom);

    socket.on("createTransport", createTransport);

    socket.on("connectTransport", connectTransport);

    socket.on("produce", produce);

    socket.on("consume", consume);

    socket.on("exitRoom", exitRoom);

    socket.on("disconnect", disconnect);
});

server.listen(5000, () => {
    console.log("Server running on http://localhost:5000");
});