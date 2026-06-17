package org.secure.pwd.mgr.service;

import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;

@Service
public class EncryptDecryptService {
    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int TAG_LENGTH_BIT = 128; // Standard 16-byte authentication tag
    private static final int IV_LENGTH_BYTE = 12;  // NIST recommended size for GCM

    /**
     * Generates a unique Initialization Vector for each encryption operation.
     */
    public byte[] generateIv() {
        byte[] iv = new byte[IV_LENGTH_BYTE];
        new SecureRandom().nextBytes(iv);
        return iv;
    }

    /**
     * Encrypts the JSON payload.
     * * @param plainTextJson The VaultPayload converted to a JSON byte array.
     * @param aesKey The 32-byte key from KeyDerivationService.
     * @param iv The freshly generated 12-byte IV.
     * @return The encrypted ciphertext (which includes the auth tag at the end).
     */
    public byte[] encrypt(byte[] plainTextJson, byte[] aesKey, byte[] iv) throws Exception {
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        SecretKeySpec keySpec = new SecretKeySpec(aesKey, "AES");
        GCMParameterSpec gcmSpec = new GCMParameterSpec(TAG_LENGTH_BIT, iv);

        cipher.init(Cipher.ENCRYPT_MODE, keySpec, gcmSpec);

        // doFinal performs the encryption AND appends the 16-byte Auth Tag to the end
        return cipher.doFinal(plainTextJson);
    }

    /**
     * Decrypts the ciphertext and intrinsically validates the Master Password.
     * * @param cipherText The encrypted data read from disk.
     * @param aesKey The 32-byte key derived from the user's input.
     * @param iv The IV read from the disk.
     * @return The decrypted JSON payload.
     */
    public byte[] decrypt(byte[] cipherText, byte[] aesKey, byte[] iv) throws Exception {
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        SecretKeySpec keySpec = new SecretKeySpec(aesKey, "AES");
        GCMParameterSpec gcmSpec = new GCMParameterSpec(TAG_LENGTH_BIT, iv);

        cipher.init(Cipher.DECRYPT_MODE, keySpec, gcmSpec);

        // The magic happens here.
        // If the derived aesKey is wrong, or if a single byte of the cipherText was altered,
        // doFinal() will throw an AEADBadTagException right here.
        return cipher.doFinal(cipherText);
    }
}