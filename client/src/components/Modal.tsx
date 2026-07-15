import React from 'react';
import {useTranslation} from 'react-i18next';

export interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string | React.ReactNode;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  maxWidth?: string; // e.g. 'max-w-md', 'max-w-4xl'
  zIndex?: number;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  headerActions,
  maxWidth = 'max-w-md',
  zIndex = 50
}) => {
  const {t} = useTranslation();
  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm`}
      style={{ zIndex }}
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} flex max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#17191e] shadow-[0_28px_80px_rgba(0,0,0,0.55)]`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        {(title || onClose || headerActions) && (
          <div className="sticky top-0 flex shrink-0 flex-col gap-4 border-b border-white/[0.07] px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              {title && (
                <h2 className="min-w-0 flex-1 text-lg font-bold tracking-tight text-white">
                  {title}
                </h2>
              )}
              <div className="flex shrink-0 items-center gap-2">
                {headerActions}

                {onClose && (
                  <>
                    {headerActions && <div className="mx-1 my-auto h-6 w-px bg-white/10"></div>}
                    <button
                      onClick={onClose}
                      aria-label={t('common.close')}
                      className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                      title={t('common.close')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
