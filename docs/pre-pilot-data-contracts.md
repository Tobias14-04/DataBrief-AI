# Pre-pilot P0: accepted sales, missing dimensions and aggregate budget

This supersedes earlier edge-case expectations that rejected sales solely for missing product/category. Source workbooks are unchanged.

## Accepted sales and classification

Date/month, units and documented revenue (including the existing units × price route) remain required. Product/category are optional. Accepted records retain raw source cells, customer/order fields, cost evidence and the original Excel row number. Economic rejections and classification warnings are separate, with at most 100 row details each.

Missing dimension identities are reserved internal keys, never source values. Labels are `Produkt ikke registreret`, `Ikke kategoriseret`, `Kanal ikke registreret` and `Region ikke registreret`. An actual member using the label is distinct and displayed with `(registreret)`. Filter values preserve the raw member identity; display suffixes must never become filter identities.

Missing-product sales remain in totals, distributions and driver reconciliation, but are not one unique product. Product-identity-dependent rankings remain unavailable when identity is incomplete. Customer, order, cost and DG completeness rules are unchanged.

## Budget

Revenue and cost budgets have independent available/missing/invalid/incomplete status. Documented zero is available. A missing cell does not contribute an invented zero to a complete total. Budget result requires both components.

The sole supported model is:

`scope budget = documented workbook budget × accepted scope rows / all accepted sales rows`

Label: **Fordelt samlet budget**. Explanation: **Budgettet er fordelt efter salgsrækkernes andel af det samlede datagrundlag.**

A period column requires the user to accept this aggregate model or continue without budget analysis. The original monthly values are not used as monthly budgets. Totals mixed with detail rows are ambiguous and unavailable, not added twice or automatically deduplicated.

Revenue variance is `A − B`; percentages remain `(A − B) / B` and `A / B`. At `B = 0`, absolute variance/status remain available but percentages are null. Negative revenue budgets retain their signed denominator and status uses absolute variance. **Open contract:** negative cost budgets still use the pre-existing absolute-value policy; this release does not redefine corrections.

## Original workbook control values

| Workbook | Accepted rows | Revenue | Units | Complete DB |
| --- | ---: | ---: | ---: | ---: |
| edge cases | 1,250 | 4,008,395.13 | 9,960 | unavailable |
| 50k | 50,000 | 111,650,946.78 | 354,025 | 57,004,200.55 |
| 150k | 150,000 | 335,700,414.45 | 1,065,951 | 170,910,427.22 |

Edge Excel rows 7 and 18 add 13,589.88 revenue and 18 units. Known variable-cost subtotal is 2,120,396.90 and known DB subtotal 1,884,503.23. Neither is a complete KPI: another accepted row lacks cost evidence. Global DB/DG remain null.

The edge workbook's aggregate revenue budget remains 4,054,727.33. New May allocation is 671,462.85 and Opbevaring allocation 424,935.42, because the denominator now includes all 1,250 valid sales rows.

## Regression coverage and intentionally deferred work

`tests/pre-pilot-contract.test.mjs` covers missing identity, named-label collisions, real filter option values, product completeness, dimension driver reconciliation, zero/negative/incomplete budgets, aggregate scope allocation, acceptance/refusal and ambiguous totals. Existing import-library integration tests cover original edge totals, category/customer scope transitions and period pairs. `tests/browser/import-library-regression.mjs` exercises the real supported-browser UI import and scope journeys.

No monthly budget engine, classification AI, transaction duplicate detection, deduplication, new navigation or redesign is introduced. Budget parsing occurs once during workbook analysis. Classification counts are gathered during the existing import pass; detail lists are bounded. Product completeness is cached per KPI profile.
