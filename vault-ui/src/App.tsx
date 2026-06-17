// src/App.tsx
import { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { CreateVault } from './components/CreateVault';
import { encryptVault } from './cryptoService';
import type { VaultPayload, Credential, EncryptedVaultEnvelope } from './types';
import { API_BASE_URL } from './config';

type ViewState = 'login' | 'create' | 'dashboard';

// ==========================================
// UI Assets & Design System
// ==========================================
const EyeIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const EyeOffIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>;
const CopyIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>;
const SearchIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const CloseIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const EditIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const TrashIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const UndoIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>;

const baseBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '32px', borderRadius: '6px', cursor: 'pointer', border: '1px solid', padding: '0', outline: 'none' };
const iconBtn: React.CSSProperties = { ...baseBtnStyle, width: '32px', backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#64748b' };
const textBtn: React.CSSProperties = { ...baseBtnStyle, padding: '0 12px', backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#475569', fontSize: '13px', fontWeight: '1000', gap: '6px' };
const dangerIconBtn: React.CSSProperties = { ...iconBtn, backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#ef4444' };
const primaryIconBtn: React.CSSProperties = { ...iconBtn, backgroundColor: '#eff6ff', borderColor: '#bfdbfe', color: '#3b82f6' };

// ==========================================
// Sub-Component: Smart Editable Credential Card 
// ==========================================
interface CredentialCardProps {
    cred: any;
    allTargets: string[];
    onUpdate: (oldTarget: string, newCred: Credential) => void;
    onDeleteTarget: (target: string) => void;
    onDeleteSecret: (target: string, secretKey: string) => void;
}

const CredentialCard: React.FC<CredentialCardProps> = ({ cred, allTargets, onUpdate, onDeleteTarget, onDeleteSecret }) => {
    const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
    const [isEditing, setIsEditing] = useState(false);
    const [confirmDeleteTarget, setConfirmDeleteTarget] = useState(false);
    const [confirmDeleteSecretKey, setConfirmDeleteSecretKey] = useState<string | null>(null);
    
    const [editTarget, setEditTarget] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [editSecrets, setEditSecrets] = useState<{ key: string, value: string, show: boolean }[]>([]);
    const [editError, setEditError] = useState('');

    const target = cred.target || 'Unknown Target';
    const notes = cred.notes || '';
    
    let displaySecrets: Record<string, string> = {};
    if (cred.secrets) {
        displaySecrets = cred.secrets;
    } else {
        Object.keys(cred).forEach(key => {
            if (key !== 'target' && key !== 'notes') {
                const displayKey = key.charAt(0).toUpperCase() + key.slice(1);
                displaySecrets[displayKey] = String(cred[key]);
            }
        });
    }

    const totalSecrets = Object.keys(displaySecrets).length;
    const isAllVisible = totalSecrets > 0 && Object.keys(displaySecrets).every(key => visibleSecrets[key]);

    const toggleVisibility = (key: string) => setVisibleSecrets(prev => ({ ...prev, [key]: !prev[key] }));
    const toggleAllVisibility = () => {
        const newState: Record<string, boolean> = {};
        const targetState = !isAllVisible; 
        Object.keys(displaySecrets).forEach(key => { newState[key] = targetState; });
        setVisibleSecrets(newState);
    };
    const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

    const startEditing = () => {
        setEditTarget(target);
        setEditNotes(notes);
        const secretsArray = Object.entries(displaySecrets).map(([k, v]) => ({ key: k, value: v, show: false }));
        setEditSecrets(secretsArray.length > 0 ? secretsArray : [{ key: '', value: '', show: false }]);
        setIsEditing(true);
        setEditError('');
        setConfirmDeleteTarget(false);
    };

    const handleEditSecretChange = (index: number, field: 'key' | 'value' | 'show', newValue: string | boolean) => {
        const updated = [...editSecrets];
        if (field === 'show') updated[index].show = newValue as boolean;
        else if (field === 'key') updated[index].key = newValue as string;
        else updated[index].value = newValue as string;
        setEditSecrets(updated);
        setEditError('');
    };

    const saveEdit = () => {
        setEditError('');
        const trimmedTarget = editTarget.trim();

        if (!trimmedTarget) return setEditError("Target name cannot be empty.");
        const isDuplicate = allTargets.some(t => t.toLowerCase() === trimmedTarget.toLowerCase() && t.toLowerCase() !== target.toLowerCase());
        if (isDuplicate) return setEditError(`Target '${trimmedTarget}' already exists.`);

        const secretsMap: Record<string, string> = {};
        let hasValidPair = false;

        for (const pair of editSecrets) {
            const keyName = pair.key.trim();
            if (pair.value && !keyName) return setEditError("All secret values must have a corresponding Key Name.");
            if (keyName) {
                // FIX: Duplicate key check during Edit mode
                if (secretsMap.hasOwnProperty(keyName)) {
                    return setEditError(`Duplicate key found: '${keyName}'. Keys within a target must be unique.`);
                }
                secretsMap[keyName] = pair.value;
                hasValidPair = true;
            }
        }

        if (!hasValidPair) return setEditError("Provide at least one valid Key/Value pair.");

        onUpdate(target, { target: trimmedTarget, notes: editNotes, secrets: secretsMap });
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div style={{ backgroundColor: '#f8fafc', border: '2px solid #3b82f6', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1)' }}>
                <div style={{ padding: '0 14px' }}>
                    <h4 style={{ margin: '0 0 16px 0', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}><EditIcon /> Editing: {target}</h4>
                    <div style={{ marginBottom: '12px' }}>
                        <input type="text" placeholder="Target Name" value={editTarget} onChange={e => setEditTarget(e.target.value)} style={{ padding: '10px 12px', width: '100%', boxSizing: 'border-box', fontWeight: 'bold', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <input type="text" placeholder="Notes (Optional)" value={editNotes} onChange={e => setEditNotes(e.target.value)} style={{ padding: '8px 12px', width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }} />
                    </div>

                    <div style={{ borderLeft: '3px solid #3b82f6', paddingLeft: '16px', marginBottom: '20px' }}>
                        {editSecrets.map((row, index) => (
                            <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <input type="text" placeholder="Key" value={row.key} onChange={e => handleEditSecretChange(index, 'key', e.target.value)} style={{ padding: '10px 12px', flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', minWidth: '120px' }} />
                                <div style={{ flex: 2, position: 'relative', display: 'flex', minWidth: '180px' }}>
                                    <input type={row.show ? "text" : "password"} placeholder="Value" value={row.value} onChange={e => handleEditSecretChange(index, 'value', e.target.value)} style={{ padding: '10px 12px', width: '100%', paddingRight: '40px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                                    <button onClick={() => handleEditSecretChange(index, 'show', !row.show)} type="button" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}>
                                        {row.show ? <EyeOffIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                                <button onClick={() => setEditSecrets(editSecrets.filter((_, i) => i !== index))} style={dangerIconBtn} title="Remove row"><TrashIcon /></button>
                            </div>
                        ))}
                        <button onClick={() => setEditSecrets([...editSecrets, { key: '', value: '', show: false }])} style={textBtn}>+ Add Row</button>
                    </div>

                    {editError && <div style={{ color: '#dc2626', backgroundColor: '#fef2f2', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px', fontWeight: '500' }}>{editError}</div>}

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={saveEdit} style={{ padding: '10px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>Save Changes</button>
                        <button onClick={() => setIsEditing(false)} style={{ padding: '10px 16px', backgroundColor: 'white', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>Cancel</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: '#ffffff', border: confirmDeleteTarget ? '2px solid #ef4444' : '1px solid #e5e7eb', borderRadius: '12px', padding: '24px 20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', paddingLeft: '14px', paddingRight: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ backgroundColor: '#0056b3', color: 'white', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', marginRight: '16px' }}>
                        {target.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 style={{ margin: 0, color: '#111827', fontSize: '1.1rem' }}>{target}</h3>
                        {notes && <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>{notes}</p>}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {totalSecrets > 0 && (
                        <button onClick={toggleAllVisibility} style={textBtn} title={isAllVisible ? "Hide All" : "Show All"}>
                            {isAllVisible ? <EyeOffIcon /> : <EyeIcon />} {isAllVisible ? "Hide" : "Show"} All
                        </button>
                    )}
                    <button onClick={startEditing} style={primaryIconBtn} title="Edit Target"><EditIcon /></button>
                    <button onClick={() => setConfirmDeleteTarget(true)} style={dangerIconBtn} title="Delete Target"><TrashIcon /></button>
                </div>
            </div>

            {confirmDeleteTarget && (
                <div style={{ backgroundColor: '#fee2e2', padding: '12px 16px', margin: '0 14px 16px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#991b1b', fontWeight: '600', fontSize: '14px' }}>Delete target '{target}'?</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => onDeleteTarget(target)} style={{ padding: '6px 12px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Confirm</button>
                        <button onClick={() => setConfirmDeleteTarget(false)} style={{ padding: '6px 12px', backgroundColor: 'white', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Cancel</button>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(displaySecrets).map(([key, value]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: confirmDeleteSecretKey === key ? '#fee2e2' : '#f8fafc', border: confirmDeleteSecretKey === key ? '1px solid #fca5a5' : '1px solid #f1f5f9', borderRadius: '8px', padding: '12px 14px' }}>
                        {confirmDeleteSecretKey === key ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                <span style={{ color: '#991b1b', fontWeight: '600', fontSize: '13px' }}>Delete key '{key}'?</span>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button onClick={() => { setConfirmDeleteSecretKey(null); onDeleteSecret(target, key); }} style={{ padding: '4px 10px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Delete</button>
                                    <button onClick={() => setConfirmDeleteSecretKey(null)} style={{ padding: '4px 10px', backgroundColor: 'white', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <span style={{ fontWeight: '600', color: '#374151', fontSize: '14px', width: '30%', minWidth: '100px', wordBreak: 'break-word' }}>{key}</span>
                                <span style={{ flex: 1, color: '#111827', fontSize: '14px', padding: '0 16px', fontFamily: visibleSecrets[key] ? 'inherit' : 'monospace', letterSpacing: visibleSecrets[key] ? 'normal' : '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {visibleSecrets[key] ? value : '••••••••••••••••'}
                                </span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => copyToClipboard(value)} style={iconBtn} title="Copy"><CopyIcon /></button>
                                    <button onClick={() => toggleVisibility(key)} style={iconBtn} title={visibleSecrets[key] ? "Hide" : "Show"}>
                                        {visibleSecrets[key] ? <EyeOffIcon /> : <EyeIcon />}
                                    </button>
                                    <button onClick={() => setConfirmDeleteSecretKey(key)} style={dangerIconBtn} title="Delete Key"><TrashIcon /></button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// ==========================================
// Main Application Component
// ==========================================
function App() {
  const [currentView, setCurrentView] = useState<ViewState>('login');
  
  const [unlockedVault, setUnlockedVault] = useState<VaultPayload | null>(null);
  const [aesKey, setAesKey] = useState<Uint8Array | null>(null);
  const [activeVaultId, setActiveVaultId] = useState<string>('');
  const [activeSalt, setActiveSalt] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [undoState, setUndoState] = useState<{ message: string, snapshot: VaultPayload } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  const [dashboardMsg, setDashboardMsg] = useState({ text: '', type: '' });
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [newTarget, setNewTarget] = useState('');
  const [dynamicSecrets, setDynamicSecrets] = useState([{ key: '', value: '', show: false }]);
  

  // ==========================================
  // SECURITY: Auto-Lock Idle Timer (5 Minutes)
  // ==========================================
  useEffect(() => {
    let idleTimeoutId: ReturnType<typeof setTimeout>;

    // Reset the timer whenever the user interacts with the page
    const resetTimer = () => {
      clearTimeout(idleTimeoutId);
      
      // Only run the auto-lock countdown if the vault is currently unlocked
      if (unlockedVault) {
        idleTimeoutId = setTimeout(() => {
          handleLockVault();
          alert("🔒 Vault automatically locked due to 5 minutes of inactivity.");
        }, 5 * 60 * 1000); // 5 minutes in milliseconds
      }
    };

    // If the vault is unlocked, attach the listeners and start the timer
    if (unlockedVault) {
      resetTimer(); // Start initial countdown
      window.addEventListener('mousemove', resetTimer);
      window.addEventListener('keydown', resetTimer);
      window.addEventListener('click', resetTimer);
      window.addEventListener('scroll', resetTimer);
    }

    // Cleanup function: remove listeners when the component unmounts or vault locks
    return () => {
      clearTimeout(idleTimeoutId);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer);
    };
  }, [unlockedVault]); // Re-run this effect whenever the unlockedVault state changes

  const handleUnlockSuccess = (payload: VaultPayload, key: Uint8Array, vaultId: string, salt: string) => {
    setUnlockedVault(payload);
    setAesKey(key);
    setActiveVaultId(vaultId);
    setActiveSalt(salt);
    setCurrentView('dashboard');
    setSearchQuery('');
    setDashboardMsg({ text: '', type: '' });
    setIsAddFormVisible(false);
    setHasUnsavedChanges(false);
    setUndoState(null);
  };

  const handleLockVault = () => {
    setUnlockedVault(null);
    setAesKey(null);
    setActiveVaultId('');
    setActiveSalt('');
    setSearchQuery('');
    setFormError('');
    setDashboardMsg({ text: '', type: '' });
    setIsAddFormVisible(false);
    setHasUnsavedChanges(false);
    setUndoState(null);
    setCurrentView('login');
  };

  const executeWithUndo = (message: string, updateFn: (current: VaultPayload) => VaultPayload) => {
      if (!unlockedVault) return;
      const snapshot = JSON.parse(JSON.stringify(unlockedVault));
      const updatedVault = updateFn(unlockedVault);
      setUnlockedVault(updatedVault);
      setHasUnsavedChanges(true);
      setUndoState({ message, snapshot });
      setDashboardMsg({ text: '', type: '' }); 
  };

  const handleUndo = () => {
      if (!undoState) return;
      setUnlockedVault(undoState.snapshot);
      setUndoState(null);
      setDashboardMsg({ text: "Action undone successfully.", type: 'success' });
  };

  const handleDeleteTarget = (targetToDelete: string) => {
      executeWithUndo(`Target '${targetToDelete}' deleted.`, (vault) => ({
          ...vault, credentials: vault.credentials.filter(c => c.target !== targetToDelete)
      }));
  };

  const handleDeleteSecret = (targetName: string, secretKey: string) => {
      executeWithUndo(`Key '${secretKey}' deleted from '${targetName}'.`, (vault) => {
          const newCreds = vault.credentials.map(cred => {
              if (cred.target === targetName) {
                  const newSecrets = { ...cred.secrets };
                  delete newSecrets[secretKey];
                  return { ...cred, secrets: newSecrets };
              }
              return cred;
          });
          return { ...vault, credentials: newCreds };
      });
  };

  const handleUpdateCredential = (oldTarget: string, newCred: Credential) => {
      executeWithUndo(`Target '${newCred.target}' updated.`, (vault) => {
          const newCreds = vault.credentials.map(c => c.target === oldTarget ? newCred : c);
          return { ...vault, credentials: newCreds };
      });
  };

  const handleAddSecretRow = () => { setDynamicSecrets([...dynamicSecrets, { key: '', value: '', show: false }]); setFormError(''); };
  const handleRemoveSecretRow = (index: number) => { setDynamicSecrets(dynamicSecrets.filter((_, i) => i !== index)); setFormError(''); };
  const handleSecretChange = (index: number, field: 'key' | 'value' | 'show', newValue: string | boolean) => {
      const updated = [...dynamicSecrets];
      if (field === 'show') updated[index].show = newValue as boolean;
      else if (field === 'key') updated[index].key = newValue as string;
      else updated[index].value = newValue as string;
      setDynamicSecrets(updated);
      setFormError('');
  };

  const handleAddCredential = () => {
      if (!unlockedVault) return;
      setFormError('');

      const targetName = newTarget.trim();
      if (!targetName) return setFormError("Please provide a Target name.");

      const isDuplicate = unlockedVault.credentials?.some(c => c.target.toLowerCase() === targetName.toLowerCase());
      if (isDuplicate) return setFormError(`A credential for '${targetName}' already exists.`);

      const secretsMap: Record<string, string> = {};
      let hasValidPair = false;

      for (const pair of dynamicSecrets) {
          const keyName = pair.key.trim();
          if (pair.value && !keyName) return setFormError("All secret values must have a corresponding Key Name.");
          if (keyName) { 
              // FIX: Duplicate key check during Add mode
              if (secretsMap.hasOwnProperty(keyName)) {
                  return setFormError(`Duplicate key found: '${keyName}'. Keys within a target must be unique.`);
              }
              secretsMap[keyName] = pair.value; 
              hasValidPair = true; 
          }
      }

      if (!hasValidPair) return setFormError("Provide at least one valid Key/Value pair.");

      const newCred: Credential = { target: targetName, notes: '', secrets: secretsMap };
      setUnlockedVault({ ...unlockedVault, credentials: [...(unlockedVault.credentials || []), newCred] });
      setNewTarget('');
      setDynamicSecrets([{ key: '', value: '', show: false }]);
      // Note: Form intentionally remains open here
      setHasUnsavedChanges(true);
      setUndoState(null);
      setDashboardMsg({ text: `Credential for '${targetName}' added to local memory.`, type: 'info' });
  };

  const handleSaveVault = async () => {
      if (!unlockedVault || !aesKey || !activeVaultId || !activeSalt) return;
      setIsSaving(true);
      setDashboardMsg({ text: '', type: '' }); 

      try {
          const payloadToSave: VaultPayload = { ...unlockedVault, lastAccessed: new Date().toISOString(), lastModified: new Date().toISOString() };
          const plainTextJson = JSON.stringify(payloadToSave);
          const { cipherTextBase64, ivBase64 } = await encryptVault(plainTextJson, aesKey);

          const envelope: EncryptedVaultEnvelope = {
              kdfAlgorithm: "Argon2id", iterations: 3, memoryKb: 65536, 
              saltBase64: activeSalt, ivBase64: ivBase64, cipherTextBase64: cipherTextBase64
          };

          const response = await fetch(`${API_BASE_URL}/api/vaults/${activeVaultId}`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(envelope)
          });

          if (!response.ok) throw new Error("Failed to save to server");
          
          setDashboardMsg({ text: "Vault successfully encrypted and saved to the server.", type: 'success' });
          setIsAddFormVisible(false);
          setHasUnsavedChanges(false);
          setUndoState(null);

      } catch (error) {
          console.error(error);
          setDashboardMsg({ text: "Failed to save vault to the server.", type: 'error' });
      } finally {
          setIsSaving(false);
      }
  };

  const formatSafeDate = (dateInput?: string | any) => {
      if (!dateInput) return "Unknown";
      const parsedDate = new Date(dateInput);
      return isNaN(parsedDate.getTime()) ? "Unknown Date Format" : parsedDate.toLocaleString();
  };

  const allTargetNames = (unlockedVault?.credentials || []).map(c => c.target);
  const filteredCredentials = (unlockedVault?.credentials || []).filter(c => c.target.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div style={{ padding: '20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      
      {currentView === 'login' && (
        <>
            <Login onUnlockSuccess={handleUnlockSuccess} />
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button onClick={() => setCurrentView('create')} style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '6px' }}>Create a New Vault</button>
            </div>
        </>
      )}

      {currentView === 'create' && (
          <CreateVault onVaultCreated={() => setCurrentView('login')} onCancel={() => setCurrentView('login')} />
      )}

      {currentView === 'dashboard' && unlockedVault && (
        <div style={{ margin: '30px auto' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e5e7eb', paddingBottom: '16px', marginBottom: '24px' }}>
              <div>
                  <h2 style={{ color: '#059669', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      <span>Vault Unlocked: <span style={{ color: '#0c5df3', fontWeight: '800' }}>{activeVaultId}</span></span>
                  </h2>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '6px 0 0 0' }}>Last Accessed: {formatSafeDate(unlockedVault.lastAccessed)}</p>
              </div>
              <button onClick={handleLockVault} style={{ padding: '10px 16px', cursor: 'pointer', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Lock Vault
              </button>
          </div>

          {undoState && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', backgroundColor: '#334155', color: '#f8fafc', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>{undoState.message}</span>
                  <div style={{ display: 'flex', gap: '12px' }}>
                      <button onClick={handleUndo} style={{ background: 'none', border: '1px solid #94a3b8', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                          <UndoIcon /> Undo Action
                      </button>
                      <button onClick={() => setUndoState(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}><CloseIcon /></button>
                  </div>
              </div>
          )}

          {!undoState && dashboardMsg.text && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontWeight: '500', fontSize: '14px', backgroundColor: dashboardMsg.type === 'success' ? '#ecfdf5' : dashboardMsg.type === 'error' ? '#fef2f2' : '#eff6ff', color: dashboardMsg.type === 'success' ? '#065f46' : dashboardMsg.type === 'error' ? '#991b1b' : '#1e40af', border: `1px solid ${dashboardMsg.type === 'success' ? '#a7f3d0' : dashboardMsg.type === 'error' ? '#fecaca' : '#bfdbfe'}` }}>
                  <span>{dashboardMsg.text}</span>
                  <button onClick={() => setDashboardMsg({ text: '', type: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex' }}><CloseIcon /></button>
              </div>
          )}

          {!isAddFormVisible && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                  <button onClick={() => { setIsAddFormVisible(true); setDashboardMsg({ text: '', type: '' }); }} style={{ padding: '10px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>+</span> Add New Credential
                  </button>
                  {hasUnsavedChanges && (
                      <button onClick={handleSaveVault} disabled={isSaving} style={{ padding: '10px 16px', cursor: 'pointer', backgroundColor: '#d97706', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 0 8px rgba(217, 119, 6, 0.4)' }}>
                          {isSaving ? "Saving..." : "⚠️ Unsaved Changes - Save Vault"}
                      </button>
                  )}
              </div>
          )}

          {/* CONDITIONAL ADD CREDENTIAL FORM */}
          {isAddFormVisible && (
              <div style={{ padding: '24px 20px', backgroundColor: '#f8fafc', borderRadius: '12px', marginBottom: '32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                  <div style={{ padding: '0 14px' }}>
                      <h4 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '16px' }}>Add New Credential</h4>
                      <div style={{ marginBottom: '16px' }}>
                          <input type="text" placeholder="Target (e.g., Database Server)" value={newTarget} onChange={e => { setNewTarget(e.target.value); setFormError(''); }} style={{ padding: '10px 12px', width: '100%', boxSizing: 'border-box', fontWeight: 'bold', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                      </div>
                      <div style={{ borderLeft: '3px solid #3b82f6', paddingLeft: '16px', marginBottom: '20px' }}>
                          {dynamicSecrets.map((row, index) => (
                              <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                  <input type="text" placeholder="Key Name" value={row.key} onChange={e => handleSecretChange(index, 'key', e.target.value)} style={{ padding: '10px 12px', flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', minWidth: '150px' }} />
                                  <div style={{ flex: 2, position: 'relative', display: 'flex', minWidth: '200px' }}>
                                      <input type={row.show ? "text" : "password"} placeholder="Secret Value" value={row.value} onChange={e => handleSecretChange(index, 'value', e.target.value)} style={{ padding: '10px 12px', width: '100%', paddingRight: '40px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                                      <button onClick={() => handleSecretChange(index, 'show', !row.show)} type="button" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }} title={row.show ? "Hide" : "Show"}>{row.show ? <EyeOffIcon /> : <EyeIcon />}</button>
                                  </div>
                                  {dynamicSecrets.length > 1 && ( <button onClick={() => handleRemoveSecretRow(index)} style={dangerIconBtn} title="Remove row"><TrashIcon /></button> )}
                              </div>
                          ))}
                          <button onClick={handleAddSecretRow} style={textBtn}>+ Add Row</button>
                      </div>
                      {formError && <div style={{ color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', fontWeight: '500' }}>{formError}</div>}
                      
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <button onClick={handleAddCredential} style={{ flex: 2, padding: '12px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>+ Add to Local Vault</button>
                          
                          <button 
                              onClick={handleSaveVault} 
                              disabled={isSaving || !hasUnsavedChanges} 
                              style={{ 
                                  flex: 2, padding: '12px 16px', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '15px', 
                                  display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                                  backgroundColor: (isSaving || !hasUnsavedChanges) ? '#94a3b8' : '#059669',
                                  color: 'white',
                                  cursor: (isSaving || !hasUnsavedChanges) ? 'not-allowed' : 'pointer'
                              }}
                              title={!hasUnsavedChanges ? "You must click '+ Add to Local Vault' before saving." : "Save changes to server"}
                          >
                              {isSaving ? "Saving..." : "💾 Save Vault to Server"}
                          </button>

                          <button onClick={() => setIsAddFormVisible(false)} style={{ flex: 1, padding: '12px 16px', backgroundColor: 'white', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>Cancel</button>
                      </div>
                  </div>
              </div>
          )}
          
          {/* Search Bar */}
          {unlockedVault.credentials && unlockedVault.credentials.length > 0 && (
              <div style={{ position: 'relative', marginBottom: '20px' }}>
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex' }}><SearchIcon /></div>
                  <input type="text" placeholder="Search targets..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '12px 12px 12px 40px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '15px', outline: 'none' }} />
              </div>
          )}

          <div>
              {(!unlockedVault.credentials || unlockedVault.credentials.length === 0) ? (
                  <p style={{ color: '#94a3b8', fontStyle: 'italic', marginTop: '40px', textAlign: 'center' }}>Your vault is empty. Click "+ Add New Credential" to begin.</p>
              ) : filteredCredentials.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontStyle: 'italic', marginTop: '40px', textAlign: 'center' }}>No targets match your search.</p>
              ) : (
                  filteredCredentials.map((cred, index) => (
                      <CredentialCard 
                          key={`${cred.target}-${index}`} 
                          cred={cred} 
                          allTargets={allTargetNames}
                          onUpdate={handleUpdateCredential}
                          onDeleteTarget={handleDeleteTarget}
                          onDeleteSecret={handleDeleteSecret}
                      />
                  ))
              )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;