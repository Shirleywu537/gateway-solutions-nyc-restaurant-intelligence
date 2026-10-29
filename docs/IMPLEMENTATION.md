# Gateway NYC Restaurant Intelligence

An English restaurant research website with a home page, Market Investigator, Location Picker, and Risk Analyzer.

## Sources and data meaning

- `/api/news` reads the Eater NY feed and filters the last seven completed New York calendar days. The dated curated brief is a fallback. Weekly cuisine shares count keyword matches, not sales or consumer preference.
- `/api/market-metrics` reads NYC DOHMH dataset `43nn-pn8j`, aggregates one row per CAMIS restaurant ID, and calculates category shares with missing cuisine labels included. Cuisine labels use the maximum non-empty string to break any historical-label tie. Results are stored for up to 24 hours.
- `/api/policies` reads the last 365 days of Agency Rules from City Record dataset `dg92-zbpx`, filters selected agencies and restaurant topics, and deduplicates notice IDs. A title-derived adoption label does not establish an effective date or applicability. Results are stored for up to one hour. The reference risk calculations are separate, reviewed rules.
- Map geometry is simplified NYC Planning borough boundaries, dataset `gthc-hcne`, retrieved October 11, 2026. Markers are approximate neighborhood centers, not property listings. Rents, transit scores, and fit assumptions remain illustrative. Fifteen concepts now map to explicit cuisine categories for live 1 km local-supply comparisons. Broad service formats use disclosed menu-category proxies; the three service-format assumptions are retained only as a labeled fallback when evidence is insufficient.

## Daily updates

All three official-data routes are public read-through caches. They accept no source URL, content, or write payload from a visitor. Only server code fetches fixed official sources, validates their shape, and updates a fixed cache key. There is no public arbitrary-data writer or private business data in this cache.

The Site MCP tool `read_gateway_public_updates` checks all three official-source caches and returns their successful check times and stale/error state. A linked Sites schedule should call this tool each day at 08:00 America/New_York and read it again to verify the stored result. Public GET routes `/api/policies`, `/api/market-metrics`, and `/api/location-signals` serve the same data to the website. These ordinary reads trigger source refreshes when the cache has expired, so no sign-in, private credentials, local session, or republishing is needed. Read each response again to verify `fetchedAt`, `stale`, `error`, and `data`; a successful cache readback preserves the same `fetchedAt`. A recent snapshot may be reused, and the UI reports the actual successful source check time. The news feed refreshes when its tool is opened and by its manual button.

Source failures preserve the last good snapshot and mark it stale. Failed rechecks back off for five minutes. An initial failure returns HTTP 503 instead of invented data. The cache is a shared D1 table, generated with the included Drizzle migration.

## Development and verification

Run the existing `dev` script for the Vinext preview. Apply D1 migrations locally using the Sites starter instructions before testing data routes. Build and publish with the Sites source workflow and preserve the existing project ID and audience.

- Type check: `node node_modules/typescript/bin/tsc --noEmit`
- Data and filtering checks: `node --experimental-strip-types --test tests/data-models.test.mjs`
- UI checks cover desktop/mobile, all four views, chart switching, expanded concept filters, map selection, and notice filtering.

## October 20 concept intelligence update

- `/api/location-signals` retrieves consistent cuisine/geocode groups by CAMIS, selects the most recent inspected group per establishment (then record date and deterministic tie-break), validates NYC coordinate bounds, and aggregates 1 km circles around eight neighborhood centers. Missing geocodes are excluded and reported. Each mapped establishment counts once in the city denominator; circles may overlap. Source records include active establishments and permit applicants.
- Location ranking uses 55% cuisine presence, 25% budget fit, and 20% illustrative transit. Presence is `50 + (min(100, 50 * sqrt(localShare / cityShare)) - 50) * min(1, matchingCount / 10)`, rounded. At least 20 nearby records and 10 citywide matching records are needed; otherwise the original labeled fallback is used. Zero local matches remain visible and should not be interpreted as demand. These are screening assumptions, not validated predictions.
- Operating profile includes a restaurant concept. Applying the profile changes reference checklists, headline keyword matches, and policy-topic priorities. General notices remain included by default, can be expanded, and are not treated as inapplicable merely because their topics are lower priority. A concept label never establishes legal applicability. The news source is Eater NY, separate from official notices.
- Food-safety notice matching no longer treats every Health Code reference as a food rule; unrelated vital-record notices are excluded. Policy cache key is version 3.
- Gateway Assistant is available on all four views. It is a transparent, rule-based research assistant, not an LLM or generative AI service. It supports free-text English/Chinese questions, known concepts, budget/borough follow-ups, source-linked answers, and opening the matching tool context. Unsupported questions get a scoped explanation; source failures are not fabricated as successful results. Questions and conversation stay in browser memory, no chat payload is sent to the server, and history clears on a full page reload.
- No paid model API, API key, additional account, or new external service is required. A future generative-AI upgrade requires a separately configured model provider and cost/privacy choices.

Validation: seven meaningful model/data tests; TypeScript; production build; live official-source data; desktop and 390 px mobile UI checks; concept-switch rankings, conditional risk/news changes, assistant follow-ups and source links. Public-source retrieval is verified locally. Publication of this update is pending because the session's interactive source-sync tool was rejected by automatic approval policy; the prior live website remains deployed.
