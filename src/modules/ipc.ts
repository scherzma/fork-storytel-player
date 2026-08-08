import { app, ipcMain, IpcMainEvent, IpcMainInvokeEvent, shell } from 'electron';
import path from 'path';
import { storeManager } from './store';
import { ServerManager } from './server';
import { TrayManager } from './tray';
import { WindowManager } from './window';
import { SsoManager } from './sso';
import { ApiConfig } from '../types';
import { i18n } from '../i18n';

export class IpcManager {
  private serverManager: ServerManager;
  private trayManager: TrayManager;
  private windowManager: WindowManager;
  private ssoManager: SsoManager;

  constructor(
    serverManager: ServerManager,
    trayManager: TrayManager,
    windowManager: WindowManager,
    ssoManager: SsoManager
  ) {
    this.serverManager = serverManager;
    this.trayManager = trayManager;
    this.windowManager = windowManager;
    this.ssoManager = ssoManager;
  }

  setupHandlers(): void {
    this.setupStoreHandlers();
    this.setupApiHandlers();
    this.setupTrayHandlers();
    this.setupLocaleHandlers();
    this.setupWindowHandlers();
    this.setupLogsHandlers();
    this.setupAuthHandlers();
    this.setupAppHandlers();
  }

  private assertTrustedSender(event: IpcMainInvokeEvent | IpcMainEvent): void {
    const mainWindow = this.windowManager.getWindow();
    if (!mainWindow || event.sender.id !== mainWindow.webContents.id) {
      throw new Error('IPC request rejected from an untrusted renderer');
    }
  }

  private isRendererStorageKeyAllowed(key: string): boolean {
    return key === 'hasSeenWelcome' ||
      key === 'appLanguage' ||
      key === 'settings.alwaysOnTop' ||
      key === 'libraryViewMode' ||
      key === 'librarySort' ||
      key === 'playbackRate' ||
      /^pos:[A-Za-z0-9_-]{1,128}$/.test(key) ||
      /^listening-history:[A-Za-z0-9_-]{1,128}$/.test(key);
  }

  private validateStoreValue(value: unknown): void {
    const serialized = JSON.stringify(value);
    if (serialized === undefined || serialized.length > 1024 * 1024) {
      throw new Error('Stored value is invalid or too large');
    }
  }

  private validateApiUrl(url: string): void {
    if (typeof url !== 'string' || url.length > 2048 || !url.startsWith('/api/')) {
      throw new Error('Invalid internal API path');
    }
    const parsed = new URL(url, 'http://localhost');
    if (parsed.origin !== 'http://localhost' || !parsed.pathname.startsWith('/api/')) {
      throw new Error('Invalid internal API path');
    }
  }

  private async injectRendererRequest(method: string, url: string, payload?: any): Promise<any> {
    this.validateApiUrl(url);
    const headers: Record<string, string> = {};
    const token = storeManager.get<string>('token');
    if (token && url !== '/api/login' && url !== '/api/sso-login') {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await this.serverManager.injectRequest(method, url, payload, headers);
    if (response?.statusCode === 401) {
      storeManager.remove('token');
    }

    if (method === 'POST' && url === '/api/login' && response?.data?.token) {
      storeManager.set('token', response.data.token);
      const { token: _token, ...safeData } = response.data;
      return { ...response, data: safeData };
    }

    if (method === 'POST' && url === '/api/logout') {
      storeManager.remove('token');
    }
    return response;
  }

  private setupAppHandlers(): void {
    ipcMain.handle('app:get-version-info', (event: IpcMainInvokeEvent) => {
      this.assertTrustedSender(event);
      return {
        appVersion: app.getVersion(),
        electronVersion: process.versions.electron ?? '',
        chromeVersion: process.versions.chrome ?? '',
        nodeVersion: process.versions.node ?? '',
      };
    });
  }

  private setupStoreHandlers(): void {
    ipcMain.handle('store-get', (event: IpcMainInvokeEvent, key: string) => {
      this.assertTrustedSender(event);
      if (!this.isRendererStorageKeyAllowed(key)) throw new Error('Storage key is not readable');
      return storeManager.get(key);
    });

    ipcMain.handle(
      'store-set',
      (event: IpcMainInvokeEvent, key: string, value: any) => {
        this.assertTrustedSender(event);
        if (!this.isRendererStorageKeyAllowed(key)) throw new Error('Storage key is not writable');
        this.validateStoreValue(value);
        storeManager.set(key, value);
      }
    );

    ipcMain.handle('store-remove', (event: IpcMainInvokeEvent, key: string) => {
      this.assertTrustedSender(event);
      if (key !== 'token' && !this.isRendererStorageKeyAllowed(key)) {
        throw new Error('Storage key is not removable');
      }
      storeManager.remove(key);
    });
  }

  private setupApiHandlers(): void {
    ipcMain.handle(
      'api:get',
      async (event: IpcMainInvokeEvent, url: string, _config: ApiConfig = {}) => {
        this.assertTrustedSender(event);
        return await this.injectRendererRequest('GET', url);
      }
    );

    ipcMain.handle(
      'api:post',
      async (
        event: IpcMainInvokeEvent,
        url: string,
        data: any = {},
        config: ApiConfig = {}
      ) => {
        this.assertTrustedSender(event);
        return await this.injectRendererRequest('POST', url, data);
      }
    );

    ipcMain.handle(
      'api:put',
      async (
        event: IpcMainInvokeEvent,
        url: string,
        data: any = {},
        config: ApiConfig = {}
      ) => {
        this.assertTrustedSender(event);
        return await this.injectRendererRequest('PUT', url, data);
      }
    );

    ipcMain.handle(
      'api:delete',
      async (event: IpcMainInvokeEvent, url: string, _config: ApiConfig = {}) => {
        this.assertTrustedSender(event);
        return await this.injectRendererRequest('DELETE', url);
      }
    );
  }

  private setupTrayHandlers(): void {
    ipcMain.on(
      'update-playing-state',
      (event, { isPlaying, bookTitle }: { isPlaying: boolean; bookTitle: string }) => {
        this.assertTrustedSender(event);
        this.trayManager.updatePlayingState({ isPlaying, bookTitle });
      }
    );

    ipcMain.on(
      'update-auth-state',
      (event, { isAuthenticated }: { isAuthenticated: boolean }) => {
        this.assertTrustedSender(event);
        this.trayManager.updatePlayingState({ isAuthenticated });
      }
    );
  }

  private setupLocaleHandlers(): void {
    ipcMain.handle('get-locale', (event) => {
      this.assertTrustedSender(event);
      return i18n.getLanguage();
    });

    ipcMain.handle('set-locale', (event: IpcMainInvokeEvent, locale: string) => {
      this.assertTrustedSender(event);
      storeManager.set('appLanguage', locale);
      
      // Update the current language in i18n
      i18n.detectLanguage();
      
      // Refresh fastify translations
      const fastifyServer = this.serverManager.getServer();
      if (fastifyServer) {
        i18n.initialize(fastifyServer).catch(err => {
          console.error('Failed to reinitialize i18n:', err);
        });
      }
      
      return true;
    });
  }

  private setupLogsHandlers(): void {
    ipcMain.handle('open-logs-folder', (event) => {
      this.assertTrustedSender(event);
      const logPath = path.join(process.env.USER_DATA_PATH || '', 'app.log');
      shell.showItemInFolder(logPath);
    });
  }

  private setupWindowHandlers(): void {
    ipcMain.handle('window-set-always-on-top', (event: IpcMainInvokeEvent, alwaysOnTop: boolean) => {
      this.assertTrustedSender(event);
      this.windowManager.setAlwaysOnTop(alwaysOnTop);
    });

    ipcMain.handle('window-is-always-on-top', (event) => {
      this.assertTrustedSender(event);
      return this.windowManager.isAlwaysOnTop();
    });
  }

  private setupAuthHandlers(): void {
    ipcMain.handle(
      'auth:open-sso-window',
      async (event: IpcMainInvokeEvent, provider?: 'google' | 'apple') => {
        this.assertTrustedSender(event);
        const parent = this.windowManager.getWindow();
        const result = await this.ssoManager.openSsoWindow(parent, provider);
        if (result.cancelled || result.error || !result.credentials) return result;

        const response = await this.serverManager.injectRequest(
          'POST',
          '/api/sso-login',
          result.credentials,
        );
        if (response?.__isError || !response?.data?.token) {
          return {
            cancelled: false,
            error: response?.error || 'SSO session could not be created',
          };
        }
        storeManager.set('token', response.data.token);
        return { cancelled: false };
      }
    );
  }
}
