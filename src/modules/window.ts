import {BrowserWindow, Menu, app, screen, shell} from 'electron';
import {spawn, ChildProcess} from 'child_process';
import * as path from 'path';
import {WindowBounds, WindowConfig} from '../types';
import {storeManager} from './store';

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 800;
const MIN_WIDTH = 420;
const MIN_HEIGHT = 600;

export class WindowManager {
    private mainWindow: BrowserWindow | null = null;
    private clientProcess: ChildProcess | null = null;
    private isDev: boolean;
    private isDebug: boolean;

    constructor(isDev: boolean, isDebug: boolean) {
        this.isDev = isDev;
        this.isDebug = isDebug;
    }

    create(): BrowserWindow {
        // Get alwaysOnTop setting from store (default: false)
        const alwaysOnTop = storeManager.get<boolean>('settings.alwaysOnTop') ?? false;
        const savedBounds = this.getSavedBounds();

        const windowConfig: WindowConfig = {
            width: savedBounds?.width ?? DEFAULT_WIDTH,
            height: savedBounds?.height ?? DEFAULT_HEIGHT,
            x: savedBounds?.x,
            y: savedBounds?.y,
            minWidth: MIN_WIDTH,
            minHeight: MIN_HEIGHT,
            resizable: true,
            maximizable: true,
            alwaysOnTop
        };

        this.mainWindow = new BrowserWindow({
            ...windowConfig,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: true,
                webSecurity: true,
                devTools: this.isDev || this.isDebug,
                partition: 'persist:storytel-app',
                preload: path.join(__dirname, '../preload.js'),
            },
            icon: path.join(__dirname, '../../../assets/icon.png'),
            show: false,
            backgroundColor: '#000'
        });

        if (this.isDev) {
            this.startDevelopmentServers();
        } else {
            if (!this.isDebug) {
                Menu.setApplicationMenu(null);
                this.mainWindow.setMenu(null);
            }
            this.startProductionServer();
        }

        this.setupEventHandlers();

        return this.mainWindow;
    }

    // Restore the last window size/position, but only when it still fits on a
    // currently connected display (monitors may have been unplugged since).
    private getSavedBounds(): WindowBounds | null {
        const bounds = storeManager.get<WindowBounds>('settings.windowBounds');
        if (!bounds || typeof bounds.width !== 'number' || typeof bounds.height !== 'number') {
            return null;
        }

        const width = Math.max(MIN_WIDTH, Math.floor(bounds.width));
        const height = Math.max(MIN_HEIGHT, Math.floor(bounds.height));
        if (typeof bounds.x !== 'number' || typeof bounds.y !== 'number') {
            return {width, height};
        }

        const visible = screen.getAllDisplays().some(({workArea}) =>
            bounds.x! < workArea.x + workArea.width &&
            bounds.x! + width > workArea.x &&
            bounds.y! < workArea.y + workArea.height &&
            bounds.y! + height > workArea.y
        );
        return visible
            ? {width, height, x: Math.floor(bounds.x), y: Math.floor(bounds.y)}
            : {width, height};
    }

    private saveBounds(): void {
        if (!this.mainWindow || this.mainWindow.isMinimized() || this.mainWindow.isMaximized()) return;
        const {width, height, x, y} = this.mainWindow.getBounds();
        storeManager.set('settings.windowBounds', {width, height, x, y});
    }

    private setupEventHandlers(): void {
        if (!this.mainWindow) return;

        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow?.show();
        });

        let boundsSaveTimer: NodeJS.Timeout | null = null;
        const scheduleBoundsSave = () => {
            if (boundsSaveTimer) clearTimeout(boundsSaveTimer);
            boundsSaveTimer = setTimeout(() => this.saveBounds(), 500);
        };
        this.mainWindow.on('resize', scheduleBoundsSave);
        this.mainWindow.on('move', scheduleBoundsSave);

        this.mainWindow.on('close', (event) => {
            this.saveBounds();
            // @ts-ignore
            if (!app.isQuitting) {
                event.preventDefault();
                this.mainWindow?.hide();
            }
        });

        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        this.mainWindow.webContents.setWindowOpenHandler(({url}) => {
            if (this.isAllowedExternalUrl(url)) {
                void shell.openExternal(url);
            }
            return {action: 'deny'};
        });

        this.mainWindow.webContents.on('will-navigate', (event, url) => {
            if (this.isAllowedMainNavigation(url)) return;
            event.preventDefault();
            if (this.isAllowedExternalUrl(url)) {
                void shell.openExternal(url);
            }
        });
    }

    private isAllowedMainNavigation(url: string): boolean {
        try {
            const parsed = new URL(url);
            if (this.isDev) {
                return parsed.protocol === 'http:' &&
                    (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
                    parsed.port === '3000';
            }
            return parsed.protocol === 'file:';
        } catch {
            return false;
        }
    }

    private isAllowedExternalUrl(url: string): boolean {
        try {
            const parsed = new URL(url);
            if (parsed.protocol !== 'https:') return false;
            return (parsed.hostname === 'github.com' && parsed.pathname.startsWith('/debba/storytel-player')) ||
                (parsed.hostname === 'discord.gg' && parsed.pathname === '/YrZPHAwMSG');
        } catch {
            return false;
        }
    }

    private startDevelopmentServers(): void {
        this.clientProcess = spawn('npm', ['run', 'client'], {
            cwd: path.join(__dirname, '../../../'),
            stdio: 'inherit',
        });

        setTimeout(() => {
            this.mainWindow?.loadURL('http://localhost:3000');
        }, 5000);
    }

    private startProductionServer(): void {
        const indexPath = path.join(__dirname, '../../../client/build/index.html');
        this.mainWindow?.loadFile(indexPath);
    }

    getWindow(): BrowserWindow | null {
        return this.mainWindow;
    }

    killClientProcess(): void {
        if (this.clientProcess) {
            this.clientProcess.kill();
        }
    }

    show(): void {
        if (this.mainWindow) {
            if (this.mainWindow.isMinimized()) {
                this.mainWindow.restore();
            }
            this.mainWindow.show();
            // Force window to foreground on Windows/Linux where focus() alone
            // may not bring the window above a maximized window
            const wasAlwaysOnTop = this.mainWindow.isAlwaysOnTop();
            this.mainWindow.setAlwaysOnTop(true);
            if (!wasAlwaysOnTop) {
                this.mainWindow.setAlwaysOnTop(false);
            }
            this.mainWindow.focus();
        }
    }

    hide(): void {
        this.mainWindow?.hide();
    }

    isVisible(): boolean {
        return this.mainWindow?.isVisible() ?? false;
    }

    setAlwaysOnTop(alwaysOnTop: boolean): void {
        if (this.mainWindow) {
            this.mainWindow.setAlwaysOnTop(alwaysOnTop);
            storeManager.set('settings.alwaysOnTop', alwaysOnTop);
        }
    }

    isAlwaysOnTop(): boolean {
        return this.mainWindow?.isAlwaysOnTop() ?? false;
    }
}
