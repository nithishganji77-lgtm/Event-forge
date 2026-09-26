import { Modal } from '../../../components/ui/Modal.jsx';
import { ForgeAiPanel } from './ForgeAiPanel.jsx';

// The panel in a wide modal. It unmounts when closed, so each opening starts clean (and a polish
// text passed in is read fresh).
export function ForgeAiModal({ open, onClose, ...panelProps }) {
  return (
    <Modal open={open} onClose={onClose} title="ForgeAI" size="xl">
      <ForgeAiPanel {...panelProps} />
    </Modal>
  );
}
