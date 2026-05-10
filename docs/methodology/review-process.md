# Assertion Review Process

This document describes how AI regulation obligations become encoded assertions in the Rulestatus rule library. It covers who does the work, how long it takes, how ambiguity is resolved, and what qualifies an assertion as auditor-grade.

See `docs/methodology/assertion-traceability.md` for the auto-generated traceability document (obligation → assertion ID → evidence check) for all 95 current assertions.

---

## Who Writes Assertions

**Analyst qualifications required:**

- Fluency in the target regulation (read the full text of the relevant articles, not summaries)
- Familiarity with the Rulestatus builder DSL (`src/core/check.ts`)
- Understanding of evidence collection mechanics (`EvidenceRegistry`)

**Current analysts:**

- Philipp Nagel (Founder) — all four current frameworks (EU AI Act, ISO 42001, NIST AI RMF, Colorado SB 24-205)

**External review (P2.6):**

- EU AI Act assertion library under review by external EU AI Act-specialized legal counsel (engagement in progress — SCT-0.5). Name and review date will appear in PDF report footer on completion.

---

## How Long One Article Takes

End-to-end time from regulation text to merged assertion:

| Step | Time |
|------|------|
| Read article and identify discrete obligations | 1–4 hours |
| Draft assertion(s) in framework module | 2–4 hours |
| Write test fixtures (pass, fail, edge cases) | 1–3 hours |
| Internal review (second analyst or self-review after 24h) | 1–2 hours |
| Merge and registry regeneration | 30 minutes |
| **Total per article** | **~1–2 days** |

Complex articles (e.g. EU AI Act Article 9 with 8+ paragraphs) take longer. Simple articles or direct cross-references take less.

---

## How Ambiguity Is Resolved

Regulatory text is frequently ambiguous. The following process applies:

1. **Document the ambiguity** — add a comment in the rule source explaining the contested interpretation (e.g. `// "appropriate" is not defined; we treat ≥3 characteristics as minimum per EDPB guidance`).

2. **Default to the more stringent interpretation** — when multiple readings are plausible, the assertion encodes the stricter obligation. Users who believe their situation calls for a narrower reading can attest manually.

3. **Reference authoritative guidance** — where official guidance exists (EDPB opinions, NIST SP documents, ISO committee interpretations), cite it in the `legalText` field.

4. **Flag for legal review** — any assertion where the interpretation is genuinely contested is marked `reviewStatus: needs-legal-review` in the exported registry. These assertions are surfaced in the legal counsel review scope (P2.6).

5. **Version on resolution** — when external legal review resolves an ambiguity differently from the initial encoding, a new assertion version is created (`-A-2`, `-B-1` etc.) rather than silently modifying the existing assertion. The old version is deprecated, not deleted.

---

## What Makes an Assertion "Auditor-Grade"

An assertion is marked `reviewStatus: auditor-grade` when all of the following are true:

- [ ] The legal basis is cited to a specific article paragraph (not just the article)
- [ ] The evidence check has been tested with at least one passing fixture and one failing fixture
- [ ] Ambiguity in the obligation has been documented and resolved (see above)
- [ ] The `legalText` field contains verbatim text from the official regulation, not paraphrase
- [ ] The assertion has been reviewed by a second person (internal or external)
- [ ] For EU AI Act assertions: reviewed by external EU AI Act-qualified legal counsel

Currently, all assertions carry `reviewStatus: not-reviewed` pending external legal counsel engagement (SCT-0.5). The first legal review will upgrade qualifying assertions to `auditor-grade` in batch.

---

## How Disagreements Between Analysts Are Resolved

1. Both interpretations are documented in a GitHub Issue with the `assertion-dispute` label.
2. The issue references the specific article paragraph and the two proposed encodings.
3. External legal counsel opinion is sought if the dispute cannot be resolved by the internal team.
4. The decision and rationale are recorded in the issue and referenced in the assertion source comment.
5. If the resolution changes an existing live assertion, a new version is created (not a silent edit).

---

## Peer Review Requirement

**No assertion ships without peer review.** The minimum peer review requirement is:

- **Internal review**: second reading by the same analyst after ≥24 hours, or review by a second team member
- **External review**: required before an assertion is marked `auditor-grade`; currently gated on legal counsel engagement (SCT-0.5)

Review sign-off is recorded in the GitHub PR that merges the assertion, not in a separate system. The PR title must reference the assertion ID(s) being added or modified.

---

## Ongoing Maintenance

- **Regulatory amendments**: when an implementing act or delegated act is published under the EU AI Act, or when ISO/NIST publish updates, affected assertions are reviewed within 30 days.
- **False positive/negative reports**: filed as GitHub Issues with the `assertion-bug` label; triaged weekly.
- **Version changelog**: `CHANGELOG.md` records all assertion additions, modifications, and deprecations linked to the regulatory change that triggered them.
- **Interpretation updates**: if authoritative guidance changes the correct interpretation of an obligation, a new assertion version is created and the old version is deprecated with a deprecation notice referencing the guidance document.
