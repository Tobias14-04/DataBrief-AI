import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { calculateFloatingPopoverPosition } from "../lib/popover-position.ts";

test("popover placeres under en kontrol med luft til viewportens kanter", () => {
  const position = calculateFloatingPopoverPosition({
    anchor: { left: 100, right: 300, top: 80, bottom: 124 },
    popoverWidth: 304,
    popoverHeight: 240,
    viewportWidth: 1_280,
    viewportHeight: 768,
    align: "left",
  });

  assert.equal(position.placement, "bottom");
  assert.equal(position.left, 100);
  assert.equal(position.top, 132);
});

test("højrejusteret popover klemmes inden for højre viewportkant", () => {
  const position = calculateFloatingPopoverPosition({
    anchor: { left: 330, right: 390, top: 40, bottom: 84 },
    popoverWidth: 304,
    popoverHeight: 200,
    viewportWidth: 390,
    viewportHeight: 844,
    align: "right",
  });

  assert.equal(position.left, 70);
  assert.equal(position.width, 304);
});

test("popover vender opad tæt på viewportens bund og forbliver synlig", () => {
  const position = calculateFloatingPopoverPosition({
    anchor: { left: 900, right: 1_180, top: 700, bottom: 744 },
    popoverWidth: 304,
    popoverHeight: 260,
    viewportWidth: 1_280,
    viewportHeight: 768,
    align: "right",
  });

  assert.equal(position.placement, "top");
  assert.equal(position.top, 432);
  assert.equal(position.left, 876);
});

test("PremiumSelect bruger body-portal, fixed position og fælles lagtoken", () => {
  const selectSource = readFileSync(
    new URL("../components/premium-select.tsx", import.meta.url),
    "utf8",
  );
  const popoverSource = readFileSync(
    new URL("../components/floating-popover.tsx", import.meta.url),
    "utf8",
  );
  const filterSource = readFileSync(
    new URL("../components/dashboard-control-bar.tsx", import.meta.url),
    "utf8",
  );

  assert.match(selectSource, /<FloatingPopover/u);
  assert.match(filterSource, /scope="dashboard-control"/u);
  assert.match(popoverSource, /createPortal/u);
  assert.match(popoverSource, /document\.body/u);
  assert.match(popoverSource, /premium-popover fixed/u);
  assert.match(popoverSource, /UI_LAYER_POPOVER/u);
  assert.match(popoverSource, /addEventListener\("scroll", updatePosition, true\)/u);
});
