"use client";

import { useState, useRef } from "react";
import { Modal, Button } from "@/components/ui";
import { exportEncryptedBackup, importEncryptedBackup } from "@/crypto/storage";
import { reconcileRestoreConsistency } from "@/lib/settingsConsistency";

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterKey: Uint8Array | null;
}

export default function BackupModal({
  isOpen,
  onClose,
  masterKey,
}: BackupModalProps) {
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupPin, setBackupPin] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setBackupPin("");
    setBackupStatus(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {
      resetState();
      onClose();
    }} title="Backup & Restore">
      <div className="space-y-4">
        <p className="text-[var(--text-secondary)] text-sm">
          Export keys/chats/contacts as an encrypted file. Enter your PIN to
          encrypt/decrypt. Store offline.
        </p>
        <input
          type="password"
          value={backupPin}
          onChange={(e) => setBackupPin(e.target.value)}
          placeholder="Enter PIN"
          aria-label="Backup PIN"
          className="apple-input text-center tracking-[0.2em]"
        />
        <Button
          fullWidth
          loading={backupLoading}
          onClick={async () => {
            if (!masterKey || !backupPin) {
              setBackupStatus("Enter your PIN to export backup.");
              return;
            }
            setBackupStatus(null);
            setBackupLoading(true);
            try {
              const data = await exportEncryptedBackup(masterKey, backupPin);
              const blob = new Blob([data], { type: "application/octet-stream" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              const date = new Date().toISOString().split("T")[0];
              a.download = `lume-backup-${date}.bin`;
              a.click();
              URL.revokeObjectURL(url);
              setBackupStatus(
                "Backup downloaded. Save this file in a safe place \u2014 iCloud, Google Drive, or a flash drive. Without it, recovery is impossible."
              );
            } catch (e) {
              if (process.env.NODE_ENV !== "production") console.error("Backup export error:", e);
              setBackupStatus("Backup failed. Check your PIN and try again.");
            } finally {
              setBackupLoading(false);
            }
          }}
        >
          Export
        </Button>

        <div className="border-t border-[var(--border)]" />

        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".bin"
            className="hidden"
            aria-label="Select backup file"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setSelectedFile(file);
            }}
          />
          <Button
            fullWidth
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            {selectedFile ? selectedFile.name : "Select backup file"}
          </Button>
          <Button
            fullWidth
            variant="secondary"
            loading={backupLoading}
            disabled={!selectedFile}
            onClick={async () => {
              if (!backupPin) {
                setBackupStatus("Enter your PIN to restore backup.");
                return;
              }
              if (!selectedFile) return;
              setBackupStatus(null);
              setBackupLoading(true);
              try {
                const text = await selectedFile.text();
                await importEncryptedBackup(text, backupPin);
                await reconcileRestoreConsistency();
                setBackupStatus("Backup restored. Restart the application.");
              } catch (e) {
                if (process.env.NODE_ENV !== "production") console.error("Backup restore error:", e);
                setBackupStatus("Restore failed. Check your file and PIN.");
              } finally {
                setBackupLoading(false);
              }
            }}
          >
            Restore
          </Button>
        </div>

        {backupStatus && (
          <p className="text-xs text-[var(--text-secondary)]">
            {backupStatus}
          </p>
        )}
      </div>
    </Modal>
  );
}
