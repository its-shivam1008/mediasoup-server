import { MediaKind, RtpCapabilities, RtpParameters } from "mediasoup/node/lib/rtpParametersTypes";
import { DtlsParameters, IceCandidate, IceParameters } from "mediasoup/node/lib/WebRtcTransportTypes";


interface JoinCallbackSuccessResponse{
    routerRtpCapabilities: RtpCapabilities;
    existingProducerIds:string[];
    message?:string;
}

interface JoinCallbackErrorResponse{
    error: string;
}

export type JoinCallbackResponse = JoinCallbackSuccessResponse | JoinCallbackErrorResponse;

export type JoinCallbackFunctionResponse = (response: JoinCallbackResponse) => void;


interface Urls {
    urls:string;
}


interface CreateTransportCallbackSuccessResponse{
    id:string;
    iceParameters: IceParameters;
    iceCandidates: IceCandidate[];
    dtlsParameters: DtlsParameters;
    iceServers: Urls[];
}

interface CreateTransportCallbackErrorResponse{
    error: string;
}

export type CreateTransportCallbackResponse = CreateTransportCallbackSuccessResponse | CreateTransportCallbackErrorResponse;

export type CreateTransportCallbackFunctionResponse = (response: CreateTransportCallbackResponse) => void;

interface ProduceCallbackSuccessResponse{
    id: string;
}

interface ProduceCallbackErrorResponse{
    error:string;
}

export type ProduceCallbackResponse = ProduceCallbackSuccessResponse | ProduceCallbackErrorResponse;

export type ProduceCallbackFunctionResponse = (response: ProduceCallbackResponse) => void;

interface ConsumeCallbackSuccessResponse{
    id:string,
    producerId:string,
    kind:MediaKind,
    rtpParameters:RtpParameters,
}

interface ConsumeCallbackErrorResponse{
    error:string;
}

export type ConsumeCallbackResponse = ConsumeCallbackSuccessResponse | ConsumeCallbackErrorResponse;

export type ConsumeCallbackFunctionResponse = (response: ConsumeCallbackResponse) => void;

interface MessageCallbackSuccessResponse{
    roomId:string;
    message:string;
}

interface MessageCallbackErrorResponse{
    error:string;
}

export type MessageCallbackResponse = MessageCallbackSuccessResponse | MessageCallbackErrorResponse;

export type MessageCallbackFunctionResponse = (response: MessageCallbackResponse) => void;