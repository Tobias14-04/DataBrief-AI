"use client";

import {
  useLayoutEffect,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  calculateFloatingPopoverPosition,
  type FloatingPopoverPosition,
  type PopoverAlignment,
} from "@/lib/popover-position";
import { UI_LAYER_POPOVER } from "@/lib/ui-layers";

export function FloatingPopover({
  open,
  anchorRef,
  popoverRef,
  align = "right",
  preferredWidth = 304,
  scope,
  className = "",
  children,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  popoverRef: RefObject<HTMLDivElement | null>;
  align?: PopoverAlignment;
  preferredWidth?: number;
  scope?: string;
  className?: string;
  children: ReactNode;
}) {
  const [position, setPosition] = useState<FloatingPopoverPosition | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    let animationFrame = 0;
    function updatePosition() {
      const anchor = anchorRef.current;
      const popover = popoverRef.current;
      if (!anchor || !popover) return;
      setPosition(calculateFloatingPopoverPosition({
        anchor: anchor.getBoundingClientRect(),
        popoverWidth: preferredWidth,
        popoverHeight: popover.scrollHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        align,
      }));
    }

    updatePosition();
    animationFrame = window.requestAnimationFrame(updatePosition);
    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(updatePosition);
    if (popoverRef.current) resizeObserver?.observe(popoverRef.current);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [align, anchorRef, open, popoverRef, preferredWidth]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={popoverRef}
      data-floating-popover-scope={scope}
      data-placement={position?.placement}
      className={`premium-popover fixed flex flex-col overflow-hidden rounded-xl border border-[#cfdee5] bg-white shadow-[0_22px_55px_rgba(7,22,37,0.18)] ${className}`}
      style={{
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        width: position?.width ?? Math.min(preferredWidth, window.innerWidth - 32),
        maxHeight: position?.maxHeight,
        visibility: position ? "visible" : "hidden",
        zIndex: UI_LAYER_POPOVER,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
