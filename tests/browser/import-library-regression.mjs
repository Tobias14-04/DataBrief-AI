// Run through the supported browser-use tab API on a local /upload page.
// This is a real UI regression, separate from npm's calculation/wiring tests.
// Example in cua_repl: const qa = await import(<absolute file URL>);
// await qa.importEdgeWorkbook(tab, <absolute edge workbook path>);
// await qa.verifyLibrary(tab, false); // no filters
// Apply category Opbevaring through the toolbar, then verifyLibrary(tab, true).
// Repeat with Kontorstol Atlas and reset, expecting false.
function requireText(text, expected) {
  if (!text.replace(/\s+/gu, " ").includes(expected.replace(/\s+/gu, " "))) throw new Error(`Browser regression: expected ${JSON.stringify(expected)} in ${JSON.stringify(text)}`);
}
export async function importEdgeWorkbook(tab, path) {
  const chooserEvent = tab.playwright.waitForEvent("filechooser");
  await tab.playwright.getByRole("button", { name: "Vælg en Excel-fil Vælg en .xlsx-fil fra din enhed Fleksible danske og engelske kolonnenavne", exact: true }).click();
  const chooser = await chooserEvent;
  await chooser.setFiles(path);
  const apply = tab.playwright.getByRole("button", { name: "Anvend og fortsæt til dashboard", exact: true });
  await apply.waitFor({ state: "visible", timeoutMs: 30000 });
  const warning = await tab.playwright.getByTestId("import-rejections").innerText();
  requireText(warning, "13.589,88");
  requireText(warning, "18");
  await apply.click();
  const skip = tab.playwright.getByRole("button", { name: "Spring over", exact: true });
  if (await skip.isVisible()) await skip.click();
  await tab.playwright.getByRole("button", { name: "Tilpas nøgletal", exact: true }).waitFor({ state: "visible", timeoutMs: 30000 });
}
export async function verifyLibrary(tab, available, names = ["Dækningsbidrag", "Dækningsgrad", "Antal kunder"]) {
  await tab.playwright.getByRole("button", { name: "Tilpas nøgletal", exact: true }).click();
  await tab.playwright.getByRole("tab", { name: "Tilføj nøgletal", exact: true }).click();
  const search = tab.playwright.getByRole("searchbox", { name: "Søg efter nøgletal", exact: true });
  await search.waitFor({ state: "visible", timeoutMs: 30000 });
  await tab.playwright.getByRole("button", { name: available ? "Tilgængelige" : "Mangler data", exact: true }).click();
  for (const name of names) {
    await search.fill(name);
    const card = tab.playwright.getByRole("article").filter({ has: tab.playwright.getByRole("heading", { name, exact: true }) });
    await card.waitFor({ state: "visible", timeoutMs: 30000 });
    requireText(await card.innerText(), available ? "Klar" : "Mangler data");
    const add = card.getByRole("button", { name: available ? "Tilføj" : "Kan ikke tilføjes", exact: true });
    if (await add.isEnabled() !== available) throw new Error(`${name}: wrong add-button availability`);
  }
  await tab.playwright.getByRole("button", { name: "Luk Tilpas nøgletal", exact: true }).click();
  return { available, names };
}

export async function verifyOpbevaringValues(tab) {
  await tab.playwright.getByRole("button", { name: "Tilpas nøgletal", exact: true }).click();
  await tab.playwright.getByRole("tab", { name: "Tilføj nøgletal", exact: true }).click();
  const search = tab.playwright.getByRole("searchbox", { name: "Søg efter nøgletal", exact: true });
  await search.waitFor({ state: "visible", timeoutMs: 30000 });
  for (const name of ["Dækningsbidrag", "Dækningsgrad", "Antal kunder"]) {
    await search.fill(name);
    const card = tab.playwright.getByRole("article").filter({ has: tab.playwright.getByRole("heading", { name, exact: true }) });
    await card.getByRole("button", { name: "Tilføj", exact: true }).click();
    const secondary = card.getByRole("button", { name: /^Sekundært/ });
    if (await secondary.isVisible()) await secondary.click();
  }
  await tab.playwright.getByRole("tab", { name: "Forhåndsvisning", exact: true }).click();
  const text = (await tab.playwright.getByRole("tabpanel").innerText()).replace(/\s+/gu, " ");
  requireText(text, "Dækningsbidrag 172.416 kr.");
  requireText(text, "Dækningsgrad 56,3 %");
  requireText(text, "Antal kunder 114");
  // Leave the preview open for a screenshot. The draft is intentionally not
  // saved; use a disposable test tab and discard it after this check.
  return text;
}

export async function verifyFilterReset(tab) {
  await tab.playwright.getByRole("button", { name: "Nulstil", exact: true }).click();
  await tab.playwright.getByRole("button", { name: "Produkt Alle produkter", exact: true }).click();
  await tab.playwright.getByRole("button", { name: "Kontorstol Atlas", exact: true }).click();
  await tab.playwright.getByRole("button", { name: "Produkt Kontorstol Atlas", exact: true }).click();
  await verifyLibrary(tab, false, ["Dækningsbidrag", "Dækningsgrad"]);
  await tab.playwright.getByRole("button", { name: "Nulstil", exact: true }).click();
  await verifyLibrary(tab, false);
  return "Incomplete product and reset availability verified";
}

export async function verifyPeriodDrivers(tab) {
  const analyse = tab.playwright.getByRole("button", { name: "Analyse", exact: true });
  if (!await analyse.isVisible()) await tab.playwright.getByRole("button", { name: "Åbn navigation", exact: true }).click();
  await analyse.click();
  const table = await tab.playwright.getByRole("table").innerText();
  requireText(table, "447.668");
  requireText(table, "1.446");
  requireText(table, "217.666");
  if (table.includes("Ukendt måned")) throw new Error("Slash YMD row still has an unknown period");
  await tab.playwright.getByRole("button", { name: "Periode Alle perioder", exact: true }).click();
  await tab.playwright.getByRole("button", { name: "maj 2026", exact: true }).click();
  const ledelse = tab.playwright.getByRole("button", { name: "Ledelse", exact: true });
  if (!await ledelse.isVisible()) await tab.playwright.getByRole("button", { name: "Åbn navigation", exact: true }).click();
  await ledelse.click();
  await tab.playwright.getByRole("tab", { name: "Indsigter", exact: true }).click();
  for (const dimension of ["Produkt", "Kategori", "Kanal", "Region"]) {
    await tab.playwright.getByRole("button", { name: "Vælg dimension til driveranalyse", exact: true }).click();
    await tab.playwright.getByRole("option", { name: dimension, exact: true }).click();
    const text = await tab.playwright.getByRole("tabpanel", { name: "Indsigter", exact: true }).innerText();
    requireText(text, "april 2026 → maj 2026");
    requireText(text, "+24.463");
    requireText(text, "+5,5 %");
    if (/NaN|Infinity/u.test(text)) throw new Error(`Non-finite browser value in ${dimension}`);
  }
  return "April import and four May/April driver views verified";
}
