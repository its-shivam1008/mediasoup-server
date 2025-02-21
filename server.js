const cors = require("cors");
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mediasoup = require("mediasoup");

const app = express();
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true
}));

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:5173", // Allow frontend origin
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ["websocket", "polling"] // Ensure both WebSocket and polling are enabled
});

let worker;
let rooms = {}; // Store active rooms

const createWorker = async () => {
    try {
        worker = await mediasoup.createWorker({
            logLevel: "debug",
            rtcMinPort: 20000,
            rtcMaxPort: 21000
        });
        console.log("✅ Mediasoup Worker Created");
    } catch (error) {
        console.error("❌ Failed to create Mediasoup Worker:", error);
    }
};
createWorker();


io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("joinRoom", async ({ roomId }, callback) => {
        if (!worker) {
            console.error("❌ Worker is not initialized yet!");
            return callback({ error: "Mediasoup worker is not ready" });
        }
        if (!rooms[roomId]) {
            rooms[roomId] = {
                router: await worker.createRouter({
                    mediaCodecs: [
                        { kind: "audio", mimeType: "audio/opus", clockRate: 48000, channels: 2 },
                        { kind: "video", mimeType: "video/VP8", clockRate: 90000 },
                    ],
                }),
                users: {},
            };
        }
        rooms[roomId].users[socket.id] = { transports: [], producers: [], consumers: [] };
        socket.join(roomId);
        callback({ routerRtpCapabilities: rooms[roomId].router.rtpCapabilities });
    });

    socket.on("createTransport", async ({ roomId }, callback) => {
        const room = rooms[roomId];
        if (!room) return;

        const transport = await room.router.createWebRtcTransport({
            listenIps: [{ ip: "0.0.0.0", announcedIp: "192.168.31.76" }], // Replace with your actual IP
            enableUdp: true,
            enableTcp: true,
        });

        room.users[socket.id].transports.push(transport);

        callback({
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
        });
    });

    socket.on("connectTransport", ({ transportId, dtlsParameters }) => {
        for (const roomId in rooms) {
            const room = rooms[roomId];
            if (room) {
                const transport = room.users[socket.id]?.transports.find((t) => t.id === transportId);
                if (transport) transport.connect({ dtlsParameters });
            }
        }
    });

    socket.on("produce", async ({ roomId, transportId, kind, rtpParameters }, callback) => {
        const room = rooms[roomId];
        const producer = await room.users[socket.id].transports
            .find(t => t.id === transportId)
            .produce({ kind, rtpParameters });
    
        room.users[socket.id].producers.push(producer);
    
        console.log(`✅ New Producer Created: ${producer.id}`); // DEBUG
    
        // Notify other users in the room about this new producer
        socket.to(roomId).emit("newProducer", producer.id); //  removed broad cast
        console.log("🚀 Broadcasting new producer:", producer.id, "-to room-", roomId);
        callback({ id: producer.id });
    });
    



    socket.on("consume", async ({ roomId, producerId, transportId, rtpCapabilities }, callback) => {
        const room = rooms[roomId];
        if (!room) return;

        if (!room.router.canConsume({ producerId, rtpCapabilities })) {
            return callback({ error: "Cannot consume" });
        }

        const transport = room.users[socket.id].transports.find((t) => t.id === transportId);
        if (!transport) return;

        const consumer = await transport.consume({
            producerId,
            rtpCapabilities,
            paused: false,
        });

        room.users[socket.id].consumers.push(consumer);

        callback({
            id: consumer.id,
            producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
        });
        consumer.resume();
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
        for (const roomId in rooms) {
            if (rooms[roomId].users[socket.id]) {
                delete rooms[roomId].users[socket.id];
                if (Object.keys(rooms[roomId].users).length === 0) {
                    delete rooms[roomId];
                }
            }
        }
    });
});


server.listen(5000, () => {
    console.log("Server running on http://localhost:5000");
});
