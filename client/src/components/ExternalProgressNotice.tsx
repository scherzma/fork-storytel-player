import React from 'react';
import {useTranslation} from 'react-i18next';
import {ListeningHistoryEntry} from '../interfaces/listeningHistory';
import {formatTime} from '../utils/helpers';

interface ExternalProgressNoticeProps {
    entry: ListeningHistoryEntry | null;
    onRestore: () => void;
    onDismiss: () => void;
    className?: string;
}

function ExternalProgressNotice({entry, onRestore, onDismiss, className = ''}: ExternalProgressNoticeProps) {
    const {t} = useTranslation();
    if (!entry) return null;

    return (
        <div className={`rounded-2xl border border-sky-300/20 bg-[#15202a]/95 p-3 text-white shadow-2xl backdrop-blur-xl ${className}`} role="status">
            <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 7h10M7 7l3-3M7 7l3 3m7 7H7m10 0-3-3m3 3-3 3"/>
                    </svg>
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{t('listeningHistory.syncedTitle')}</span>
                    <span className="block text-xs text-white/50">{t('listeningHistory.syncedDetail', {time: formatTime(entry.toPosition)})}</span>
                </span>
                <button type="button" onClick={onRestore} className="shrink-0 rounded-lg bg-sky-400/15 px-3 py-2 text-xs font-bold text-sky-200 transition hover:bg-sky-400/25">
                    {t('listeningHistory.returnTo', {time: formatTime(entry.fromPosition)})}
                </button>
                <button type="button" onClick={onDismiss} aria-label={t('common.close')} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/10 hover:text-white">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m6 6 12 12M18 6 6 18"/></svg>
                </button>
            </div>
        </div>
    );
}

export default ExternalProgressNotice;
