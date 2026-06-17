package org.secure.pwd.mgr.service;

import lombok.AllArgsConstructor;
import org.secure.pwd.mgr.model.EncryptedVaultEnvelope;
import org.secure.pwd.mgr.model.VaultPayload;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Base64;

@Profile("local")
@Service
@AllArgsConstructor
public class VaultOrchestratorService {
    private final KeyDerivationService kdfService;
    private final EncryptDecryptService encryptionService;
    private final ObjectMapper objectMapper;

    /**
     * Locks the payload and writes it to disk.
     */
    public void lockAndSave(VaultPayload payload, char[] masterPassword, Path targetFile) throws Exception {
        byte[] aesKey = null;
        try {
            // 1. Serialize the payload to a JSON byte array
            byte[] plainTextJson = objectMapper.writeValueAsBytes(payload);

            // 2. Generate new cryptographic parameters for this save operation
            byte[] salt = kdfService.generateSalt();
            byte[] iv = encryptionService.generateIv();

            // 3. Derive the AES key
            aesKey = kdfService.deriveKey(masterPassword, salt);

            // 4. Encrypt the JSON
            byte[] cipherText = encryptionService.encrypt(plainTextJson, aesKey, iv);

            // 5. Pack the envelope with Base64 encoded strings
            Base64.Encoder encoder = Base64.getEncoder();
            EncryptedVaultEnvelope envelope = new EncryptedVaultEnvelope(
                    "Argon2id",
                    3, // iterations from KDF config
                    65536, // memoryKb from KDF config
                    encoder.encodeToString(salt),
                    encoder.encodeToString(iv),
                    encoder.encodeToString(cipherText)
            );

            // 6. Write the envelope to disk as pretty JSON
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(targetFile.toFile(), envelope);

        } finally {
            // CRITICAL: Wipe the derived AES key from memory immediately
            if (aesKey != null) {
                Arrays.fill(aesKey, (byte) 0);
            }
        }
    }

    /**
     * Reads from disk, validates the password, and unlocks the payload.
     */
    public VaultPayload unlockAndLoad(Path sourceFile, char[] masterPassword) throws Exception {
        byte[] aesKey = null;
        try {
            // 1. Read and parse the envelope from disk
            if (!Files.exists(sourceFile)) {
                throw new IllegalArgumentException("Vault file does not exist at path: " + sourceFile);
            }
            EncryptedVaultEnvelope envelope = objectMapper.readValue(sourceFile.toFile(), EncryptedVaultEnvelope.class);

            // 2. Decode the Base64 parameters back into raw bytes
            Base64.Decoder decoder = Base64.getDecoder();
            byte[] salt = decoder.decode(envelope.saltBase64());
            byte[] iv = decoder.decode(envelope.ivBase64());
            byte[] cipherText = decoder.decode(envelope.cipherTextBase64());

            // 3. Derive the AES key using the saved salt and provided password
            aesKey = kdfService.deriveKey(masterPassword, salt);

            // 4. Attempt to decrypt (This is where the password validation happens via AES-GCM Auth Tag)
            byte[] plainTextJson;
            try {
                plainTextJson = encryptionService.decrypt(cipherText, aesKey, iv);
            } catch (Exception e) {
                // If AES-GCM throws an AEADBadTagException, it means the key is wrong.
                throw new SecurityException("Decryption failed: Invalid Master Password or corrupted vault.", e);
            }

            // 5. Deserialize the JSON bytes back into your domain object
            return objectMapper.readValue(plainTextJson, VaultPayload.class);

        } finally {
            // CRITICAL: Wipe the derived AES key from memory immediately
            if (aesKey != null) {
                Arrays.fill(aesKey, (byte) 0);
            }
        }
    }
}
