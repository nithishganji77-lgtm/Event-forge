import { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { useUploadCoverImage } from '../hooks/useUploadCoverImage.js';
import { Alert } from '../../../components/ui/Alert.jsx';
import { extractErrorMessage } from '../../../lib/axios.js';

// Dual mode: with an eventId (editing an existing event), a picked file uploads immediately.
// Without one (still in the create wizard, before the event exists), it just hands the raw File
// back via onFileSelected so the wizard can upload it as a follow-up call right after the event
// is created — the cover-image endpoint is /events/:eventId/cover-image, which needs a real id.
export function CoverImageUpload({ eventId, currentUrl, onFileSelected }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  // Always called (Rules of Hooks) — only actually triggered via .mutate() when eventId exists.
  const upload = useUploadCoverImage(eventId);

  const displayUrl = previewUrl || currentUrl;

  function handleFile(file) {
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    if (eventId) {
      upload.mutate(file);
    } else if (onFileSelected) {
      onFileSelected(file);
    }
  }

  return (
    <div className="space-y-3">
      {upload?.isError && <Alert tone="error">{extractErrorMessage(upload.error, 'Could not upload image')}</Alert>}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={displayUrl ? 'Change cover image' : 'Add cover image'}
        className="w-full aspect-[16/9] border border-dashed border-(--color-border) flex flex-col items-center justify-center gap-2 text-(--color-text)/50 hover:border-(--color-accent) hover:text-(--color-accent) transition-colors overflow-hidden"
      >
        {displayUrl ? (
          <img src={displayUrl} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <>
            <ImagePlus className="size-6" aria-hidden="true" />
            <span className="text-sm">{upload?.isPending ? 'Uploading…' : 'Add cover image'}</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
