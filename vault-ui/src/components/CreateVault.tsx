// src/components/CreateVault.tsx
import React, { useState } from 'react';
import { generateSalt, deriveKey, encryptVault, bufferToBase64 } from '../cryptoService';
import type { EncryptedVaultEnvelope, VaultPayload } from '../types';
import { API_BASE_URL } from '../config';

interface CreateVaultProps {
    onVaultCreated: (vaultId: string) => void;
    onCancel: () => void;
}

export const CreateVault: React.FC<CreateVaultProps> = ({ onVaultCreated, onCancel }) => {
    const [vaultId, setVaultId] = useState('');
    const [masterPassword, setMasterPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation Guardrails
        if (masterPassword !== confirmPassword) {
            setErrorMessage("Passwords do not match.");
            return;
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(vaultId)) {
            setErrorMessage("Vault ID can only contain letters, numbers, dashes, and underscores.");
            return;
        }

        setIsLoading(true);
        setErrorMessage('');

        try {
            // STEP 1: Define the baseline "empty" vault state
            const initialPayload: VaultPayload = {
                lastModified: new Date().toISOString(),
                lastAccessed: new Date().toISOString(),
                credentials: []
            };
            const plainTextJson = JSON.stringify(initialPayload);

            // STEP 2: Generate Cryptographic Parameters
            const iterations = 3;
            const memoryKb = 65536;
            const saltBytes = generateSalt();

            // STEP 3: Derive the Master Key locally
            const aesKeyRaw = await deriveKey(masterPassword, saltBytes, iterations, memoryKb);

            // STEP 4: Encrypt the payload locally (this also generates a secure IV)
            const { cipherTextBase64, ivBase64 } = await encryptVault(plainTextJson, aesKeyRaw);

            // STEP 5: Construct the Envelope for the backend
            const envelope: EncryptedVaultEnvelope = {
                kdfAlgorithm: "Argon2id",
                iterations: iterations,
                memoryKb: memoryKb,
                saltBase64: bufferToBase64(saltBytes.buffer as ArrayBuffer),
                ivBase64: ivBase64,
                cipherTextBase64: cipherTextBase64
            };

            // STEP 6: Transmit the encrypted envelope to the Spring Boot API
            const response = await fetch(`${API_BASE_URL}/api/vaults/${vaultId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(envelope)
            });

            if (!response.ok) {
                throw new Error("Failed to create vault on the server.");
            }

            // Success! Route the user back to the login screen
            onVaultCreated(vaultId);

        } catch (error: any) {
            setErrorMessage(error.message || "An unexpected error occurred during creation.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>Create New Vault</h2>
            <form onSubmit={handleCreate}>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Vault ID</label>
                    <input 
                        type="text" 
                        value={vaultId}
                        onChange={(e) => setVaultId(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                        placeholder="e.g., my-secure-vault"
                    />
                    <small style={{ color: '#666' }}>This acts as your username.</small>
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Master Password</label>
                    <input 
                        type="password" 
                        value={masterPassword}
                        onChange={(e) => setMasterPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Confirm Password</label>
                    <input 
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>

                {errorMessage && (
                    <div style={{ color: 'red', marginBottom: '15px', fontSize: '14px' }}>
                        {errorMessage}
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={isLoading}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '10px' }}
                >
                    {isLoading ? "Generating Cryptography..." : "Create Vault"}
                </button>
                
                <button 
                    type="button" 
                    onClick={onCancel}
                    disabled={isLoading}
                    style={{ width: '100%', padding: '10px', backgroundColor: 'transparent', color: '#007bff', border: '1px solid #007bff', borderRadius: '4px', cursor: 'pointer' }}
                >
                    Back to Login
                </button>
            </form>
        </div>
    );
};