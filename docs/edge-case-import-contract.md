# Import and KPI completeness

- Total DB is available only when every accepted sales row in the current scope has finite documented DB (including DB derived from documented variable row costs). Zero is valid. A known subtotal is internal aggregation data, not a complete DB KPI. DG retains the shared complete DB / revenue contract and documented complete revenue-weighted DG fallback.
- Customer count uses the same stable customer-id guard as the other customer KPIs. Every purchase row in the current scope must have an id. Names do not supply identity.
- Calendar dates use `business-date.ts` in import, KPI periodization and month labels. Numeric string dates are Danish day/month/year with matching `-`, `/` or `.` separators. Two-digit years mean 20xx. ISO year-month-day and explicit ISO timestamps, valid Date objects and Excel 1900-system serial dates are supported. Numeric strings, invalid calendar dates, mixed separators and unspecified natural-language/US formats are not guessed. Excel serial fractions represent time and do not round into the next day. Serial 60 is invalid (Excel's fictitious leap day).
- Import preserves the existing rejection of sales rows without product/category or valid revenue/units. Blank and summary rows are handled as before. Rejected sales rows expose Excel row number, reasons and only documented revenue/units. Partial economic totals are labelled with coverage. All rejection counts/totals are retained; the UI renders at most the first 100 row details.

A valid transaction date owns the sales row's month in all views, even when the month column disagrees. A month column supplies periodization only when no valid calendar date exists. This matches dashboard aggregation and KPI date grouping; it does not change the complete/partial-month comparison policy.

## Open product decisions

The exclusion versus aggregate inclusion of sales rows without product/category remains a separate product decision. No new rules are introduced for actual sales with zero budget, truly missing period budgets or exact duplicate transactions.
