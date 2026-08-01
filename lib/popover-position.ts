export type PopoverAlignment = "left" | "right";
export type PopoverPlacement = "top" | "bottom";

export type PopoverAnchorRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type FloatingPopoverPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  placement: PopoverPlacement;
};

export function calculateFloatingPopoverPosition({
  anchor,
  popoverWidth,
  popoverHeight,
  viewportWidth,
  viewportHeight,
  align,
  gap = 8,
  viewportPadding = 16,
}: {
  anchor: PopoverAnchorRect;
  popoverWidth: number;
  popoverHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  align: PopoverAlignment;
  gap?: number;
  viewportPadding?: number;
}): FloatingPopoverPosition {
  const availableWidth = Math.max(0, viewportWidth - viewportPadding * 2);
  const width = Math.min(popoverWidth, availableWidth);
  const preferredLeft = align === "right" ? anchor.right - width : anchor.left;
  const left = Math.min(
    Math.max(viewportPadding, preferredLeft),
    Math.max(viewportPadding, viewportWidth - viewportPadding - width),
  );
  const availableBelow = Math.max(
    0,
    viewportHeight - viewportPadding - anchor.bottom - gap,
  );
  const availableAbove = Math.max(0, anchor.top - viewportPadding - gap);
  const placement: PopoverPlacement = availableBelow < popoverHeight
    && availableAbove > availableBelow
    ? "top"
    : "bottom";
  const availableHeight = placement === "top" ? availableAbove : availableBelow;
  const maxHeight = Math.max(96, availableHeight);
  const renderedHeight = Math.min(popoverHeight, maxHeight);
  const top = placement === "top"
    ? Math.max(viewportPadding, anchor.top - gap - renderedHeight)
    : Math.min(anchor.bottom + gap, viewportHeight - viewportPadding - renderedHeight);

  return { left, top, width, maxHeight, placement };
}
