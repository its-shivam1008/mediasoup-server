require('dotenv').config();
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
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ["websocket", "polling"]
});

let worker;
let rooms = {};

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
                producers: new Map(),
            };
        }
        rooms[roomId].users[socket.id] = { transports: [], producers: [], consumers: [] };
        socket.join(roomId);

        const existingProducerIds = Array.from(rooms[roomId].producers.keys());
        console.log(`Sending existing producers to ${socket.id} in room ${roomId}:`, existingProducerIds);

        callback({ 
            routerRtpCapabilities: rooms[roomId].router.rtpCapabilities,
            existingProducerIds
        });
    });

    socket.on("createTransport", async ({ roomId }, callback) => {
        const room = rooms[roomId];
        if (!room) return;

        const transport = await room.router.createWebRtcTransport({
            listenIps: [{ ip: "0.0.0.0", announcedIp: `${process.env.ANNOUNCE_IP}` }],
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
        room.producers.set(producer.id, socket.id);

        console.log(`✅ New Producer Created: ${producer.id}`);
        socket.to(roomId).emit("newProducer", producer.id);
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
    });

    // New: Handle exitRoom event
    socket.on("exitRoom", ({ roomId, producerIds }) => {
        const room = rooms[roomId];
        if (!room) return;

        console.log(`User ${socket.id} exiting room ${roomId} with producers:`, producerIds);

        // Notify other clients in the room about each producer that’s leaving
        producerIds.forEach((producerId) => {
            socket.to(roomId).emit("participantLeft", producerId);
            room.producers.delete(producerId); // Clean up producer from room
            console.log(`Notified room ${roomId} that producer ${producerId} left`);
        });

        // Clean up user data
        room.users[socket.id].transports.forEach(t => t.close());
        room.users[socket.id].producers.forEach(p => p.close());
        room.users[socket.id].consumers.forEach(c => c.close());
        delete room.users[socket.id];

        // Remove socket from room and delete room if empty
        socket.leave(roomId);
        if (Object.keys(room.users).length === 0) {
            delete rooms[roomId];
            console.log(`Room ${roomId} deleted as it is now empty`);
        }
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
        for (const roomId in rooms) {
            const room = rooms[roomId];
            if (room && room.users[socket.id]) {
                const producerIds = room.users[socket.id].producers.map(p => p.id);
                // Notify other clients about the disconnect
                producerIds.forEach((producerId) => {
                    socket.to(roomId).emit("participantLeft", producerId);
                    room.producers.delete(producerId);
                    console.log(`Notified room ${roomId} that producer ${producerId} left due to disconnect`);
                });

                // Clean up user resources
                room.users[socket.id].transports.forEach(t => t.close());
                room.users[socket.id].producers.forEach(p => p.close());
                room.users[socket.id].consumers.forEach(c => c.close());
                delete room.users[socket.id];

                // Delete room if empty
                if (Object.keys(room.users).length === 0) {
                    delete rooms[roomId];
                    console.log(`Room ${roomId} deleted as it is now empty`);
                }
            }
        }
    });
});

server.listen(5000, () => {
    console.log("Server running on http://localhost:5000");
});