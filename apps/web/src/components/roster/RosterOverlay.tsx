// apps/web/src/components/roster/RosterOverlay.tsx
'use client';

import { useEffect, useRef } from 'react';
import styles from './RosterOverlay.module.css';

type OverlayMode = 'create' | 'existing';

type Props = {
    open: boolean;
    mode: OverlayMode;
    personId?: string;
    creationStage?: 'pre_person' | 'post_person';
    onClose: () => void;
};

export function RosterOverlay(props: Props) {
    const { open, mode, personId, creationStage, onClose } = props;

    const modalRef = useRef<HTMLDivElement | null>(null);
    const firstFieldRef = useRef<HTMLInputElement | null>(null);

    // ESC closes (never saves)
    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    // Focus: first field in Person section
    useEffect(() => {
        if (!open) return;
        // Delay to ensure render completed
        const t = window.setTimeout(() => {
            firstFieldRef.current?.focus();
        }, 0);
        return () => window.clearTimeout(t);
    }, [open]);

    // Minimal focus trap (Tab wraps within modal)
    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;
            const root = modalRef.current;
            if (!root) return;

            const focusables = root.querySelectorAll<HTMLElement>(
                'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
            );
            if (focusables.length === 0) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const active = document.activeElement as HTMLElement | null;

            if (e.shiftKey) {
                if (!active || active === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (active === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open]);

    if (!open) return null;

    const subtitle =
        mode === 'existing'
            ? `mode=existing personId=${personId ?? '(missing)'}`
            : `mode=create stage=${creationStage ?? 'pre_person'}`;

    return (
        <div className={styles.backdrop} aria-hidden="true">
            <div
                ref={modalRef}
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-label={mode === 'existing' ? 'Person Workspace' : 'Add New Person'}
            >
                <div className={styles.modalHeader}>
                    <div className={styles.titleBlock}>
                        <div className={styles.title}>
                            {mode === 'existing' ? 'Person Workspace' : 'Add New Person'}
                        </div>
                        <div className={styles.subtitle}>{subtitle}</div>
                    </div>

                    <button type="button" className={styles.closeButton} onClick={onClose}>
                        Close
                    </button>
                </div>

                <div className={styles.modalBody}>
                    <div className={styles.sectionCard}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.sectionTitle}>Person</div>
                            <div className={styles.sectionHelper}>First field auto-focus target</div>
                        </div>
                        <div className={styles.sectionBody}>
                            <label className={styles.fieldLabel}>
                                Full name (placeholder)
                                <input
                                    ref={firstFieldRef}
                                    className={styles.textInput}
                                    placeholder="(wiring later)"
                                />
                            </label>
                        </div>
                    </div>

                    <div className={`${styles.sectionCard} ${styles.sectionDisabled}`}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.sectionTitle}>Location Assignments</div>
                            <div className={styles.sectionHelper}>Disabled placeholder</div>
                        </div>
                        <div className={styles.sectionBody}>
                            <div className={styles.mutedText}>Create person to assign locations</div>
                        </div>
                    </div>

                    <div className={`${styles.sectionCard} ${styles.sectionDisabled}`}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.sectionTitle}>Activity Assignments</div>
                            <div className={styles.sectionHelper}>Disabled placeholder</div>
                        </div>
                        <div className={styles.sectionBody}>
                            <div className={styles.mutedText}>Create person to assign activities</div>
                        </div>
                    </div>

                    <div className={`${styles.sectionCard} ${styles.sectionDisabled}`}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.sectionTitle}>Schedule</div>
                            <div className={styles.sectionHelper}>Coming soon</div>
                        </div>
                        <div className={styles.sectionBody}>
                            <div className={styles.mutedText}>Schedule management is not enabled yet</div>
                        </div>
                    </div>
                </div>

                <div className={styles.modalFooter}>
                    <div className={styles.footerLeft}>
                        {mode === 'create'
                            ? 'Create the person record to continue'
                            : 'Viewing current roster data'}
                    </div>
                    <div className={styles.footerRight}>
                        <button type="button" className={styles.primaryButtonDisabled} disabled>
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
