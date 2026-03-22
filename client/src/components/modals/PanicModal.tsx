"use client";

import { Modal } from "@/components/ui";

interface PanicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function PanicModal({
  isOpen,
  onClose,
  onConfirm,
}: PanicModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Wipe Data?">
      <div className="space-y-6">
        <p className="text-[var(--text-secondary)]">
          This will delete all local keys, contacts and messages on this
          device. It cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 apple-button-secondary"
          >
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 apple-button">
            Wipe
          </button>
        </div>
      </div>
    </Modal>
  );
}
