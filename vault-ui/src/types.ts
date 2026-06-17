// src/types.ts

export interface Credential {
    target: string;
    notes: string;
    secrets: Record<string, string>; // The TS equivalent of Map<String, String>
}

export interface VaultPayload {
    lastModified: string;
    lastAccessed: string;
    credentials: Credential[];
}

export interface EncryptedVaultEnvelope {
    kdfAlgorithm: string;
    iterations: number;
    memoryKb: number;
    saltBase64: string;
    ivBase64: string;
    cipherTextBase64: string;
}