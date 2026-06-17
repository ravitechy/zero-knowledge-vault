// src/cryptoService.ts
import { argon2id } from 'hash-wasm';

// ==========================================
// Utility Functions (Byte/String/Base64 Conversions)
// ==========================================
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

// ==========================================
// Core Cryptographic Functions
// ==========================================

/**
 * Derives a 256-bit (32-byte) key using Argon2id via WebAssembly.
 */
export async function deriveKey(password: string, saltBytes: Uint8Array, iterations = 3, memoryKb = 65536): Promise<Uint8Array> {
    const derivedKeyHex = await argon2id({
        password: password,
        salt: saltBytes,
        parallelism: 4,
        iterations: iterations,
        memorySize: memoryKb,
        hashLength: 32, 
        outputType: 'hex'
    });

    return new Uint8Array(derivedKeyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
}

/**
 * Imports the raw derived key into the Web Crypto API format required for AES.
 */
async function importAesKey(rawKey: Uint8Array): Promise<CryptoKey> {
    return await window.crypto.subtle.importKey(
        "raw",
        rawKey.buffer as ArrayBuffer, // FIX 1: Pass the raw ArrayBuffer directly
        { name: "AES-GCM" },
        false, 
        ["encrypt", "decrypt"]
    );
}

/**
 * Decrypts the raw bytes and parses the JSON back into your VaultPayload.
 */
export async function decryptVault(
    cipherTextBase64: string,
    ivBase64: string,
    aesKeyRaw: Uint8Array
): Promise<string> {
    const cryptoKey = await importAesKey(aesKeyRaw);
    const iv = base64ToBuffer(ivBase64);
    const cipherTextBuffer = base64ToBuffer(cipherTextBase64);

    try {
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { 
                name: "AES-GCM", 
                iv: iv.buffer as ArrayBuffer // FIX 2: Explicitly pass the ArrayBuffer
            },
            cryptoKey,
            cipherTextBuffer.buffer as ArrayBuffer // FIX 3: Explicitly pass the ArrayBuffer
        );
        return textDecoder.decode(decryptedBuffer);
    } catch (error) {
        throw new Error("Decryption failed. Invalid Master Password or corrupted data.");
    }
}

/**
 * Encrypts a JSON string payload.
 */
export async function encryptVault(
    plainTextJson: string,
    aesKeyRaw: Uint8Array
): Promise<{ cipherTextBase64: string, ivBase64: string }> {
    const cryptoKey = await importAesKey(aesKeyRaw);
    
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const plainTextBuffer = textEncoder.encode(plainTextJson);

    const cipherTextBuffer = await window.crypto.subtle.encrypt(
        { 
            name: "AES-GCM", 
            iv: iv.buffer as ArrayBuffer // FIX 4: Explicitly pass the ArrayBuffer
        },
        cryptoKey,
        plainTextBuffer.buffer as ArrayBuffer // FIX 5: Explicitly pass the ArrayBuffer
    );

    return {
        cipherTextBase64: bufferToBase64(cipherTextBuffer),
        ivBase64: bufferToBase64(iv.buffer as ArrayBuffer)
    };
}

export function generateSalt(): Uint8Array {
    return window.crypto.getRandomValues(new Uint8Array(16));
}

export { bufferToBase64, base64ToBuffer };