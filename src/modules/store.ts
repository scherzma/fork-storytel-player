import ElectronStore from 'electron-store';
import { safeStorage } from 'electron';
import { randomBytes } from 'crypto';

interface EncryptedValue {
  version: 1;
  data: string;
}

class StoreManager {
  private store: any;
  private sensitiveMemory = new Map<string, string>();

  constructor() {
    this.store = new ElectronStore();
  }

  private canEncrypt(): boolean {
    if (!safeStorage.isEncryptionAvailable()) return false;
    if (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text') {
      return false;
    }
    return true;
  }

  private encryptedKey(key: string): string {
    return `secure.${key}`;
  }

  private getEncrypted(key: string): string | undefined {
    const memoryValue = this.sensitiveMemory.get(key);
    if (memoryValue !== undefined) return memoryValue;
    if (!this.canEncrypt()) return undefined;

    const record = this.store.get(this.encryptedKey(key)) as EncryptedValue | undefined;
    if (!record || record.version !== 1 || typeof record.data !== 'string') return undefined;
    try {
      return safeStorage.decryptString(Buffer.from(record.data, 'base64'));
    } catch {
      this.store.delete(this.encryptedKey(key));
      return undefined;
    }
  }

  private setEncrypted(key: string, value: string): void {
    this.sensitiveMemory.set(key, value);
    this.store.delete(key);
    if (!this.canEncrypt()) {
      this.store.delete(this.encryptedKey(key));
      return;
    }

    const record: EncryptedValue = {
      version: 1,
      data: safeStorage.encryptString(value).toString('base64'),
    };
    this.store.set(this.encryptedKey(key), record);
  }

  get<T = any>(key: string): T | undefined {
    if (key === 'token') {
      // Delete legacy plaintext sessions instead of migrating credentials that
      // may already have been exposed through old log files.
      if (this.store.has(key)) this.store.delete(key);
      return this.getEncrypted(key) as T | undefined;
    }
    return this.store.get(key) as T | undefined;
  }

  set<T = any>(key: string, value: T): void {
    if (key === 'token') {
      if (typeof value !== 'string') throw new Error('Session token must be a string');
      this.setEncrypted(key, value);
      return;
    }
    this.store.set(key, value);
  }

  remove(key: string): void {
    this.sensitiveMemory.delete(key);
    this.store.delete(this.encryptedKey(key));
    this.store.delete(key);
  }

  clear(): void {
    this.sensitiveMemory.clear();
    this.store.clear();
  }

  getOrCreateSecureSecret(name: string): string {
    const key = `internal.${name}`;
    const existing = this.getEncrypted(key);
    if (existing) return existing;

    const secret = randomBytes(32).toString('base64url');
    this.setEncrypted(key, secret);
    return secret;
  }
}

export const storeManager = new StoreManager();
