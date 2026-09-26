import { useCallback, useRef, useState } from 'react';
import { animate, useMotionValue } from 'framer-motion';

const DRAG_START_PX = 6; // below this it is a click, not a drag
const SWIPE_DISTANCE_PX = 48;
const SWIPE_VELOCITY_PX_PER_MS = 0.4;
const RUBBER_BAND = 0.35; // the stage follows the pointer at a third of the distance: feedback, not a free pan

// Pointer-event swipe for a carousel (mouse, touch and pen through one code path). While dragging,
// `dragX` follows the pointer so the stage visibly gives; on release a long or fast enough swipe
// calls onSwipe(+1 | -1) and `dragX` springs back. Pair it with `touch-action: pan-y` on the
// element so vertical page scrolling still belongs to the browser.
//
// Pointer capture is taken only once the pointer has moved past DRAG_START_PX. Capturing on
// pointerdown would retarget the click to the stage and a plain click on a card would never reach it.
export function useCarouselDrag({ onSwipe, disabled = false }) {
  const dragX = useMotionValue(0);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef(null);
  const suppressClick = useRef(false);

  const onPointerDown = useCallback(
    (event) => {
      if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
      gesture.current = {
        id: event.pointerId,
        startX: event.clientX,
        lastX: event.clientX,
        lastT: event.timeStamp,
        velocity: 0,
        moved: false,
      };
    },
    [disabled]
  );

  const onPointerMove = useCallback(
    (event) => {
      const g = gesture.current;
      if (!g || g.id !== event.pointerId) return;
      const dx = event.clientX - g.startX;

      if (!g.moved) {
        if (Math.abs(dx) < DRAG_START_PX) return;
        g.moved = true;
        setDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
      }

      const dt = event.timeStamp - g.lastT;
      if (dt > 0) g.velocity = (event.clientX - g.lastX) / dt;
      g.lastX = event.clientX;
      g.lastT = event.timeStamp;
      dragX.set(dx * RUBBER_BAND);
    },
    [dragX]
  );

  const finish = useCallback(
    (event, cancelled) => {
      const g = gesture.current;
      if (!g || g.id !== event.pointerId) return;
      gesture.current = null;
      if (!g.moved) return;

      setDragging(false);
      // The click that follows a drag's pointerup is not a selection.
      suppressClick.current = true;
      setTimeout(() => {
        suppressClick.current = false;
      }, 0);

      const dx = event.clientX - g.startX;
      const far = Math.abs(dx) > SWIPE_DISTANCE_PX;
      const fast = Math.abs(g.velocity) > SWIPE_VELOCITY_PX_PER_MS;
      if (!cancelled && (far || fast)) {
        const direction = far ? Math.sign(dx) : Math.sign(g.velocity);
        onSwipe(direction < 0 ? 1 : -1); // dragging left brings the next event
      }
      animate(dragX, 0, { type: 'spring', stiffness: 300, damping: 30 });
    },
    [dragX, onSwipe]
  );

  return {
    dragX,
    dragging,
    shouldSuppressClick: useCallback(() => suppressClick.current, []),
    bind: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (event) => finish(event, false),
      onPointerCancel: (event) => finish(event, true),
    },
  };
}
