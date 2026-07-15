/// <reference lib="webworker" />

import {env, pipeline, type AutomaticSpeechRecognitionPipelineType} from '@huggingface/transformers';

const MODEL_ID = 'onnx-community/whisper-tiny_timestamped';
const SAMPLE_RATE = 16_000;

env.allowLocalModels = false;
env.useBrowserCache = true;

let transcriberPromise: Promise<AutomaticSpeechRecognitionPipelineType> | null = null;
let isProcessing = false;

interface PipelineProgress {
    progress?: number;
}

interface TimestampChunk {
    text: string;
    timestamp: [number, number];
}

interface AsrResult {
    text: string;
    chunks?: TimestampChunk[];
}

interface PipelineOptions {
    device: 'webgpu' | 'wasm';
    dtype: 'q4' | 'q8';
    progress_callback: (progress: PipelineProgress) => void;
}

const createAsrPipeline = pipeline as unknown as (
    task: 'automatic-speech-recognition',
    model: string,
    options: PipelineOptions,
) => Promise<AutomaticSpeechRecognitionPipelineType>;

const send = (message: Record<string, unknown>) => self.postMessage(message);

const getTranscriber = () => {
    if (!transcriberPromise) {
        const hasWebGpu = 'gpu' in navigator;
        transcriberPromise = createAsrPipeline('automatic-speech-recognition', MODEL_ID, {
            device: hasWebGpu ? 'webgpu' : 'wasm',
            dtype: hasWebGpu ? 'q4' : 'q8',
            progress_callback: progress => {
                const value = typeof progress.progress === 'number' ? progress.progress : undefined;
                send({status: 'progress', progress: value});
            },
        });
    }
    return transcriberPromise;
};

const load = async () => {
    try {
        send({status: 'loading'});
        await getTranscriber();
        send({status: 'ready'});
    } catch (error) {
        transcriberPromise = null;
        send({status: 'error', message: error instanceof Error ? error.message : String(error)});
    }
};

const getFirstResult = (result: unknown): AsrResult =>
    (Array.isArray(result) ? result[0] : result) as AsrResult;

const approximateWordTimestamps = (text: string, duration: number) => {
    const tokens = text.trim().split(/\s+/).filter(Boolean);
    const step = tokens.length > 0 ? duration / tokens.length : 0;
    return tokens.map((token, index) => ({
        text: `${index === 0 ? '' : ' '}${token}`,
        startTime: index * step,
        endTime: Math.min(duration, (index + 1) * step),
    }));
};

const restoreNaturalPlaybackSpeed = (audio: Float32Array, playbackRate: number) => {
    if (!Number.isFinite(playbackRate) || Math.abs(playbackRate - 1) < 0.01) return audio;
    const safeRate = Math.max(0.5, Math.min(2, playbackRate));
    const restored = new Float32Array(Math.max(1, Math.round(audio.length * safeRate)));
    for (let index = 0; index < restored.length; index += 1) {
        const sourcePosition = index / safeRate;
        const leftIndex = Math.min(audio.length - 1, Math.floor(sourcePosition));
        const rightIndex = Math.min(audio.length - 1, leftIndex + 1);
        const fraction = sourcePosition - leftIndex;
        restored[index] = audio[leftIndex] * (1 - fraction) + audio[rightIndex] * fraction;
    }
    return restored;
};

const transcribe = async (audio: Float32Array, language?: string, discardBeforeSeconds = 0, playbackRate = 1) => {
    if (isProcessing) return;
    isProcessing = true;
    send({status: 'start'});
    try {
        const transcriber = await getTranscriber();
        const normalizedAudio = restoreNaturalPlaybackSpeed(audio, playbackRate);
        let first: AsrResult;
        let timestampedChunks: TimestampChunk[] = [];
        try {
            const result = await transcriber(normalizedAudio, {
                task: 'transcribe',
                return_timestamps: 'word',
                ...(language ? {language} : {}),
            });
            first = getFirstResult(result);
            timestampedChunks = first?.chunks || [];
        } catch (timestampError) {
            console.warn('Word timestamps are unavailable; continuing with approximate timing', timestampError);
            const result = await transcriber(normalizedAudio, {
                task: 'transcribe',
                ...(language ? {language} : {}),
            });
            first = getFirstResult(result);
        }
        const rawWords = timestampedChunks.length > 0
            ? timestampedChunks.map(chunk => ({
                text: chunk.text,
                startTime: chunk.timestamp[0],
                endTime: chunk.timestamp[1],
            }))
            : approximateWordTimestamps(first?.text || '', normalizedAudio.length / SAMPLE_RATE);
        const words = rawWords.filter(word => word.startTime >= Math.max(0, discardBeforeSeconds - 0.08));
        const output = words.length > 0
            ? words.map(word => word.text).join('').trim()
            : discardBeforeSeconds === 0 ? first?.text?.trim() || '' : '';
        send({status: 'complete', output, words});
    } catch (error) {
        send({status: 'error', message: error instanceof Error ? error.message : String(error)});
    } finally {
        isProcessing = false;
    }
};

self.addEventListener('message', event => {
    const {type, audio, language, discardBeforeSeconds, playbackRate} = event.data as {
        type: string;
        audio?: Float32Array;
        language?: string;
        discardBeforeSeconds?: number;
        playbackRate?: number;
    };
    if (type === 'load') void load();
    if (type === 'transcribe' && audio) void transcribe(audio, language, discardBeforeSeconds, playbackRate);
});

export {};
