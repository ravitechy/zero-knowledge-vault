// src/components/Login.tsx
import React, { useState } from 'react';
import { deriveKey, decryptVault } from '../cryptoService';
import type { EncryptedVaultEnvelope, VaultPayload } from '../types';
import { API_BASE_URL } from '../config';

interface LoginProps {
    onUnlockSuccess: (payload: VaultPayload, aesKey: Uint8Array, vaultId: string, saltBase64: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onUnlockSuccess }) => {
    const [vaultId, setVaultId] = useState('');
    const [masterPassword, setMasterPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage('');

        try {
            // STEP 1: Fetch the encrypted vault envelope from your Spring Boot API
            // (We'll use a placeholder URL for now until the controller is ready)
            const response = await fetch(`${API_BASE_URL}/api/vaults/${vaultId}`);
            
            if (!response.ok) {
                throw new Error("Vault not found. Please verify the Vault ID.");
            }

            const envelope: EncryptedVaultEnvelope = await response.json();

            // STEP 2: Decode the base64 salt from the server into a raw byte array
            const binarySalt = window.atob(envelope.saltBase64);
            const saltBytes = new Uint8Array(binarySalt.length);
            for (let i = 0; i < binarySalt.length; i++) {
                saltBytes[i] = binarySalt.charCodeAt(i);
            }

            // STEP 3: Derive the AES key locally using Argon2id via WebAssembly
            const aesKeyRaw = await deriveKey(
                masterPassword, 
                saltBytes, 
                envelope.iterations, 
                envelope.memoryKb
            );

            // STEP 4: Decrypt the vault ciphertext locally using Web Crypto API
            const decryptedJson = await decryptVault(
                envelope.cipherTextBase64,
                envelope.ivBase64,
                aesKeyRaw
            );

            // STEP 5: Parse the plain-text JSON payload and pass it up to the application state
            const vaultData: VaultPayload = JSON.parse(decryptedJson);
            onUnlockSuccess(vaultData, aesKeyRaw, vaultId, envelope.saltBase64);

        } catch (error: any) {
            setErrorMessage(error.message || "An unexpected cryptographic error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>Unlock Your Vault</h2>
            <form onSubmit={handleUnlock}>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Vault ID</label>
                    <input 
                        type="text" 
                        value={vaultId}
                        onChange={(e) => setVaultId(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                        placeholder="e.g., ravi-secure-vault"
                    />
                </div>

                <div style={{ marginBottom: '15px', position: 'relative' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Master Password</label>
                    <div style={{ display: 'flex' }}>
                        <input 
                            type={showPassword ? "text" : "password"} 
                            value={masterPassword}
                            onChange={(e) => setMasterPassword(e.target.value)}
                            required
                            style={{ flexGrow: 1, padding: '8px' }}
                            placeholder="Enter your master password"
                        />
                        <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{ padding: '8px', marginLeft: '5px', cursor: 'pointer' }}
                        >
                            {showPassword ? "🙈" : "👁️"}
                        </button>
                    </div>
                </div>

                {errorMessage && (
                    <div style={{ color: 'red', marginBottom: '15px', fontSize: '14px' }}>
                        {errorMessage}
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={isLoading}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    {isLoading ? "Deriving Key & Decrypting..." : "Unlock Vault"}
                </button>
            </form>
        </div>
    );
};