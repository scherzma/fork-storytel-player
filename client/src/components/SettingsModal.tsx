import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import api from '../utils/api';
import LogsModal from './LogsModal';
import Modal from './Modal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

function SettingsModal({isOpen, onClose, onLogout}: SettingsModalProps) {
  const {t, i18n} = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [appLanguage, setAppLanguage] = useState('auto');

  useEffect(() => {
    if (!isOpen) return;
    void fetchAccountInfo();
    void fetchAlwaysOnTopSetting();
    void fetchAppLanguage();
  }, [isOpen]);

  const fetchAccountInfo = async () => {
    try {
      setLoading(true);
      const response = await api.get('/account');
      setEmail(response.data.email);
    } catch (error) {
      console.error('Failed to fetch account info:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlwaysOnTopSetting = async () => {
    try {
      if (window.electronWindow) setAlwaysOnTop(await window.electronWindow.isAlwaysOnTop());
    } catch (error) {
      console.error('Failed to fetch always on top setting:', error);
    }
  };

  const fetchAppLanguage = async () => {
    try {
      if (window.electronStore) setAppLanguage(await window.electronStore.get('appLanguage') || 'auto');
    } catch (error) {
      console.error('Failed to fetch app language setting:', error);
    }
  };

  const handleAlwaysOnTopToggle = async () => {
    try {
      if (!window.electronWindow) return;
      const newValue = !alwaysOnTop;
      await window.electronWindow.setAlwaysOnTop(newValue);
      setAlwaysOnTop(newValue);
    } catch (error) {
      console.error('Failed to toggle always on top:', error);
    }
  };

  const handleLanguageChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = event.target.value;
    setAppLanguage(newLanguage);
    try {
      if (!window.electronLocale?.setLocale) return;
      await window.electronLocale.setLocale(newLanguage);
      if (newLanguage !== 'auto') {
        await i18n.changeLanguage(newLanguage);
        return;
      }
      const electronLocale = await window.electronLocale.getLocale();
      const languageCode = electronLocale.split('-')[0];
      const supported = ['en', 'it', 'fr', 'es', 'de', 'sv'];
      await i18n.changeLanguage(supported.includes(languageCode) ? languageCode : 'en');
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  if (!isOpen) return null;

  const externalLinks = [
    {label: t('settings.githubRepo'), href: 'https://github.com/debba/storytel-player'},
    {label: t('settings.discordCommunity'), href: 'https://discord.gg/YrZPHAwMSG'},
  ];

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={t('settings.title')} maxWidth="max-w-3xl">
        <div className="space-y-7">
          <section>
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 text-orange-300">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 3v2m0 14v2M3 12h2m14 0h2M5.64 5.64l1.42 1.42m9.88 9.88 1.42 1.42m0-12.72-1.42 1.42M7.06 16.94l-1.42 1.42M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"/></svg>
              </span>
              <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-white/55">{t('settings.appearance')}</h3>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
              <div className="flex items-center justify-between gap-6 p-5">
                <div>
                  <p className="font-semibold text-white">{t('settings.alwaysOnTop')}</p>
                  <p className="mt-1 text-sm leading-5 text-white/45">{t('settings.alwaysOnTopDescription')}</p>
                </div>
                <button type="button" role="switch" aria-checked={alwaysOnTop} onClick={handleAlwaysOnTopToggle} className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition focus:outline-none focus:ring-4 focus:ring-orange-500/20 ${alwaysOnTop ? 'bg-orange-500' : 'bg-white/15'}`}>
                  <span className={`h-5 w-5 rounded-full bg-white shadow-md transition-transform ${alwaysOnTop ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="flex flex-col gap-4 border-t border-white/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-white">{t('settings.language')}</p>
                  <p className="mt-1 text-sm leading-5 text-white/45">{t('settings.languageDescription')}</p>
                </div>
                <select value={appLanguage} onChange={handleLanguageChange} className="h-11 min-w-44 rounded-xl border border-white/10 bg-[#101116] px-3 text-sm font-semibold text-white outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10">
                  <option value="auto">{t('settings.languageAuto')}</option>
                  <option value="en">{t('settings.languages.en')}</option>
                  <option value="it">{t('settings.languages.it')}</option>
                  <option value="fr">{t('settings.languages.fr')}</option>
                  <option value="es">{t('settings.languages.es')}</option>
                  <option value="de">{t('settings.languages.de')}</option>
                  <option value="sv">{t('settings.languages.sv')}</option>
                </select>
              </div>
            </div>
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <section>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-white/55">{t('settings.community')}</h3>
              <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.035] p-2">
                {externalLinks.map(item => (
                  <button key={item.href} type="button" onClick={() => window.open(item.href, '_blank', 'noopener,noreferrer')} className="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left text-sm font-semibold text-white/80 transition hover:bg-white/[0.07] hover:text-white">
                    {item.label}
                    <svg className="h-4 w-4 text-white/35" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5h5v5m0-5-9 9M5 9v10h10"/></svg>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-white/55">{t('settings.developer')}</h3>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-2">
                <button type="button" onClick={() => setShowLogsModal(true)} className="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left text-sm font-semibold text-white/80 transition hover:bg-white/[0.07] hover:text-white">
                  {t('settings.viewLogs')}
                  <svg className="h-4 w-4 text-white/35" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 3h10a2 2 0 0 1 2 2v14H5V5a2 2 0 0 1 2-2Zm2 5h6m-6 4h6m-6 4h4"/></svg>
                </button>
              </div>
            </section>
          </div>

          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-white/55">{t('settings.account')}</h3>
            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.05] to-white/[0.025] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-white/35">{t('settings.email')}</p>
                <p className="mt-1 truncate font-semibold text-white">{loading ? t('common.loading') : email || '-'}</p>
              </div>
              <button type="button" onClick={onLogout} className="h-11 shrink-0 rounded-xl border border-red-300/20 bg-red-500/10 px-5 text-sm font-bold text-red-200 transition hover:bg-red-500/20 focus:outline-none focus:ring-4 focus:ring-red-500/15">
                {t('settings.logout')}
              </button>
            </div>
          </section>
        </div>
      </Modal>

      <LogsModal isOpen={showLogsModal} onClose={() => setShowLogsModal(false)} />
    </>
  );
}

export default SettingsModal;
