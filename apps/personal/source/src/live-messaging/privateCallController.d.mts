export type PrivateCallKind='voice'|'video';
export type PrivateCallState='idle'|'outgoing'|'ringing'|'acquiring'|'connecting'|'connected'|'disconnected'|'ended'|'failed'|'unavailable'|'closed';
export interface PrivateCallSnapshot {readonly state:PrivateCallState;readonly callId:string|null;readonly kind:PrivateCallKind|null;readonly localStream:MediaStream|null;readonly remoteTracks:readonly MediaStreamTrack[];readonly muted:boolean;readonly cameraOff:boolean;readonly problem:string|null;}
export interface PrivateCallController {
 getSnapshot():PrivateCallSnapshot;
 subscribe(fn:()=>void):()=>void;
 initiate(kind:PrivateCallKind):Promise<void>;
 accept():Promise<void>;
 hangup():Promise<void>;
 setMuted(value:boolean):void;
 setCameraOff(value:boolean):void;
 getStats():Promise<RTCStatsReport>;
 close():void;
}
export function createPrivateCallController(options:Record<string,unknown>):PrivateCallController;
