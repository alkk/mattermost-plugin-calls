import {EventEmitter} from 'events';

import type {
    RTCPeerConfig,
    RTCRtpSender,
    RTCPeerConnectionIceEvent,
    RTCTrackEvent,
    MediaStreamTrack,
    RTCPeerConnection,
    MediaStream,
} from './types';

const rtcConnFailedErr = new Error('rtc connection failed');

export class RTCPeer extends EventEmitter {
    private pc: RTCPeerConnection | null;
    private readonly senders: { [key: string]: RTCRtpSender };
    private readonly logDebug: (...args: unknown[]) => void;

    private makingOffer = false;
    public connected: boolean;

    constructor(config: RTCPeerConfig, logDebug: (...args: unknown[]) => void) {
        super();
        this.logDebug = logDebug;

        // We keep a map of track IDs -> RTP sender so that we can easily
        // replace tracks when muting/unmuting.
        this.senders = {};

        this.pc = new RTCPeerConnection(config);
        this.pc.onnegotiationneeded = () => this.onNegotiationNeeded();
        this.pc.onicecandidate = (ev: RTCPeerConnectionIceEvent) => this.onICECandidate(ev);
        this.pc.oniceconnectionstatechange = () => this.onICEConnectionStateChange();
        this.pc.onconnectionstatechange = () => this.onConnectionStateChange();
        this.pc.ontrack = (ev: RTCTrackEvent) => this.onTrack(ev);

        this.connected = false;

        // We create a data channel for two reasons:
        // - Initiate a connection without preemptively adding audio/video tracks.
        // - Use this communication channel for further negotiation (to be implemented).
        this.pc.createDataChannel('calls-dc');
    }

    private onICECandidate(ev: RTCPeerConnectionIceEvent) {
        if (ev.candidate) {
            this.emit('candidate', ev.candidate);
        }
    }

    private onConnectionStateChange() {
        switch (this.pc?.connectionState) {
        case 'connected':
            this.connected = true;
            break;
        case 'failed':
            this.emit('close', rtcConnFailedErr);
            break;
        }
    }

    private onICEConnectionStateChange() {
        switch (this.pc?.iceConnectionState) {
        case 'connected':
            this.emit('connect');
            break;
        case 'failed':
            this.emit('close', rtcConnFailedErr);
            break;
        case 'closed':
            this.emit('close');
            break;
        default:
        }
    }

    private async onNegotiationNeeded() {
        try {
            this.makingOffer = true;
            await this.pc?.setLocalDescription();
            this.emit('offer', this.pc?.localDescription);
        } catch (err) {
            this.emit('error', err);
        } finally {
            this.makingOffer = false;
        }
    }

    private onTrack(ev: RTCTrackEvent) {
        if (ev.streams.length === 0) {
            this.emit('stream', new MediaStream([ev.track]));
            return;
        }
        this.emit('stream', ev.streams[0]);
    }

    public async signal(data: string) {
        if (!this.pc) {
            throw new Error('peer has been destroyed');
        }

        const msg = JSON.parse(data);

        if (msg.type === 'offer' && (this.makingOffer || this.pc?.signalingState !== 'stable')) {
            this.logDebug('signaling conflict, we are polite, proceeding...');
        }

        switch (msg.type) {
        case 'candidate':
            await this.pc.addIceCandidate(msg.candidate);
            break;
        case 'offer':
            await this.pc.setRemoteDescription(msg);
            await this.pc.setLocalDescription();
            this.emit('answer', this.pc.localDescription);
            break;
        case 'answer':
            await this.pc.setRemoteDescription(msg);
            break;
        default:
            throw new Error('invalid signaling data received');
        }
    }

    public async addTrack(track: MediaStreamTrack, stream: MediaStream) {
        if (!this.pc) {
            throw new Error('peer has been destroyed');
        }
        const sender = await this.pc.addTrack(track, stream);
        if (sender) {
            this.senders[track.id] = sender;
        }
    }

    public addStream(stream: MediaStream) {
        stream.getTracks().forEach((track: MediaStreamTrack) => {
            this.addTrack(track, stream);
        });
    }

    public replaceTrack(oldTrackID: string, newTrack: MediaStreamTrack | null) {
        const sender = this.senders[oldTrackID];
        if (!sender) {
            throw new Error('sender for track not found');
        }
        if (newTrack && newTrack.id !== oldTrackID) {
            delete this.senders[oldTrackID];
            this.senders[newTrack.id] = sender;
        }
        sender.replaceTrack(newTrack);
    }

    public getStats() {
        if (!this.pc) {
            throw new Error('peer has been destroyed');
        }
        return this.pc.getStats(null);
    }

    public destroy() {
        if (!this.pc) {
            throw new Error('peer has been destroyed already');
        }

        this.removeAllListeners('candidate');
        this.removeAllListeners('connect');
        this.removeAllListeners('error');
        this.removeAllListeners('close');
        this.removeAllListeners('offer');
        this.removeAllListeners('answer');
        this.removeAllListeners('stream');
        this.pc.onnegotiationneeded = null;
        this.pc.onicecandidate = null;
        this.pc.oniceconnectionstatechange = null;
        this.pc.onconnectionstatechange = null;
        this.pc.ontrack = null;
        this.pc.close();
        this.pc = null;
        this.connected = false;
    }
}
