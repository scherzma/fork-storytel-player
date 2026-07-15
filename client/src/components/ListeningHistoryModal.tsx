import React from 'react';
import {useTranslation} from 'react-i18next';
import Modal from './Modal';
import {ListeningHistoryEntry} from '../interfaces/listeningHistory';
import {formatTime} from '../utils/helpers';

interface ListeningHistoryModalProps {
    isOpen: boolean;
    entries: ListeningHistoryEntry[];
    onClose: () => void;
    onRestore: (entry: ListeningHistoryEntry) => void;
    onClear: () => void;
}

function ListeningHistoryModal({isOpen, entries, onClose, onRestore, onClear}: ListeningHistoryModalProps) {
    const {t} = useTranslation();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('listeningHistory.title')}
            maxWidth="max-w-xl"
            headerActions={entries.length > 0 ? (
                <button
                    type="button"
                    onClick={onClear}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white/50 transition hover:bg-white/10 hover:text-white"
                >
                    {t('listeningHistory.clear')}
                </button>
            ) : undefined}
        >
            <p className="mb-5 text-sm leading-6 text-white/55">{t('listeningHistory.description')}</p>

            {entries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] px-6 py-10 text-center">
                    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05] text-white/40">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2"/>
                        </svg>
                    </div>
                    <p className="font-semibold text-white/75">{t('listeningHistory.empty')}</p>
                    <p className="mt-1 text-sm text-white/40">{t('listeningHistory.emptyHint')}</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {entries.map(entry => (
                        <button
                            key={entry.id}
                            type="button"
                            onClick={() => onRestore(entry)}
                            className="group flex w-full items-center gap-4 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-left transition hover:border-orange-300/25 hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-orange-400"
                        >
                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${entry.reason === 'deviceSync' ? 'bg-sky-500/15 text-sky-300' : 'bg-orange-500/10 text-orange-300'}`}>
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d={entry.reason === 'deviceSync' ? 'M7 7h10M7 7l3-3M7 7l3 3m7 7H7m10 0-3-3m3 3-3 3' : 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2'}/>
                                </svg>
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className="font-semibold text-white">{t(`listeningHistory.reasons.${entry.reason}`)}</span>
                                    {entry.reason === 'deviceSync' && (
                                        <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-300">
                                            {t('listeningHistory.otherDevice')}
                                        </span>
                                    )}
                                </span>
                                <span className="mt-0.5 block text-xs text-white/40">
                                    {t('listeningHistory.jumpDetail', {
                                        from: formatTime(entry.fromPosition),
                                        to: formatTime(entry.toPosition),
                                        date: new Date(entry.createdAt).toLocaleString(undefined, {dateStyle: 'short', timeStyle: 'short'}),
                                    })}
                                </span>
                            </span>
                            <span className="shrink-0 rounded-lg bg-white/[0.05] px-3 py-1.5 text-xs font-bold tabular-nums text-white/65 transition group-hover:bg-orange-500/15 group-hover:text-orange-200">
                                {t('listeningHistory.restore', {time: formatTime(entry.fromPosition)})}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </Modal>
    );
}

export default ListeningHistoryModal;
