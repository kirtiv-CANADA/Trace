# The Principle

> Every dollar has a story. Trace reads it, and tells the truth with evidence.

## What it means for each feature

### Subscription Detection
Every detected subscription must cite the specific charge rows
that justify it. Not "you probably pay for Adobe" — but
"Adobe, $22.99, on the 3rd of each month, 7 charges since March."

### Invoice Matching
Every verdict must show the evidence:
- VERIFIED → the matching transaction row
- CONTRADICTED → the closest rows that don't match, and why
- NOT FOUND → the full window searched, and what was in it
- DUPLICATE → both rows, and the overlap
- PARTIAL / AMBIGUOUS → the candidate rows, and why the match is unclear

### Dispute Builder
A dispute package is only as strong as the timeline behind it.
Every entry in the timeline must be traceable to a source:
an invoice, a transaction row, an email, a timestamp.

## Why this matters

This project exists because I lost $300 to an AI tool that
charged me after I cancelled. I had no clean way to prove it.
The bank asked for evidence I didn't have.

Trace is built so that never happens to someone else.

## The rule for the codebase

**AI proposes. Code verifies.**

The language model is allowed to read a claim and suggest fields.
It is never allowed to be the final word on whether money moved.
That decision belongs to arithmetic against a bank statement.