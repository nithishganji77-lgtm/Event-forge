import { Modal } from './Modal.jsx';
import { Button } from './Button.jsx';
import { Alert } from './Alert.jsx';
import { extractErrorMessage } from '../../lib/axios.js';

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  variant = 'accent',
  isPending = false,
  error = null,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        {error && <Alert tone="error">{extractErrorMessage(error)}</Alert>}
        <p className="text-sm text-(--color-text)/70">{description}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={variant} loading={isPending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
