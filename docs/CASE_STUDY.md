# Karama: from salary conversion to salary decisions

## Problem

A gross salary does not tell a candidate what they will receive, or an employer what a position will cost. Karama starts with a direct calculator, then provides an optional workshop for the decisions that follow: comparing offers, negotiating an increase and planning payroll costs.

## Product choices

A short homepage introduces the salary tools, led by a procedural Three.js banknote scene carrying the Karama-Ko identity. The calculator remains one click away, and shared calculator URLs open it directly. The name fades and the notes gather during the transition toward the tool directory. Motion is kept separate from the financial state, with reduced-motion support and a static fallback. Advanced tools occupy a separate workspace. The workshop uses a desktop navigation rail and a horizontally scrollable navigation list on small screens. Salary differences are written explicitly rather than left for users to calculate.

Each tool has a concrete output: a negotiation gross, a budget-compatible offer, a twelve-month projection or a line-by-line payslip comparison. The same source engine drives every result. Monthly estimates are aggregated after computation; annual salaries are never incorrectly fed into monthly tax brackets.

The muted light theme, burgundy controls and Cabinet Grotesk/Satoshi pairing follow the user's design feedback. The background responds to pointer movement and highlights its actual grid cells, while respecting reduced-motion preferences. Decoration never intercepts form interaction.

## Engineering choices

Planning calculations are pure functions with financial invariant tests. Saved and shared workshops use a versioned schema. Imports reject malformed values, unsupported versions and oversized files. CSV exports escape spreadsheet formulas in text cells.

The employer-budget inverse searches for the largest integer gross whose employer cost fits. The negotiation tool reuses the net-to-gross solver. Team calculations apply contribution ceilings to each individual before multiplying by headcount.

The React workshop and widget are loaded separately from the calculator. The optional Node server uses the same bundled calculation engine. It recomputes scenario data, validates the request, keeps credentials server-side and controls upstream request volume. No database is needed for the tools or the assistant; an optional Postgres only stores the anonymous usage counters behind the dashboard (see [METRICS.md](METRICS.md)).

AI has a narrow role: explain a selected, deterministic snapshot. It does not choose tax rules or calculate salaries. Requests are explicit, the interface explains what is transmitted, and later edits mark previous explanations as stale. The interface shows an honest unavailable state without credentials.

## Validation and limits

The implementation includes engine/planning/schema tests, local HTTP contract tests with a stubbed provider, browser flow validation and automated accessibility checks. Captures cover desktop, mobile and both themes.

These are implementation checks, not user research or legal certification. There have been no recruitment interviews, observed usability sessions, independently reviewed payroll calculations or live-provider verification without a configured key. Those are useful next validation steps before making stronger portfolio or product claims.

The scope is fixed salary in the private non-agricultural sector with a single October 2026 scale. The projection is explicitly a constant-scale scenario rather than a historical payroll product. A genuine salary observatory, document OCR and full payroll administration are separate projects requiring data, legal research and additional validation.
