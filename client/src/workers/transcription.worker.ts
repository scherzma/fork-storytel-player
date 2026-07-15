/// <reference lib="webworker" />

import {env, pipeline, type AutomaticSpeechRecognitionPipelineType} from '@huggingface/transformers';

const MODEL_ID = 'onnx-community/whisper-tiny';

env.allowLocalModels = false;
env.useBrowserCache = true;

let transcriberPromise: Promise<AutomaticSpeechRecognitionPipelineType> | null = null;
let isProcessing = false;

interface PipelineProgress {
    progress?: number;
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

const transcribe = async (audio: Float32Array, language?: string) => {
    if (isProcessing) return;
    isProcessing = true;
    send({status: 'start'});
    try {
        const transcriber = await getTranscriber();
        const result = await transcriber(audio, {
            task: 'transcribe',
            ...(language ? {language} : {}),
        });
        const first = Array.isArray(result) ? result[0] : result;
        send({status: 'complete', output: first?.text?.trim() || ''});
    } catch (error) {
        send({status: 'error', message: error instanceof Error ? error.message : String(error)});
    } finally {
        isProcessing = false;
    }
};

self.addEventListener('message', event => {
    const {type, audio, language} = event.data as {type: string; audio?: Float32Array; language?: string};
    if (type === 'load') void load();
    if (type === 'transcribe' && audio) void transcribe(audio, language);
});

export {};
