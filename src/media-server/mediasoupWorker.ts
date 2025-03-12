import mediasoup from "mediasoup";
import { Worker } from "mediasoup/node/lib/types";
import { Rooms } from "../types/Rooms";

export let worker:Worker;
export let rooms:Rooms = {};

 export const createWorker = async () => {
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
