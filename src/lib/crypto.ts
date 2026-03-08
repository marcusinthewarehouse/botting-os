// Ensures Uint8Array has a plain ArrayBuffer (not SharedArrayBuffer)
// Required because Web Crypto API types require ArrayBuffer specifically
function toArrayBuffer(arr: Uint8Array): ArrayBuffer {
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
}

class CryptoService {
  private key: CryptoKey | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly IDLE_TIMEOUT_MS = 5 * 60 * 1000;
  private readonly PBKDF2_ITERATIONS = 600_000;

  async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      toArrayBuffer(new TextEncoder().encode(password)),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: toArrayBuffer(salt), iterations: this.PBKDF2_ITERATIONS, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    this.key = key;
    this.resetIdleTimer();
    return key;
  }

  async hashPassword(password: string, salt: Uint8Array): Promise<string> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      toArrayBuffer(new TextEncoder().encode(password)),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: toArrayBuffer(salt), iterations: this.PBKDF2_ITERATIONS, hash: 'SHA-256' },
      keyMaterial,
      256
    );
    return btoa(String.fromCharCode(...new Uint8Array(bits)));
  }

  async encrypt(plaintext: string): Promise<{ data: Uint8Array; iv: string }> {
    if (!this.key) throw new Error('Encryption key not available. Unlock the app first.');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(iv) },
      this.key,
      toArrayBuffer(encoded)
    );
    return {
      data: new Uint8Array(encrypted),
      iv: btoa(String.fromCharCode(...iv)),
    };
  }

  async decrypt(data: Uint8Array, ivBase64: string): Promise<string> {
    if (!this.key) throw new Error('Encryption key not available. Unlock the app first.');
    const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(iv) },
      this.key,
      toArrayBuffer(data)
    );
    return new TextDecoder().decode(decrypted);
  }

  generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(16));
  }

  saltToBase64(salt: Uint8Array): string {
    return btoa(String.fromCharCode(...salt));
  }

  saltFromBase64(b64: string): Uint8Array {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  }

  isUnlocked(): boolean {
    return this.key !== null;
  }

  lock(): void {
    this.key = null;
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }

  resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.lock(), this.IDLE_TIMEOUT_MS);
  }

  startActivityTracking(): void {
    const handler = () => this.resetIdleTimer();
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;
    events.forEach(event => {
      document.addEventListener(event, handler, { passive: true });
    });
  }

  stopActivityTracking(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }
}

export const cryptoService = new CryptoService();
