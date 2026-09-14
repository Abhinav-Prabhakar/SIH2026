"use client";

// Sliding-pill segmented control (transitions-dev "tabs sliding" pattern,
// mapped onto Nothing tokens: bordered container, inverted active pill).
// First paint + resize write the pill position with transition suspended.

import { useLayoutEffect, useRef } from "react";

export function SlidingTabs({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  const moveTo = (animate: boolean) => {
    const bar = barRef.current;
    const pill = pillRef.current;
    if (!bar || !pill) return;
    const tab = bar.querySelector<HTMLButtonElement>(`.t-tab[data-id="${value}"]`);
    if (!tab) return;
    if (!animate) {
      const prev = pill.style.transition;
      pill.style.transition = "none";
      pill.style.transform = `translateX(${tab.offsetLeft}px)`;
      pill.style.width = `${tab.offsetWidth}px`;
      void pill.offsetWidth;
      pill.style.transition = prev;
    } else {
      pill.style.transform = `translateX(${tab.offsetLeft}px)`;
      pill.style.width = `${tab.offsetWidth}px`;
    }
  };

  const mounted = useRef(false);

  useLayoutEffect(() => {
    // First paint + resize snap without animation; value changes animate.
    moveTo(mounted.current);
    mounted.current = true;
    const onResize = () => moveTo(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div ref={barRef} className="t-tabs" role="tablist" aria-label={ariaLabel}>
      <span ref={pillRef} className="t-tabs-pill" aria-hidden="true" />
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          data-id={o.id}
          aria-selected={o.id === value}
          className="t-tab"
          onClick={() => {
            if (o.id !== value) onChange(o.id);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
