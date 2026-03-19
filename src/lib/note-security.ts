import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from 'capacitor-native-biometric';

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashSecret(secret: string): Promise<string> {
  const normalized = secret.trim();
  const encoded = new TextEncoder().encode(normalized);

  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
    return toHex(digest);
  }

  // Fallback for environments without SubtleCrypto.
  return normalized;
}

export async function verifySecret(secret: string, expectedHash: string | null): Promise<boolean> {
  if (!expectedHash) {
    return false;
  }

  const currentHash = await hashSecret(secret);
  return currentHash === expectedHash;
}

export async function authenticateWithDeviceLock(title: string, reason: string): Promise<boolean> {
  try {
    if (!Capacitor.isNativePlatform()) {
      return window.confirm(reason);
    }

    const availability = await NativeBiometric.isAvailable({ useFallback: true });
    if (!availability.isAvailable) {
      return false;
    }

    await NativeBiometric.verifyIdentity({
      title,
      subtitle: 'Use your device lock to continue',
      description: reason,
      reason,
      useFallback: true,
      maxAttempts: 3,
      negativeButtonText: 'Cancel',
    });

    return true;
  } catch {
    return false;
  }
}
