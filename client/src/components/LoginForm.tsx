import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api, { trackAction } from '../utils/api';
import storage from "../utils/storage";

interface LoginFormProps {
  onLogin: () => void;
  sessionExpired?: boolean;
}

function LoginForm({ onLogin, sessionExpired }: LoginFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSsoLoading, setIsSsoLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const ssoAvailable = typeof window !== 'undefined' && !!window.electronAuth;

  const [ssoProvider, setSsoProvider] = useState<'google' | 'apple' | null>(null);

  const handleSsoLogin = async (provider: 'google' | 'apple') => {
    if (!window.electronAuth) return;
    setIsSsoLoading(true);
    setSsoProvider(provider);
    setError('');
    try {
      trackAction('User attempted SSO login', { provider });
      const result = await window.electronAuth.openSsoWindow(provider);
      if (result.cancelled) {
        setIsSsoLoading(false);
        setSsoProvider(null);
        return;
      }
      if (result.error) {
        setError(result.error ?? t('login.errors.failed'));
        setIsSsoLoading(false);
        setSsoProvider(null);
        return;
      }
      onLogin();
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err?.message ?? t('login.errors.failed'));
    } finally {
      setIsSsoLoading(false);
      setSsoProvider(null);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!email || !password) {
      setError(t('login.errors.required'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      trackAction('User attempted login', { email });
      const response = await api.post('/login', { email, password });
      if (!window.electronApi) {
        const { token } = response.data;
        await storage.set('token', token);
      }
      onLogin();
      navigate('/');
    } catch (error: any) {
      setError(error.response?.data?.error || t('login.errors.failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0d0e11] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-40 -top-48 h-[34rem] w-[34rem] rounded-full bg-orange-600/[0.12] blur-3xl" />
        <div className="absolute bottom-[-12rem] right-[-10rem] h-[30rem] w-[30rem] rounded-full bg-amber-300/[0.05] blur-3xl" />
      </div>
      <main className="relative flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#1e2129] via-[#17191f] to-[#121317] p-8 shadow-[0_28px_80px_rgba(0,0,0,0.5)] sm:p-10">
            <div className="mb-8 text-center">
              <span className="mx-auto mb-6 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg">
                <img src={'assets/icon.png'} alt={"Storytel"} className="h-14 w-14" />
              </span>
              <h2 className="mb-2 text-3xl font-black tracking-tight">
                {t('login.title')}
              </h2>
              <p className="text-sm text-white/50">
                {t('login.subtitle')}
              </p>
            </div>
            {sessionExpired && (
              <div className="mb-6 rounded-xl border border-amber-300/25 bg-amber-950/40 p-3 text-center text-sm text-amber-200">
                {t('login.errors.sessionExpired')}
              </div>
            )}
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-3">
                <div>
                  <label htmlFor="email" className="sr-only">
                    {t('login.email')}
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block h-12 w-full rounded-xl border border-white/10 bg-black/25 px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-orange-400/70 focus:ring-4 focus:ring-orange-500/10"
                    placeholder={t('login.email')}
                  />
                </div>
                <div className="relative">
                  <label htmlFor="password" className="sr-only">
                    {t('login.password')}
                  </label>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block h-12 w-full rounded-xl border border-white/10 bg-black/25 px-4 pr-12 text-sm text-white outline-none placeholder:text-white/35 focus:border-orange-400/70 focus:ring-4 focus:ring-orange-500/10"
                    placeholder={t('login.password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-white/40 transition hover:text-white/70"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-300/25 bg-red-950/40 p-3 text-center text-sm text-red-200">
                  {error}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-bold text-white shadow-[0_10px_30px_rgba(249,115,22,0.22)] transition hover:bg-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-500/25 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35 disabled:shadow-none"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('login.signingIn')}
                    </div>
                  ) : (
                    t('login.signIn')
                  )}
                </button>
              </div>
            </form>
            {ssoAvailable && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-xs uppercase tracking-wider text-white/35">
                    {t('login.ssoDivider')}
                  </span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
                <button
                  type="button"
                  onClick={() => handleSsoLogin('google')}
                  disabled={isSsoLoading || isLoading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-4 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.5-5.9 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.4-.4-3.5z"/>
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 5.1 29.3 3 24 3 16.3 3 9.7 7.4 6.3 14.7z"/>
                    <path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.3l-6.2-5.2C29.2 36 26.7 37 24 37c-5.4 0-9.7-3.4-11.3-8.1L6.1 34C9.5 41.6 16.1 45 24 45z"/>
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2c-.4.4 6.6-4.8 6.6-14.2 0-1.2-.1-2.4-.4-3.5z"/>
                  </svg>
                  {isSsoLoading && ssoProvider === 'google'
                    ? t('login.ssoOpening')
                    : t('login.ssoGoogle')}
                </button>
                <button
                  type="button"
                  onClick={() => handleSsoLogin('apple')}
                  disabled={isSsoLoading || isLoading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-4 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  {isSsoLoading && ssoProvider === 'apple'
                    ? t('login.ssoOpening')
                    : t('login.ssoApple')}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default LoginForm;
