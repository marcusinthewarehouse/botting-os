"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { cryptoService } from "@/lib/crypto";
import { MasterPasswordDialog } from "@/components/master-password-dialog";

// TODO Task 1.4: replace localStorage with settings repository
// Keys for localStorage fallback until settings repo is wired up
const LS_KEY_HASH = "bottingos:pw_hash";
const LS_KEY_HASH_SALT = "bottingos:pw_hash_salt";
const LS_KEY_ENC_SALT = "bottingos:enc_salt";

interface CryptoContextValue {
  isUnlocked: boolean;
  lock: () => void;
}

const CryptoContext = createContext<CryptoContextValue>({
  isUnlocked: false,
  lock: () => {},
});

export const useCrypto = () => useContext(CryptoContext);

interface CryptoProviderProps {
  children: React.ReactNode;
}

export function CryptoProvider({ children }: CryptoProviderProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check if a password hash exists (TODO Task 1.4: read from settings table)
    const existingHash = localStorage.getItem(LS_KEY_HASH);
    setIsFirstTime(!existingHash);
    setReady(true);
  }, []);

  const handleSetPassword = useCallback(async (password: string) => {
    // TODO Task 1.4: persist salts and hash to settings table instead of localStorage
    const hashSalt = cryptoService.generateSalt();
    const encSalt = cryptoService.generateSalt();

    const hash = await cryptoService.hashPassword(password, hashSalt);

    localStorage.setItem(LS_KEY_HASH, hash);
    localStorage.setItem(
      LS_KEY_HASH_SALT,
      cryptoService.saltToBase64(hashSalt),
    );
    localStorage.setItem(LS_KEY_ENC_SALT, cryptoService.saltToBase64(encSalt));

    await cryptoService.deriveKey(password, encSalt);
    cryptoService.startActivityTracking();
    setIsUnlocked(true);
  }, []);

  const handleVerifyPassword = useCallback(
    async (password: string): Promise<boolean> => {
      // TODO Task 1.4: read salts and hash from settings table instead of localStorage
      const storedHash = localStorage.getItem(LS_KEY_HASH);
      const storedHashSalt = localStorage.getItem(LS_KEY_HASH_SALT);
      const storedEncSalt = localStorage.getItem(LS_KEY_ENC_SALT);

      if (!storedHash || !storedHashSalt || !storedEncSalt) return false;

      const hashSalt = cryptoService.saltFromBase64(storedHashSalt);
      const hash = await cryptoService.hashPassword(password, hashSalt);

      if (hash !== storedHash) return false;

      const encSalt = cryptoService.saltFromBase64(storedEncSalt);
      await cryptoService.deriveKey(password, encSalt);
      cryptoService.startActivityTracking();
      setIsUnlocked(true);
      return true;
    },
    [],
  );

  const lock = useCallback(() => {
    cryptoService.lock();
    setIsUnlocked(false);
  }, []);

  if (!ready) return null;

  return (
    <CryptoContext.Provider value={{ isUnlocked, lock }}>
      {!isUnlocked && (
        <MasterPasswordDialog
          isFirstTime={isFirstTime}
          onSetPassword={handleSetPassword}
          onVerifyPassword={handleVerifyPassword}
        />
      )}
      {children}
    </CryptoContext.Provider>
  );
}
