import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {useNavigate} from 'react-router-dom';
import ConfirmLogoutModal from './ConfirmLogoutModal';
import SettingsModal from './SettingsModal';

interface DashboardHeaderProps {
  onLogout: () => void;
  triggerLogout?: boolean;
  setTriggerLogout?: (value: boolean) => void;
  activeView?: 'library' | 'discover';
}

function DashboardHeader({ onLogout, triggerLogout, setTriggerLogout, activeView = 'library' }: DashboardHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    if (triggerLogout) {
      setShowConfirmModal(true);
      if (setTriggerLogout) {
        setTriggerLogout(false);
      }
    }
  }, [triggerLogout, setTriggerLogout]);

  const handleSettingsClick = () => {
    setShowSettingsModal(true);
  };

  const handleLogoutClick = () => {
    setShowSettingsModal(false);
    setShowConfirmModal(true);
  };

  const handleConfirmLogout = () => {
    setShowConfirmModal(false);
    onLogout();
  };

  const handleCancelLogout = () => {
    setShowConfirmModal(false);
  };

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#0d0e11]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-10">
          <div className="flex h-[4.5rem] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-lg">
                  <img src={'assets/icon.png'} alt="" className="h-10 w-10"/>
                </span>
                <span className="hidden truncate text-sm font-black tracking-tight text-white sm:block">Storytel Player</span>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2">
              <div className="flex rounded-xl border border-white/[0.07] bg-white/[0.045] p-1" role="navigation" aria-label={t('navigation.main')}>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition sm:px-4 sm:text-sm ${
                    activeView === 'library' ? 'bg-white text-[#141519] shadow-md' : 'text-white/55 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <svg className="hidden h-4 w-4 sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 5.75A2.75 2.75 0 0 1 7.75 3h8.5A2.75 2.75 0 0 1 19 5.75V21l-7-4-7 4V5.75Z" /></svg>
                  {t('navigation.library')}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/discover')}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition sm:px-4 sm:text-sm ${
                    activeView === 'discover' ? 'bg-white text-[#141519] shadow-md' : 'text-white/55 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <svg className="hidden h-4 w-4 sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3.5 14.25 9 20 11.25 14.25 13.5 12 19l-2.25-5.5L4 11.25 9.75 9 12 3.5Z" /></svg>
                  {t('navigation.discover')}
                </button>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleSettingsClick}
                aria-label={t('dashboard.settings')}
                title={t('dashboard.settings')}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.045] text-white/65 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onLogout={handleLogoutClick}
      />
      <ConfirmLogoutModal
        isOpen={showConfirmModal}
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
      />
    </>
  );
}

export default DashboardHeader;
