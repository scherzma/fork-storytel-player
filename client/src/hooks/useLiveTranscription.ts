import {RefObject, useCallback, useEffect, useRef, useState} from 'react';
import {TranscriptSegment, TranscriptionStatus, TranscriptionWorkerMessage} from '../interfaces/transcription';

const SAMPLE_RATE = 16_000;
const WINDOW_SECONDS = 10;
const TARGET_SAMPLES = SAMPLE_RATE * WINDOW_SECONDS;

type CapturableAudioElement = HTMLAudioElement & {
    captureStream?: () => MediaStream;
};

interface QueuedAudio {
    audio: Float32Array;
    startTime: number;
    endTime: number;
    sessionId: number;
}

interface UseLiveTranscriptionProps {
    audioRef: RefObject<HTMLAudioElement | null>;
    bookId: string | null;
    language?: string;
}

export function useLiveTranscription({audioRef, bookId, language}: UseLiveTranscriptionProps) {
    const workerRef = useRef<Worker | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const silentGainRef = useRef<GainNode | null>(null);
    const capturedBuffersRef = useRef<Float32Array[]>([]);
    const capturedSamplesRef = useRef(0);
    const pendingRef = useRef<QueuedAudio | null>(null);
    const activeRequestRef = useRef<QueuedAudio | null>(null);
    const enabledRef = useRef(false);
    const readyRef = useRef(false);
    const sessionRef = useRef(0);
    const languageRef = useRef(language);
    languageRef.current = language;

    const [status, setStatus] = useState<TranscriptionStatus>('idle');
    const [progress, setProgress] = useState(0);
    const [segments, setSegments] = useState<TranscriptSegment[]>([]);
    const [isEnabled, setIsEnabled] = useState(false);

    const resetCaptureBuffer = useCallback(() => {
        capturedBuffersRef.current = [];
        capturedSamplesRef.current = 0;
        pendingRef.current = null;
    }, []);

    const stopCapture = useCallback(() => {
        processorRef.current?.disconnect();
        sourceRef.current?.disconnect();
        silentGainRef.current?.disconnect();
        processorRef.current = null;
        sourceRef.current = null;
        silentGainRef.current = null;
        if (audioContextRef.current) void audioContextRef.current.close();
        audioContextRef.current = null;
        resetCaptureBuffer();
    }, [resetCaptureBuffer]);

    const sendNext = useCallback((queued: QueuedAudio) => {
        if (!workerRef.current || !readyRef.current) return;
        activeRequestRef.current = queued;
        setStatus('processing');
        workerRef.current.postMessage({
            type: 'transcribe',
            audio: queued.audio,
            language: languageRef.current,
        }, [queued.audio.buffer]);
    }, []);

    const queueCapturedAudio = useCallback(() => {
        const element = audioRef.current;
        if (!element || capturedSamplesRef.current < TARGET_SAMPLES) return;

        const merged = new Float32Array(capturedSamplesRef.current);
        let offset = 0;
        for (const buffer of capturedBuffersRef.current) {
            merged.set(buffer, offset);
            offset += buffer.length;
        }
        capturedBuffersRef.current = [];
        capturedSamplesRef.current = 0;

        const bookSeconds = WINDOW_SECONDS * element.playbackRate;
        const queued: QueuedAudio = {
            audio: merged,
            startTime: Math.max(0, element.currentTime - bookSeconds),
            endTime: element.currentTime,
            sessionId: sessionRef.current,
        };
        if (activeRequestRef.current) pendingRef.current = queued;
        else sendNext(queued);
    }, [audioRef, sendNext]);

    const startCapture = useCallback(async () => {
        if (!enabledRef.current || !readyRef.current || processorRef.current) return;
        const element = audioRef.current as CapturableAudioElement | null;
        if (!element?.captureStream) {
            setStatus('unsupported');
            return;
        }
        try {
            const stream = element.captureStream();
            if (!stream.getAudioTracks().length) {
                setStatus('ready');
                return;
            }
            const context = new AudioContext({sampleRate: SAMPLE_RATE});
            const source = context.createMediaStreamSource(stream);
            const processor = context.createScriptProcessor(4096, 1, 1);
            const silentGain = context.createGain();
            silentGain.gain.value = 0;
            processor.onaudioprocess = event => {
                if (!enabledRef.current || element.paused) return;
                const samples = new Float32Array(event.inputBuffer.getChannelData(0));
                capturedBuffersRef.current.push(samples);
                capturedSamplesRef.current += samples.length;
                queueCapturedAudio();
            };
            source.connect(processor);
            processor.connect(silentGain);
            silentGain.connect(context.destination);
            audioContextRef.current = context;
            sourceRef.current = source;
            processorRef.current = processor;
            silentGainRef.current = silentGain;
            await context.resume();
            setStatus(element.paused ? 'ready' : 'listening');
        } catch (captureError) {
            console.warn('Unable to capture the transcription audio stream', captureError);
            setStatus('error');
        }
    }, [audioRef, queueCapturedAudio]);

    const ensureWorker = useCallback(() => {
        if (workerRef.current) return workerRef.current;
        const worker = new Worker(new URL('../workers/transcription.worker.ts', import.meta.url), {type: 'module'});
        workerRef.current = worker;
        worker.addEventListener('message', (event: MessageEvent<TranscriptionWorkerMessage>) => {
            const message = event.data;
            if (message.status === 'loading' && enabledRef.current) setStatus('loading');
            if (message.status === 'progress') setProgress(Math.max(0, Math.min(100, message.progress || 0)));
            if (message.status === 'ready') {
                readyRef.current = true;
                if (enabledRef.current) {
                    setStatus('ready');
                    void startCapture();
                } else {
                    setStatus('idle');
                }
            }
            if (message.status === 'start' && enabledRef.current) setStatus('processing');
            if (message.status === 'complete') {
                const request = activeRequestRef.current;
                const text = message.output?.trim();
                const requestIsCurrent = request?.sessionId === sessionRef.current && enabledRef.current;
                if (requestIsCurrent && request && text) {
                    setSegments(previous => [...previous, {
                        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        text,
                        startTime: request.startTime,
                        endTime: request.endTime,
                    }].slice(-100));
                }
                activeRequestRef.current = null;
                const pending = pendingRef.current;
                pendingRef.current = null;
                if (pending?.sessionId === sessionRef.current && enabledRef.current) sendNext(pending);
                else if (enabledRef.current) setStatus(audioRef.current?.paused ? 'ready' : 'listening');
                else setStatus('idle');
            }
            if (message.status === 'error') {
                activeRequestRef.current = null;
                console.warn('Local transcription failed', message.message);
                if (enabledRef.current) setStatus('error');
            }
        });
        worker.addEventListener('error', event => {
            console.warn('Transcription worker failed', event.message);
            if (enabledRef.current) setStatus('error');
        });
        return worker;
    }, [audioRef, sendNext, startCapture]);

    const start = useCallback(() => {
        sessionRef.current += 1;
        enabledRef.current = true;
        setIsEnabled(true);
        const worker = ensureWorker();
        if (readyRef.current) void startCapture();
        else {
            setStatus('loading');
            worker.postMessage({type: 'load'});
        }
    }, [ensureWorker, startCapture]);

    const stop = useCallback(() => {
        sessionRef.current += 1;
        enabledRef.current = false;
        setIsEnabled(false);
        stopCapture();
        setStatus('idle');
    }, [stopCapture]);

    useEffect(() => {
        const element = audioRef.current;
        if (!element) return;
        const handlePlay = () => {
            if (!enabledRef.current || !readyRef.current) return;
            if (!processorRef.current) void startCapture();
            else setStatus('listening');
        };
        const handlePause = () => {
            if (enabledRef.current && !activeRequestRef.current) setStatus('ready');
        };
        const handleSeek = () => resetCaptureBuffer();
        element.addEventListener('play', handlePlay);
        element.addEventListener('pause', handlePause);
        element.addEventListener('seeking', handleSeek);
        return () => {
            element.removeEventListener('play', handlePlay);
            element.removeEventListener('pause', handlePause);
            element.removeEventListener('seeking', handleSeek);
        };
    }, [audioRef, resetCaptureBuffer, startCapture]);

    useEffect(() => {
        sessionRef.current += 1;
        setSegments([]);
        stopCapture();
        if (enabledRef.current && readyRef.current) setStatus('ready');
    }, [bookId, stopCapture]);

    useEffect(() => () => {
        stopCapture();
        workerRef.current?.terminate();
        workerRef.current = null;
    }, [stopCapture]);

    return {
        status,
        progress,
        segments,
        isEnabled,
        start,
        stop,
        reportSourceError: () => {
            if (enabledRef.current) setStatus('error');
        },
        clear: () => setSegments([]),
    };
}
