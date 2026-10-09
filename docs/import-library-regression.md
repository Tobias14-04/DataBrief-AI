# Import/date and KPI-library scope regressions

The control workbook is read-only. It is not bundled into the repository.

Run the calculation/import/wiring integration checks with the actual workbook:

```powershell
$env:SENVORIQ_EDGE_CASE_FILE = 'C:\Users\Tobias\Downloads\senvoriq_edge_cases.xlsx'
node --experimental-strip-types --test tests/import-library-integration.test.mjs tests/edge-case-correctness.test.mjs
npm test
```

Without that environment variable, the synthetic XLSX, canonical evaluation and
component-wiring tests still run; only the external-workbook test is skipped.
These tests do not replace the browser check below.

## Browser integration

Use the supported browser-use tab API against a local production build. Import
`tests/browser/import-library-regression.mjs` in the browser REPL and pass the
current tab to its exported checks. Do not save test-only KPI choices.

1. `importEdgeWorkbook(tab, path)`: upload, apply manual column review, skip
   onboarding. This intentionally maps the selected Dato column, so a separate
   month column cannot mask invalid date parsing. Import warnings remain visible.
2. `verifyLibrary(tab, false)`: DB, DG and Antal kunder unavailable globally.
3. Select Opbevaring through the category toolbar; close the dropdown.
   `verifyLibrary(tab, true)`: all three available, 131 accepted rows.
4. `verifyFilterReset(tab)`: change to Kontorstol Atlas, verify DB/DG unavailable,
   reset and verify all three unavailable globally again. No earlier values may
   remain available under a different scope.
5. On a disposable tab with Opbevaring selected,
   `verifyOpbevaringValues(tab)`: add the three KPIs to the unsaved draft and
   inspect preview. Expected display: DB 172.416 kr., DG 56,3 %, 114 customers.
   The numeric integration test asserts DB 172416.12 and DG 172416.12/306313.12.
6. `verifyPeriodDrivers(tab)` after resetting filters: Analyse → Udvikling must
   have April 447668.45 revenue, 1446 units and
   217666.45 complete DB; no unknown-month group for `2026/04/16`.
7. Select May. Ledelse → Indsigter must compare May 472131.14 with April
   447668.45, absolute change 24462.69, growth about 5.46%. Inspect product,
   category, channel and region drivers. The numeric integration check asserts
   each full dimension reconciles separately to that change, including any rest.

The library retains the base cache for unchanged scope and evaluates filtered
scopes in cancellable 16-ms batches, only when opened. Completed batches are
accepted only for their exact context/profile references; pending filter updates
show the existing loading state. Antal kunder reads the explicit sales profile,
not supplemental budget/balance rows that may also contain a revenue column.
No KPI formula, budget/driver algorithm, filter or comparison contract changes.

## Completed browser verification

The local production build was checked on 9 October 2026 using the unchanged
edge workbook. Global → Opbevaring → Kontorstol Atlas → reset passed through
the real toolbar and library. Reset restored all 1248 rows and the three global
unavailable states. April had no unknown-month group; May/April showed +24463 kr.
and +5.5% at the existing display precision for all four driver dimensions.
The raw-value integration assertions separately verify +24462.69 kr. and the
unrounded growth ratio. Browser console had no errors.

## Category/customer availability follow-up

The category component now receives `metrics.hasGrossProfit`, from the same
filtered aggregates as its category rows, not `baseMetrics.hasGrossProfit`.
The category calculations, completeness and CSV definitions are unchanged.

The canonical evaluator selects `context.salesProfile` for customer-category
KPIs before both requirements and calculation. All customer formulas and
identity/order/history guards remain unchanged. Supplemental budget rows stay
in the workbook profile for other metrics, but are not customer purchases.
Standalone registry callers without an explicit sales profile continue to
supply their sales-only profile as before. No extra full-dataset scan is added.

The browser follow-up passed two repetitions of global → Opbevaring →
Kontorstol Atlas → reset through Analyse → Kategorier and all seven
identity-dependent customer library entries. Use
`verifyCategoryCustomerTransitions(tab)` after importing the edge workbook.
`verifyCustomerPreview(tab)` is a final check on a disposable Opbevaring tab:
114 customers, 8 returning customers and 2686.96 kr. average revenue/customer.
Do not save its test draft. Category card/table show 56.3% and 172.4 t.kr. at
existing display precision. Raw tests assert 172416.12 kr. and 56.29% rounded.
Indsigter and Rapport show the same 56.3% snapshot and 131-row scope; existing
partial-period/result-allocation explanations remain in effect.

Integration coverage includes sales-only workbooks, supplemental budgets with
and without customer/order/date fields, missing IDs on actual sales, missing
orders that cannot be supplied by budget rows, canonical rankings, unique
orders rather than sales lines, category rows/CSV/observations, and repeated
complete/incomplete/reset transitions. The 50k/150k control totals are unchanged.
