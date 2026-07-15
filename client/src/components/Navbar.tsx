import React, {useEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';

interface NavbarProps {
    barTitle: string;
    onBackClick: () => void;
    children?: React.ReactNode;
}

function Navbar({onBackClick, barTitle, children}: NavbarProps) {
    const {t} = useTranslation();

    const titleRef = useRef<HTMLDivElement>(null);
    const [shouldAnimate, setShouldAnimate] = useState(false);

    useEffect(() => {
        const el = titleRef.current;
        if (el) {
            setShouldAnimate(el.scrollWidth > el.clientWidth);
        }
    }, [children]);


    return (
        <nav className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#0d0e11]/80 backdrop-blur-xl">
            <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-10">
                <div className="flex h-[4.5rem] items-center gap-4">
                    <button
                        onClick={onBackClick}
                        aria-label={t('common.back')}
                        title={t('common.back')}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.045] text-white/65 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                        </svg>
                    </button>
                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-300">{barTitle}</span>
                        <div ref={titleRef} className="marquee-container relative max-w-full flex-1 overflow-hidden"
                             style={{overflow: "hidden", whiteSpace: "nowrap", maxWidth: "100%"}}>
                            <div style={{display: "inline-block"}}
                                 className={`inline-flex whitespace-nowrap text-sm font-bold text-white ${shouldAnimate ? 'animate-marquee' : ''}`}>
                                {children}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
