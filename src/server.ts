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
import { connectTransport, consume, createTransport, disconnect, exitRoom, joinRoom, messageInRoom, produce } from "./media-server/webSocket/signaling";
import { jwtAuthMiddleware } from "./middlewares/JwtAuthMiddleware";
import os from "os";
import { prismaClient } from "./lib/db";

export let announceIpAddress:any = null;

const getServerIp = () => {
    const networkInterfaces:any = os.networkInterfaces();
    for(let interfaceName in networkInterfaces){
        for(let net of networkInterfaces[interfaceName]){
            if(net.family === 'IPv4' && net.internal){
                console.log("server ip is: "+net.address);
                announceIpAddress = net.address;
                console.log("Announce ip is: "+announceIpAddress);
            }
        }
    }
}

console.log(`.env Announce IP => ${process.env.ANNOUNCE_IP}`)
getServerIp();


dotenv.config();

const isDbConnectionSuccessful = async () => {
    try {
        await prismaClient.$connect();
        console.log("Database connected 🆗");
    } catch (err) {
        console.error("Prisma Connection error ❌", err);
    }
}

isDbConnectionSuccessful();

const PORT = process.env.PORT || 5000;

const app = express();
app.use(cors({
    origin: `${process.env.CLIENT_URL}`,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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
// origin: "http://localhost:5173",

export const io = new socketIo(server, {
    cors: {
        origin: `${process.env.CLIENT_URL}`,
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ["websocket", "polling"]
});

createWorkerFunc().then(() => {
    io.on("connection", (socket: Socket) => {
        // console.log(`User connected: ${socket.id}`);
    
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

        socket.on('message', async ({roomId, message, username, role}) => {
            await messageInRoom({roomId, message, username, role}, socket);
        })
    
        socket.on("exitRoom", ({ roomId, producerIds })=>{
            exitRoom({ roomId, producerIds }, socket);
        });
    
        socket.on("disconnect", ()=>{
            disconnect(socket);
        });
    });
});


server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});