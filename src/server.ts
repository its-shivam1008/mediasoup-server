import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import http from "http";
import bodyParser from "body-parser";
import cookieParser from 'cookie-parser';
import userAuth from "./routes/Auth";
import student from "./routes/Students";
import teacher from "./routes/Teachers";
import { createWorkerFunc } from "./media-server/mediasoupWorker";
import { Socket, Server as socketIo } from "socket.io";
import { connectTransport, consume, createTransport, disconnect, exitRoom, joinRoom, produce } from "./media-server/webSocket/signaling";
import { jwtAuthMiddleware } from "./middlewares/JwtAuthMiddleware";


dotenv.config();

const app = express();
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type'],
    credentials: true
}));

app.use(bodyParser.json());
app.use(cookieParser());

// routes are here
app.use('/user', userAuth);
app.use('/student', jwtAuthMiddleware, student);
app.use('/teacher', jwtAuthMiddleware, teacher);


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

createWorkerFunc().then(() => {
    io.on("connection", (socket: Socket) => {
        console.log(`User connected: ${socket.id}`);
    
        socket.on("joinRoom", async ({ roomId, userId, role}, callback) => {
            await joinRoom({ roomId, userId, role}, socket, callback); // userId and role added
        });
    
        socket.on("createTransport", async ({ roomId }, callback) => {
            await createTransport({ roomId }, socket, callback);
        });
    
        socket.on("connectTransport", ({ transportId, dtlsParameters }) => {
            connectTransport({ transportId, dtlsParameters }, socket);
        });
    
        socket.on("produce", async ({ roomId, transportId, kind, rtpParameters }, callback)=>{
            await produce({ roomId, transportId, kind, rtpParameters }, socket, callback);
        });
    
        socket.on("consume", async ({ roomId, producerId, transportId, rtpCapabilities }, callback) =>{
            await consume({ roomId, producerId, transportId, rtpCapabilities }, socket, callback);
        });
    
        socket.on("exitRoom", ({ roomId, producerIds })=>{
            exitRoom({ roomId, producerIds }, socket);
        });
    
        socket.on("disconnect", ()=>{
            disconnect(socket);
        });
    });
});


server.listen(5000, () => {
    console.log("Server running on http://localhost:5000");
});