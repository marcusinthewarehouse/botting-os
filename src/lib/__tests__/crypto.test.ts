import { describe, it, expect, beforeEach } from 'vitest';
import { cryptoService } from '@/lib/crypto';

describe('CryptoService', () => {
  const testPassword = 'test-password-123';
  let salt: Uint8Array;

  beforeEach(async () => {
    cryptoService.lock();
    salt = cryptoService.generateSalt();
    await cryptoService.deriveKey(testPassword, salt);
  });

  it('isUnlocked returns true after deriveKey', () => {
    expect(cryptoService.isUnlocked()).toBe(true);
  });

  it('isUnlocked returns false after lock', () => {
    cryptoService.lock();
    expect(cryptoService.isUnlocked()).toBe(false);
  });

  it('encrypts and decrypts a string correctly', async () => {
    const plaintext = 'Hello, World!';
    const { data, iv } = await cryptoService.encrypt(plaintext);
    const decrypted = await cryptoService.decrypt(data, iv);
    expect(decrypted).toBe(plaintext);
  });

  it('preserves special characters through encrypt/decrypt', async () => {
    const plaintext = 'P@$$w0rd!#%^&*()';
    const { data, iv } = await cryptoService.encrypt(plaintext);
    const decrypted = await cryptoService.decrypt(data, iv);
    expect(decrypted).toBe(plaintext);
  });

  it('preserves unicode through encrypt/decrypt', async () => {
    const plaintext = '\u00e9\u00e8\u00ea \u2603 \ud83d\ude80 \u4f60\u597d';
    const { data, iv } = await cryptoService.encrypt(plaintext);
    const decrypted = await cryptoService.decrypt(data, iv);
    expect(decrypted).toBe(plaintext);
  });

  it('preserves empty string through encrypt/decrypt', async () => {
    const { data, iv } = await cryptoService.encrypt('');
    const decrypted = await cryptoService.decrypt(data, iv);
    expect(decrypted).toBe('');
  });

  it('preserves long strings through encrypt/decrypt', async () => {
    const plaintext = 'x'.repeat(10000);
    const { data, iv } = await cryptoService.encrypt(plaintext);
    const decrypted = await cryptoService.decrypt(data, iv);
    expect(decrypted).toBe(plaintext);
  });

  it('generates unique IVs for each encryption', async () => {
    const { iv: iv1 } = await cryptoService.encrypt('test');
    const { iv: iv2 } = await cryptoService.encrypt('test');
    expect(iv1).not.toBe(iv2);
  });

  it('produces different ciphertext for same plaintext', async () => {
    const { data: d1 } = await cryptoService.encrypt('test');
    const { data: d2 } = await cryptoService.encrypt('test');
    const arr1 = Array.from(d1);
    const arr2 = Array.from(d2);
    expect(arr1).not.toEqual(arr2);
  });

  it('throws when encrypting while locked', async () => {
    cryptoService.lock();
    await expect(cryptoService.encrypt('test')).rejects.toThrow();
  });

  it('throws when decrypting while locked', async () => {
    const { data, iv } = await cryptoService.encrypt('test');
    cryptoService.lock();
    await expect(cryptoService.decrypt(data, iv)).rejects.toThrow();
  });

  it('fails to decrypt with wrong key', async () => {
    const { data, iv } = await cryptoService.encrypt('secret');
    cryptoService.lock();
    const wrongSalt = cryptoService.generateSalt();
    await cryptoService.deriveKey('wrong-password', wrongSalt);
    await expect(cryptoService.decrypt(data, iv)).rejects.toThrow();
  });

  it('salt round-trips through base64', () => {
    const original = cryptoService.generateSalt();
    const b64 = cryptoService.saltToBase64(original);
    const recovered = cryptoService.saltFromBase64(b64);
    expect(Array.from(recovered)).toEqual(Array.from(original));
  });

  it('generateSalt returns 16 bytes', () => {
    const salt = cryptoService.generateSalt();
    expect(salt.length).toBe(16);
  });

  it('hashPassword produces consistent output for same inputs', async () => {
    const hash1 = await cryptoService.hashPassword('mypass', salt);
    const hash2 = await cryptoService.hashPassword('mypass', salt);
    expect(hash1).toBe(hash2);
  });

  it('hashPassword produces different output for different passwords', async () => {
    const hash1 = await cryptoService.hashPassword('pass1', salt);
    const hash2 = await cryptoService.hashPassword('pass2', salt);
    expect(hash1).not.toBe(hash2);
  });

  it('hashPassword produces different output for different salts', async () => {
    const salt2 = cryptoService.generateSalt();
    const hash1 = await cryptoService.hashPassword('mypass', salt);
    const hash2 = await cryptoService.hashPassword('mypass', salt2);
    expect(hash1).not.toBe(hash2);
  });
});
