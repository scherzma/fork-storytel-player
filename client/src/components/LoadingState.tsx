import React from 'react';

function LoadingState({ message = "Loading..." }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0d0e11] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-40 -top-48 h-[34rem] w-[34rem] rounded-full bg-orange-600/10 blur-3xl" />
      </div>
      <div className="relative text-center">
        <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-orange-400"></div>
        <div className="text-lg font-semibold text-white/60">{message}</div>
      </div>
    </div>
  );
}

export default LoadingState;
