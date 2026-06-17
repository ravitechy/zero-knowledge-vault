package org.secure.pwd.mgr.model;

public record EncryptedVaultEnvelope(
        String kdfAlgorithm,
        int iterations,
        int memoryKb,
        String saltBase64,
        String ivBase64,
        String cipherTextBase64 // Note: AES-GCM appends the Auth Tag to the end of this ciphertext automatically
) {}
