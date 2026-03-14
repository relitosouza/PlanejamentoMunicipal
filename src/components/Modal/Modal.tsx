'use client';

import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSave?: () => void;
  saveLabel?: string;
}

export default function Modal({ isOpen, onClose, title, children, onSave, saveLabel = 'Salvar' }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>
        <div className={styles.content}>
          {children}
        </div>
        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onClose}>Cancelar</button>
          {onSave && (
            <button className="btn-primary" onClick={onSave}>{saveLabel}</button>
          )}
        </div>
      </div>
    </div>
  );
}
