import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ConfirmModal.css';

/**
 * ConfirmModal — Custom premium modal for critical confirmations.
 * 
 * Props:
 *   open       : boolean — show/hide
 *   title      : string  — "¿Cerrar Turno?"
 *   message    : string  — descriptive text
 *   icon       : string  — emoji or null ('⚠️', '🗑️', '💰', '✅')
 *   confirmText: string  — "Confirmar" (default)
 *   cancelText : string  — "Cancelar" (default)
 *   onConfirm  : () => void
 *   onCancel   : () => void
 *   danger     : boolean — red confirm button for destructive actions
 *   children   : optional extra content inside the modal
 */
export default function ConfirmModal({
    open,
    title = '¿Estás seguro?',
    message = '',
    icon = '⚠️',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
    danger = false,
    children
}) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="confirm-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={onCancel}
                >
                    <motion.div
                        className="confirm-modal-card"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        onClick={e => e.stopPropagation()}
                    >
                        {icon && <div className="confirm-modal-icon">{icon}</div>}
                        <h3 className="confirm-modal-title">{title}</h3>
                        {message && <p className="confirm-modal-message">{message}</p>}
                        {children && <div className="confirm-modal-body">{children}</div>}
                        <div className="confirm-modal-actions">
                            <button
                                className="confirm-modal-btn confirm-modal-btn-cancel"
                                onClick={onCancel}
                            >
                                {cancelText}
                            </button>
                            <button
                                className={`confirm-modal-btn confirm-modal-btn-confirm ${danger ? 'danger' : ''}`}
                                onClick={onConfirm}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
