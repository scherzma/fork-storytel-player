import React, {useEffect, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {BookShelfEntity} from '../interfaces/books';
import {TranscriptSegment, TranscriptWord, TranscriptionStatus} from '../interfaces/transcription';
import {buildCoverUrl} from '../utils/helpers';

interface InlineReadAlongProps {
    book: BookShelfEntity;
    status: TranscriptionStatus;
    progress: number;
    segments: TranscriptSegment[];
    isEnabled: boolean;
    currentTime: number;
    playbackRate: number;
    onStart: () => void;
    onStop: () => void;
    onSeek: (time: number) => void;
    onExit: () => void;
}

function InlineReadAlong({
    book,
    status,
    progress,
    segments,
    isEnabled,
    currentTime,
    playbackRate,
    onStart,
    onStop,
    onSeek,
    onExit,
}: InlineReadAlongProps) {
    const {t} = useTranslation();
    const focusedWordRef = useRef<HTMLButtonElement>(null);
    const readerRef = useRef<HTMLDivElement>(null);
    const wordFadeDelaysRef = useRef(new Map<string, number>());
    const words = segments.flatMap(segment => segment.words);

    const visibleWordIds = new Set(words.map(word => word.id));
    for (const wordId of wordFadeDelaysRef.current.keys()) {
        if (!visibleWordIds.has(wordId)) wordFadeDelaysRef.current.delete(wordId);
    }
    const unseenWords = words.filter(word => !wordFadeDelaysRef.current.has(word.id));
    if (unseenWords.length > 0) {
        // Backfilled history appears quickly; live batches spread out at speech
        // pace so the reveal flows seamlessly into the next batch's arrival.
        const isBackfill = wordFadeDelaysRef.current.size === 0;
        const batchStartTime = unseenWords[0].startTime;
        const rate = playbackRate > 0 ? playbackRate : 1;
        unseenWords.forEach((word, index) => {
            const delay = isBackfill
                ? Math.min(index * 0.02, 0.5)
                : Math.min(Math.max((word.startTime - batchStartTime) / rate, 0), 8);
            wordFadeDelaysRef.current.set(word.id, delay);
        });
    }
    const activeWord = [...words].reverse().find(word => word.startTime <= currentTime && currentTime <= word.endTime + 1.5);
    const nextWord = words.find(word => word.startTime > currentTime);
    const focusedWord = activeWord || nextWord;

    useEffect(() => {
        const reader = readerRef.current;
        const word = focusedWordRef.current;
        if (!reader || !word) return;
        reader.scrollTo({
            top: word.offsetTop - reader.clientHeight / 2 + word.clientHeight / 2,
            behavior: 'smooth',
        });
    }, [focusedWord?.id]);

    const renderWord = (word: TranscriptWord) => {
        const isActive = activeWord?.id === word.id;
        const isFocused = focusedWord?.id === word.id;
        const isPast = word.endTime < currentTime;
        return (
            <button
                key={word.id}
                ref={isFocused ? focusedWordRef : undefined}
                type="button"
                onClick={() => onSeek(word.startTime)}
                aria-current={isActive ? 'true' : undefined}
                style={{animationDelay: `${wordFadeDelaysRef.current.get(word.id) ?? 0}s`}}
                className={`word-fade-in rounded-lg px-1.5 py-1 text-left transition duration-300 focus:outline-none focus:ring-2 focus:ring-orange-400/60 ${isActive ? 'scale-[1.04] bg-orange-500/10 font-semibold text-orange-200 drop-shadow-[0_0_14px_rgba(251,146,60,0.35)]' : isPast ? 'text-white/[0.22] hover:text-white/50' : 'text-white/[0.72] hover:bg-white/[0.05] hover:text-white'}`}
            >
                {word.text.trim()}
            </button>
        );
    };

    const statusLabel = t(`transcription.status.${status}`);
    const isFailure = status === 'error' || status === 'unsupported';

    return (
        <section className="flex min-h-0 w-full flex-1 flex-col" aria-label={t('transcription.title')}>
            <header className="mx-auto flex w-full max-w-5xl shrink-0 items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3 shadow-2xl sm:gap-4 sm:p-4">
                <img
                    src={buildCoverUrl(book.book.smallCover || book.book.largeCover)}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-xl border border-white/10 object-cover shadow-lg sm:h-20 sm:w-20"
                />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold text-white sm:text-lg">{book.book.name}</p>
                    <p className="mt-1 truncate text-sm text-white/45">{book.book.authorsAsString}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-white/45">
                        <span className={`h-2 w-2 rounded-full ${isFailure ? 'bg-red-400' : isEnabled ? 'animate-pulse bg-orange-400' : 'bg-white/25'}`}/>
                        <span className="truncate">{statusLabel}</span>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={isEnabled ? onStop : onStart}
                    disabled={status === 'loading'}
                    aria-label={t(isEnabled ? 'transcription.stop' : 'transcription.start')}
                    title={t(isEnabled ? 'transcription.stop' : 'transcription.start')}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-wait disabled:opacity-50 sm:w-auto sm:px-4"
                >
                    {isEnabled ? (
                        <svg className="h-3.5 w-3.5 sm:hidden" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h12v12H6z"/></svg>
                    ) : (
                        <svg className="ml-0.5 h-4 w-4 sm:hidden" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
                    )}
                    <span className="hidden sm:inline">{t(isEnabled ? 'transcription.stop' : 'transcription.start')}</span>
                </button>
                <button
                    type="button"
                    onClick={onExit}
                    aria-label={t('transcription.coverView')}
                    title={t('transcription.coverView')}
                    className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-xs font-bold text-white/65 transition hover:bg-white/10 hover:text-white"
                >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19a1 1 0 0 1 1 1v15.5a1.5 1.5 0 0 1-1.5 1.5h-12A2.5 2.5 0 0 1 4 18.5v-13Zm0 13A2.5 2.5 0 0 1 6.5 16H20"/></svg>
                    <span className="hidden md:inline">{t('transcription.coverView')}</span>
                </button>
            </header>

            <div className="relative mx-auto mt-4 min-h-0 w-full max-w-5xl flex-1 overflow-hidden sm:mt-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-[#0d0e11] via-[#0d0e11]/80 to-transparent"/>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-[#0d0e11] via-[#0d0e11]/80 to-transparent"/>
                <div ref={readerRef} className="h-full overflow-y-auto px-3 py-[28vh] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-live="polite">
                    {words.length === 0 ? (
                        <div className="mx-auto flex max-w-lg flex-col items-center justify-center px-6 text-center">
                            {status === 'loading' ? (
                                <>
                                    <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-orange-400"/>
                                    <p className="mt-5 font-bold text-white">{statusLabel}</p>
                                    <div className="mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
                                        <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-300 transition-all" style={{width: `${progress}%`}}/>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <svg className="h-9 w-9 text-orange-300/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M4 6h16M4 12h10M4 18h13"/></svg>
                                    <p className="mt-5 font-bold text-white">{isFailure ? t(status === 'unsupported' ? 'transcription.unsupported' : 'transcription.failed') : t('transcription.empty')}</p>
                                    <p className="mt-2 text-sm leading-6 text-white/40">{t('transcription.emptyHint')}</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="mx-auto max-w-4xl text-left text-[clamp(1rem,1.35vw,1.35rem)] font-medium leading-[1.9] tracking-[-0.01em]" role="region">
                            {segments.map(segment => (
                                <React.Fragment key={segment.id}>
                                    {segment.words.length > 0 ? segment.words.map(renderWord) : (
                                        <button type="button" onClick={() => onSeek(segment.startTime)} className="word-fade-in rounded-lg px-1.5 py-1 text-white/65 hover:bg-white/[0.05] hover:text-white">{segment.text}</button>
                                    )}{' '}
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

export default InlineReadAlong;
