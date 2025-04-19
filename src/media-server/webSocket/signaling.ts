// import { io } from "../server";
import { Socket } from "socket.io";
import { JoinCallbackFunctionResponse, CreateTransportCallbackFunctionResponse, ProduceCallbackFunctionResponse, ConsumeCallbackFunctionResponse, MessageCallbackFunctionResponse } from "../../types/CallbackResponse";
import { rooms, worker} from "../mediasoupWorker";
import { DtlsParameters } from "mediasoup/node/lib/WebRtcTransportTypes";
import { Room, RoomUser } from "../../types/Rooms";
import { MediaKind, RtpCapabilities, RtpParameters } from "mediasoup/node/lib/rtpParametersTypes";
import { studentAuthorization } from "../../controller/StudentAuthorization";
import { announceIpAddress } from "../../server";


export const joinRoom = async ({ roomId, userId, role}:{roomId:string, userId:string, role:string}, socket:Socket, callback:JoinCallbackFunctionResponse) => {
    // roomId will be same as classId of the class(id)
    const isUserAllowedToJoin = await studentAuthorization(roomId, userId, role);
    console.log("isUserAllowedToJoin and usrId=>",isUserAllowedToJoin, userId, roomId, role)
    let mssg:string
    if(!isUserAllowedToJoin){
        mssg="User not allowed to join the room";
        console.error("User not allowed");
        return callback({ error: "User not allowed to join the room" });
    }
    // 
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
    //console.log(`Sending existing producers to ${socket.id} in room ${roomId}:`, existingProducerIds);
    mssg = 'User is the part of the class room'

    callback({ 
        routerRtpCapabilities: rooms[roomId].router.rtpCapabilities,
        existingProducerIds,
        message:mssg
    });
}

export const createTransport = async ({ roomId }:{roomId:string}, socket:Socket, callback:CreateTransportCallbackFunctionResponse) => {
    const room = rooms[roomId];
    if (!room) return;

    const stunServer = {
        iceServers: [
            { urls: "stun:stun.1.google.com:19302" },
            { urls: "stun:stun1.1.google.com:19302" },
            { urls: "stun:stun2.1.google.com:19302" },
            { urls: "stun:stun3.1.google.com:19302" }
        ]
    }

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
        iceServers: stunServer.iceServers
    });
}

export const connectTransport = ({ transportId, dtlsParameters }:{ transportId:string, dtlsParameters:DtlsParameters }, socket:Socket) => {
    for (const roomId in rooms) {
        const room = rooms[roomId];
        if (room) {
            const transport = room.users[socket.id]?.transports.find((t) => t.id === transportId);
            if (transport) transport.connect({ dtlsParameters });
        }
    }
}

export const produce = async ({ roomId, transportId, kind, rtpParameters }:{ roomId:string, transportId:string, kind:MediaKind, rtpParameters:RtpParameters }, socket:Socket, callback:ProduceCallbackFunctionResponse) => {
    const room:any = rooms[roomId];
    const producer = await room.users[socket.id].transports
        .find((t:any) => t.id === transportId)
        .produce({ kind, rtpParameters });

    room.users[socket.id].producers.push(producer);
    room.producers.set(producer.id, socket.id);

    //console.log(`✅ New Producer Created: ${producer.id}`);
    socket.to(roomId).emit("newProducer", producer.id);
    //console.log("🚀 Broadcasting new producer:", producer.id, "-to room-", roomId);
    callback({ id: producer.id });
}

export const consume = async ({ roomId, producerId, transportId, rtpCapabilities }:{ roomId:string, producerId:string, transportId:string, rtpCapabilities:RtpCapabilities }, socket:Socket, callback:ConsumeCallbackFunctionResponse) => {
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
}

export const messageInRoom = async({roomId}:{roomId:string}, socket:Socket, callback:MessageCallbackFunctionResponse)=>{

}

// producerIds is string[](array here) defined by me.
export const exitRoom = ({ roomId, producerIds }:{ roomId:string, producerIds:string[] }, socket:Socket) => {
    const room = rooms[roomId];
    if (!room) return;

    //console.log(`User ${socket.id} exiting room ${roomId} with producers:`, producerIds);

    // Notify other clients in the room about each producer that’s leaving
    producerIds.forEach((producerId:string) => {
        socket.to(roomId).emit("participantLeft", producerId);
        room.producers.delete(producerId); // Clean up producer from room
        //console.log(`Notified room ${roomId} that producer ${producerId} left`);
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
        //console.log(`Room ${roomId} deleted as it is now empty`);
    }
}

export const disconnect = (socket:Socket) => {
    //console.log(`User disconnected: ${socket.id}`);
    for (const roomId in rooms) {
        const room = rooms[roomId];
        if (room && room.users[socket.id]) {
            const producerIds = room.users[socket.id].producers.map(p => p.id);
            // Notify other clients about the disconnect
            producerIds.forEach((producerId) => {
                socket.to(roomId).emit("participantLeft", producerId);
                room.producers.delete(producerId);
                //console.log(`Notified room ${roomId} that producer ${producerId} left due to disconnect`);
            });

            // Clean up user resources
            room.users[socket.id].transports.forEach(t => t.close());
            room.users[socket.id].producers.forEach(p => p.close());
            room.users[socket.id].consumers.forEach(c => c.close());
            delete room.users[socket.id];

            // Delete room if empty
            if (Object.keys(room.users).length === 0) {
                delete rooms[roomId];
                //console.log(`Room ${roomId} deleted as it is now empty`);
            }
        }
    }
}