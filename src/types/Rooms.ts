import { Consumer, Producer, Router } from "mediasoup/node/lib/types";
import { WebRtcTransport } from "mediasoup/node/lib/WebRtcTransportTypes";

export interface RoomUser{
    transports:WebRtcTransport[];
    producers:Producer[];
    consumers:Consumer[];
}

export interface Room{
    router: Router;
    users: { [socketId: string]: RoomUser };
    producers: Map<string, string>;
}

export interface Rooms{
    [roomId: string]: Room;
}

