import React, {useEffect, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {TranscriptSegment, TranscriptWord, TranscriptionStatus} from '../interfaces/transcription';
import Modal from './Modal';

interface TranscriptionPanelProps {
    isOpen: boolean;
    status: TranscriptionStatus;
    progress: number;
    segments: TranscriptSegment[];
    isEnabled: boolean;
    currentTime: number;
    onStart: () => void;
    onStop: () => void;
    onClear: () => void;
    onSeek: (time: number) => void;
    onClose: () => void;
}

function TranscriptionPanel({
    isOpen,
    status,
    progress,
    segments,
    isEnabled,
    currentTime,
    onStart,
    onStop,
    onClear,
    onSeek,
    onClose,
}: TranscriptionPanelProps) {
    const {t} = useTranslation();
    const endRef = useRef<HTMLDivElement>(null);
    const activeWordRef = useRef<HTMLButtonElement>(null);
    const words = segments.flatMap(segment => segment.words);
    const activeWord = [...words].reverse().find(word => word.startTime <= currentTime && currentTime <= word.endTime + 1.5);

    useEffect(() => {
        if (!isOpen) return;
        if (activeWord) {
            activeWordRef.current?.scrollIntoView({behavior: 'smooth', block: 'center'});
        } else if (isEnabled) {
            endRef.current?.scrollIntoView({behavior: 'smooth', block: 'nearest'});
        }
    }, [activeWord?.id, isEnabled, isOpen, words.length]);

    const statusLabel = t(`transcription.status.${status}`);

    const renderWord = (word: TranscriptWord) => {
        const isActive = activeWord?.id === word.id;
        const isPast = word.endTime < currentTime;
        return (
            <button
                key={word.id}
                ref={isActive ? activeWordRef : undefined}
                type="button"
                onClick={() => onSeek(word.startTime)}
                className={`rounded-md px-1 py-0.5 text-left leading-8 transition ${isActive ? 'bg-orange-500 text-white shadow-[0_0_18px_rgba(249,115,22,0.25)]' : isPast ? 'text-white/42 hover:bg-white/[0.06] hover:text-white/70' : 'text-white/80 hover:bg-white/[0.06] hover:text-white'}`}
            >
                {word.text.trim()}
            </button>
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('transcription.title')}
            maxWidth="max-w-3xl"
            zIndex={70}
            headerActions={segments.length > 0 ? (
                <button type="button" onClick={onClear} className="rounded-lg px-3 py-2 text-xs font-bold text-white/50 transition hover:bg-white/10 hover:text-white">
                    {t('transcription.clear')}
                </button>
            ) : undefined}
        >
            <div className="space-y-5">
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className={`h-2.5 w-2.5 rounded-full ${status === 'error' || status === 'unsupported' ? 'bg-red-400' : isEnabled ? 'animate-pulse bg-orange-400' : 'bg-white/25'}`} />
                                <p className="font-bold text-white">{statusLabel}</p>
                            </div>
                            <p className="mt-1 text-sm leading-5 text-white/45">{t('transcription.localPrivacy')}</p>
                        </div>
                        <button
                            type="button"
                            data-testid="transcription-toggle"
                            onClick={isEnabled ? onStop : onStart}
                            disabled={status === 'loading'}
                            className={`h-11 shrink-0 rounded-xl px-5 text-sm font-bold transition disabled:cursor-wait disabled:opacity-60 ${isEnabled ? 'border border-white/10 bg-white/[0.06] text-white/75 hover:bg-white/10' : 'bg-orange-500 text-white hover:bg-orange-400'}`}
                        >
                            {t(isEnabled ? 'transcription.stop' : 'transcription.start')}
                        </button>
                    </div>
                    {status === 'loading' && (
                        <div className="mt-4">
                            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                                <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-300 transition-all" style={{width: `${progress}%`}} />
                            </div>
                            <p className="mt-2 text-xs text-white/40">{t('transcription.modelDownload', {progress: Math.round(progress)})}</p>
                        </div>
                    )}
                    {(status === 'error' || status === 'unsupported') && (
                        <p className="mt-3 rounded-xl border border-red-300/15 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                            {status === 'unsupported' ? t('transcription.unsupported') : t('transcription.failed')}
                        </p>
                    )}
                </div>

                <div className="max-h-[52vh] min-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-[#101116] p-5 sm:p-7">
                    {segments.length === 0 ? (
                        <div className="flex min-h-64 flex-col items-center justify-center text-center">
                            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-300">
                                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M4 6h16M4 12h10M4 18h13"/></svg>
                            </span>
                            <p className="font-bold text-white">{t('transcription.empty')}</p>
                            <p className="mt-2 max-w-md text-sm leading-6 text-white/40">{t('transcription.emptyHint')}</p>
                        </div>
                    ) : (
                        <div className="text-[17px] leading-8" aria-live="polite">
                            {segments.map(segment => segment.words.length > 0 ? (
                                <React.Fragment key={segment.id}>{segment.words.map(renderWord)}{' '}</React.Fragment>
                            ) : (
                                <button key={segment.id} type="button" onClick={() => onSeek(segment.startTime)} className="rounded-md px-1 py-0.5 text-left leading-8 text-white/75 transition hover:bg-white/[0.06] hover:text-white">
                                    {segment.text}
                                </button>
                            ))}
                            <div ref={endRef} />
                        </div>
                    )}
                </div>

                <p className="text-xs leading-5 text-white/35">{t('transcription.experimentalNote')}</p>
            </div>
        </Modal>
    );
}

export default TranscriptionPanel;
