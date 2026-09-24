import { useState } from 'react';
import { CalendarDays, Mic, Wrench, Video, Mountain, PartyPopper } from 'lucide-react';
import { cn } from '../../../lib/cn.js';

// One icon per EVENT_CATEGORIES entry. The generated banner is the fallback for events without a
// cover (most of them), so it has to look intentional rather than empty.
const CATEGORY_ART = {
  Conference: { icon: Mic, angle: 135 },
  Workshop: { icon: Wrench, angle: 160 },
  Webinar: { icon: Video, angle: 120 },
  'Team Offsite': { icon: Mountain, angle: 145 },
  Social: { icon: PartyPopper, angle: 125 },
};
const DEFAULT_ART = { icon: CalendarDays, angle: 135 };

// The uploaded cover when there is one and it loads; otherwise a category-themed banner built from
// the brand accent tinted into the current surface, so it follows light/dark on its own. The cover
// URL only ever goes into <img src> — never CSS url(), where a crafted value could break out of
// the declaration. `children` render on top (the status badge).
export function EventCover({ coverImage, category, className, children }) {
  const [failed, setFailed] = useState(false);
  const art = CATEGORY_ART[category] ?? DEFAULT_ART;
  const Icon = art.icon;
  const showImage = Boolean(coverImage) && !failed;

  return (
    <div className={cn('relative aspect-[16/7] w-full overflow-hidden bg-(--color-bg-secondary)', className)}>
      {showImage ? (
        <img
          src={coverImage}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          aria-hidden="true"
          data-testid="generated-cover"
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(${art.angle}deg, color-mix(in oklab, var(--color-accent) 22%, var(--color-surface)) 0%, var(--color-surface) 75%)`,
          }}
        >
          <Icon className="absolute -right-4 -bottom-5 size-28 text-(--color-accent)/20" strokeWidth={1.25} />
        </div>
      )}
      {children}
    </div>
  );
}
