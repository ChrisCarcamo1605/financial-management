import { useState, useCallback } from 'react';
import ConfirmModal from '../components/ConfirmModal';

/**
 * Returns [confirm, ConfirmUI].
 *
 * Usage:
 *   const [confirmDelete, ConfirmUI] = useConfirm();
 *   // in JSX: {ConfirmUI}
 *   // in handler: if (!await confirmDelete({ title: '...', message: '...' })) return;
 */
export default function useConfirm() {
  const [state, setState] = useState(null); // null = hidden

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      setState({
        ...opts,
        onConfirm: () => { setState(null); resolve(true); },
        onCancel:  () => { setState(null); resolve(false); },
      });
    });
  }, []);

  const ui = state ? <ConfirmModal {...state} /> : null;

  return [confirm, ui];
}
