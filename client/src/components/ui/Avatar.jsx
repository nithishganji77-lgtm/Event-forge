import { useState } from 'react';
import { cn } from '../../lib/cn.js';

const SIZES = {
  sm: 'size-7 text-[11px]',
  md: 'size-9 text-xs',
  lg: 'size-11 text-sm',
};

export function getInitials(name) {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

// Photo when there is one that loads, initials otherwise (a Google avatar URL can 404 or be
// blocked, so a failed load falls back rather than leaving a broken-image icon). Decorative by
// default — every use sits beside the person's name; pass `label` when it stands alone.
export function Avatar({ name, src, size = 'md', label, className }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <span
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' })}
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        'border border-(--color-border) bg-(--color-bg-secondary) font-medium text-(--color-text)/70',
        SIZES[size],
        className
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}
