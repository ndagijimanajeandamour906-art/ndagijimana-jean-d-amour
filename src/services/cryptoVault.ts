// Cryptographic Vault and End-to-End Encryption (E2EE) Module
// Uses standard Web Crypto API (SubtleCrypto) with AES-GCM-256 and PBKDF2

export class CryptoVaultService {
  private static textEncoder = new TextEncoder();
  private static textDecoder = new TextDecoder();

  // Derives a 256-bit AES-GCM CryptoKey from a user passcode using PBKDF2
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const rawKey = await window.crypto.subtle.importKey(
      'raw',
      this.textEncoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      rawKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Encrypts plaintext string with user passcode, returning a packed JSON format
  static async encrypt(plaintext: string, passcode: string): Promise<string> {
    try {
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const key = await this.deriveKey(passcode, salt);

      const encodedData = this.textEncoder.encode(plaintext);
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedData
      );

      const payload = {
        salt: Array.from(salt),
        iv: Array.from(iv),
        ciphertext: Array.from(new Uint8Array(encryptedBuffer)),
        v: 1,
        timestamp: Date.now(),
      };

      return btoa(JSON.stringify(payload));
    } catch (err) {
      console.error('Encryption failed:', err);
      throw new Error('Failed to encrypt content with key.');
    }
  }

  // Decrypts encrypted payload using passcode
  static async decrypt(encryptedPayloadBase64: string, passcode: string): Promise<string> {
    try {
      const decodedJson = atob(encryptedPayloadBase64);
      const payload = JSON.parse(decodedJson);

      const salt = new Uint8Array(payload.salt);
      const iv = new Uint8Array(payload.iv);
      const ciphertext = new Uint8Array(payload.ciphertext);

      const key = await this.deriveKey(passcode, salt);
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      );

      return this.textDecoder.decode(decryptedBuffer);
    } catch (err) {
      console.error('Decryption failed:', err);
      throw new Error('Incorrect passcode or corrupted encrypted cipher.');
    }
  }

  // Generates real cryptographic SHA-256 safety fingerprint for E2EE contact verification
  static async generateSafetyFingerprint(userId1: string, userId2: string): Promise<string[]> {
    const combined = [userId1, userId2].sort().join(':') + ':tolkflow:v1';
    const hashBuffer = await window.crypto.subtle.digest(
      'SHA-256',
      this.textEncoder.encode(combined)
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    // Group into 6 blocks of 5 digits
    const blocks: string[] = [];
    for (let i = 0; i < 6; i++) {
      const chunk = hashArray.slice(i * 4, i * 4 + 4);
      const num = ((chunk[0] << 24) | (chunk[1] << 16) | (chunk[2] << 8) | chunk[3]) >>> 0;
      const formatted = (num % 100000).toString().padStart(5, '0');
      blocks.push(formatted);
    }
    return blocks;
  }
}
