import React from 'react';
import { useTranslation } from 'react-i18next';

interface ErrorStateProps {
  error: any;
  onRetry?: () => void;
  onLogout?: () => void;
}

function ErrorState({ error, onRetry, onLogout }: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0d0e11] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-40 -top-48 h-[34rem] w-[34rem] rounded-full bg-red-600/[0.07] blur-3xl" />
      </div>
      <div className="relative mx-auto w-full max-w-md px-6 text-center">
        <span className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-300" aria-hidden="true">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.008v.008H12v-.008Z" />
          </svg>
        </span>
        <h2 className="mb-2 text-xl font-bold">{t('errorState.title')}</h2>
        <p className="mb-7 text-sm leading-6 text-white/50">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgba(249,115,22,0.2)] transition hover:bg-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-500/25"
          >
            {t('errorState.tryAgain')}
          </button>
        )}
        {onLogout && (
          <div className="mt-9">
            <p className="mb-3 text-xs text-white/40">{t('errorState.logoutHint')}</p>
            <button
              onClick={onLogout}
              className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              {t('errorState.logout')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ErrorState;
