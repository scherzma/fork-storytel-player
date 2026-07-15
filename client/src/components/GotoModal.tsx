import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';

interface GotoModalProps {
  isOpen: boolean;
  playbackRate: number;
  gotoHours: number;
  gotoMinutes: number;
  gotoSeconds: number;
  onClose: () => void;
  onHoursChange: (hours: number) => void;
  onMinutesChange: (minutes: number) => void;
  onSecondsChange: (seconds: number) => void;
  onGoto: () => void;
}

function GotoModal({
  isOpen,
  playbackRate,
  gotoHours,
  gotoMinutes,
  gotoSeconds,
  onClose,
  onHoursChange,
  onMinutesChange,
  onSecondsChange,
  onGoto
}: GotoModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('gotoModal.title')}>
      <div className="flex flex-col gap-4">

        <div className="mb-6">
          <p className="text-sm text-white/50 mb-4">
            {t('gotoModal.description', { speed: playbackRate })}
          </p>

          <div className="flex items-center space-x-4 justify-center">
            {/* Hours */}
            <div className="text-center">
              <label className="block text-sm text-white/70 mb-2">{t('gotoModal.hours')}</label>
              <input
                type="number"
                min="0"
                max="23"
                value={gotoHours}
                onChange={(e) => onHoursChange(parseInt(e.target.value) || 0)}
                className="w-16 px-2 py-2 border border-white/10 bg-black/25 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <span className="text-white text-xl mt-6">:</span>

            {/* Minutes */}
            <div className="text-center">
              <label className="block text-sm text-white/70 mb-2">{t('gotoModal.minutes')}</label>
              <input
                type="number"
                min="0"
                max="59"
                value={gotoMinutes}
                onChange={(e) => onMinutesChange(parseInt(e.target.value) || 0)}
                className="w-16 px-2 py-2 border border-white/10 bg-black/25 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <span className="text-white text-xl mt-6">:</span>

            {/* Seconds */}
            <div className="text-center">
              <label className="block text-sm text-white/70 mb-2">{t('gotoModal.seconds')}</label>
              <input
                type="number"
                min="0"
                max="59"
                value={gotoSeconds}
                onChange={(e) => onSecondsChange(parseInt(e.target.value) || 0)}
                className="w-16 px-2 py-2 border border-white/10 bg-black/25 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>
        </div>

        <div className="flex space-x-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-white/10 bg-white/[0.045] text-white/70 rounded-xl hover:bg-white/10 hover:text-white transition-colors"
          >
            {t('gotoModal.cancel')}
          </button>
          <button
            onClick={onGoto}
            className="flex-1 px-4 py-2 bg-orange-500 font-bold text-white rounded-xl hover:bg-orange-400 transition-colors"
          >
            {t('gotoModal.go')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default GotoModal;