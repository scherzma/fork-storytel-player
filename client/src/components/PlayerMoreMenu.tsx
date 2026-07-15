import React, {useEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';

interface PlayerMoreMenuProps {
    historyCount: number;
    onShowHistory: () => void;
}

function PlayerMoreMenu({historyCount, onShowHistory}: PlayerMoreMenuProps) {
    const {t} = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const closeOnOutsideClick = (event: PointerEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('pointerdown', closeOnOutsideClick);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('pointerdown', closeOnOutsideClick);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [isOpen]);

    const select = (action: () => void) => {
        setIsOpen(false);
        action();
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(open => !open)}
                aria-label={t('player.moreOptions')}
                aria-expanded={isOpen}
                title={t('player.moreOptions')}
                className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] text-white/60 transition hover:bg-white/10 hover:text-white"
            >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
                {historyCount > 0 && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-white/45"/>}
            </button>
            {isOpen && (
                <div className="absolute bottom-full right-0 z-50 mb-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#202228]/98 p-1.5 shadow-2xl backdrop-blur-xl">
                    <button type="button" onClick={() => select(onShowHistory)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white/75 transition hover:bg-white/[0.08] hover:text-white">
                        <svg className="h-4 w-4 text-white/55" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2"/></svg>
                        <span className="flex-1">{t('listeningHistory.shortTitle')}</span>
                        {historyCount > 0 && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] tabular-nums text-white/55">{historyCount}</span>}
                    </button>
                </div>
            )}
        </div>
    );
}

export default PlayerMoreMenu;
