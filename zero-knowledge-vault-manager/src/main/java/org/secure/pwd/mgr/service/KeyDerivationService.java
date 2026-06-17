package org.secure.pwd.mgr.service;

import org.bouncycastle.crypto.generators.Argon2BytesGenerator;
import org.bouncycastle.crypto.params.Argon2Parameters;
import org.bouncycastle.crypto.PBEParametersGenerator;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Arrays;

@Service
public class KeyDerivationService {
    // AES-256 requires a 256-bit (32-byte) key
    private static final int KEY_LENGTH_BYTES = 32;

    // Argon2id Work Factor Configuration
    // These should be tuned based on the hardware running the app.
    // The goal is for derivation to take ~0.5 seconds on your machine.
    private static final int ITERATIONS = 3;
    private static final int MEMORY_COST_KB = 65536; // 64 MB
    private static final int PARALLELISM = 4; // Number of threads/lanes

    /**
     * Generates a random 16-byte salt.
     * You will run this exactly once when creating the vault.
     */
    public byte[] generateSalt() {
        byte[] salt = new byte[16];
        new SecureRandom().nextBytes(salt);
        return salt;
    }

    /**
     * Derives the AES-256 key from the master password.
     * * @param masterPassword The password captured securely via console.
     *
     * @param salt The salt (either newly generated or read from the saved file).
     * @return The 32-byte AES key.
     */
    public byte[] deriveKey(char[] masterPassword, byte[] salt) {
        // 1. Configure the Argon2id parameters
        Argon2Parameters.Builder builder = new Argon2Parameters.Builder(Argon2Parameters.ARGON2_id)
                .withVersion(Argon2Parameters.ARGON2_VERSION_13)
                .withIterations(ITERATIONS)
                .withMemoryAsKB(MEMORY_COST_KB)
                .withParallelism(PARALLELISM)
                .withSalt(salt);

        Argon2BytesGenerator generator = new Argon2BytesGenerator();
        generator.init(builder.build());

        byte[] resultKey = new byte[KEY_LENGTH_BYTES];

        // 2. Securely convert char[] to byte[]
        // We avoid new String(masterPassword) because Strings are immutable
        // and cannot be wiped from memory manually.
        byte[] passwordBytes = PBEParametersGenerator.PKCS5PasswordToUTF8Bytes(masterPassword);

        try {
            // 3. Execute the key derivation
            generator.generateBytes(passwordBytes, resultKey, 0, resultKey.length);
            return resultKey;
        } finally {
            // 4. CRITICAL: Wipe the password bytes from memory immediately
            if (passwordBytes != null) {
                Arrays.fill(passwordBytes, (byte) 0);
            }
        }
    }
}
