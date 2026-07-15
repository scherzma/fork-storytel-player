import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';

interface PlaybackSpeedModalProps {
  isOpen: boolean;
  playbackRate: number;
  onClose: () => void;
  onRateChange: (rate: number) => void;
}

function PlaybackSpeedModal({ isOpen, playbackRate, onClose, onRateChange }: PlaybackSpeedModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('playbackSpeed.title')}>
      <div className="flex flex-col">

        {/* Preset Speeds */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-white/70 mb-3">{t('playbackSpeed.presets')}</h4>
          <div className="grid grid-cols-3 gap-2">
            {[1.0, 1.25, 1.5, 1.75, 2.0].map((speed) => (
              <button
                key={speed}
                onClick={() => onRateChange(speed)}
                className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                  playbackRate === speed
                    ? 'bg-orange-500 font-bold text-white'
                    : 'bg-white/[0.045] text-white/70 hover:bg-white/10'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Custom Speed Slider */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-white/70 mb-3">{t('playbackSpeed.custom')}</h4>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-white/50">0.5x</span>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={playbackRate}
              onChange={(e) => onRateChange(parseFloat(e.target.value))}
              className="slider flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
            />
            <span className="text-sm text-white/50">2.0x</span>
          </div>
          <div className="text-center mt-2">
            <span className="text-orange-300 font-medium">{playbackRate}x</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full px-4 py-3 mt-4 rounded-xl bg-orange-500 font-bold text-white transition hover:bg-orange-400"
        >
          {t('playbackSpeed.confirm')}
        </button>
      </div>
    </Modal>
  );
}

export default PlaybackSpeedModal;