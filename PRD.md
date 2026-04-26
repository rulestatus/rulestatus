# PRD: Rulestatus — AI Compliance Testing Pipeline

**Product Requirement Document**
Version 1.0 | April 2026

---

## 1. Vision

**One sentence:** A CI/CD-native testing platform that encodes AI regulations (EU AI Act, Colorado AI Act, ISO 42001, etc.) as executable test suites, so any team shipping AI can run `Rulestatus run` and get a pass/fail compliance report before they deploy.

**Analogy:** ESLint for AI law. Snyk for regulatory risk.

---

## 2. The Problem

Every company deploying AI into regulated markets faces the same nightmare:

1. **The law is prose.** Hundreds of pages of legal text with no machine-readable structure.
2. **Compliance is manual.** Lawyers read the law, write checklists, engineers fill spreadsheets. Months of back-and-forth.
3. **No feedback loop.** You only find out you are non-compliant when an auditor tells you or a regulator fines you.
4. **Regulations multiply.** EU AI Act, GDPR (AI implications), Colorado SB 21-169, Canada AIDA, NYC Local Law 144, ISO 42001, NIST AI RMF, sector-specific rules. Each one is a new manual process.

**Result:** Compliance is slow, expensive, error-prone, and does not scale.

---

## 3. The Core Idea

Turn regulations into **testable assertions** that run against an AI system's artifacts (code, model cards, documentation, configs, APIs) the same way a linter checks code style or a security scanner checks vulnerabilities.

---

## 4. The Complete Pipeline: Law to Testable CI Rule

This is the heart of the product. The pipeline has **6 stages**, each transforming regulatory text one step closer to an executable test.

```
 +-------------+    +-------------+    +--------------+
 |  STAGE 1    |    |  STAGE 2    |    |  STAGE 3     |
 |  Raw Law    |--->|  Obligation |--->|  Testable    |
 |  Ingestion  |    |  Extraction |    |  Assertion   |
 +-------------+    +-------------+    |  Design      |
                                       +------+-------+
                                              |
 +-------------+    +-------------+    +------v-------+
 |  STAGE 6    |    |  STAGE 5    |    |  STAGE 4     |
 |  CI/CD      |<---|  Evidence   |<---|  Test        |
 |  Integration|    |  Collection |    |  Encoding    |
 +-------------+    +-------------+    +--------------+
```

---

### Stage 1: Raw Law Ingestion

**Goal:** Get the regulation into a structured, parseable format.

**Input:** Official legal text (PDF, HTML, XML from government sources).

**Process:**

| Step | Detail |
|---|---|
| 1a. Source identification | Map official publication sources per jurisdiction (EUR-Lex for EU, Federal Register for US, etc.) |
| 1b. Document parsing | Extract full text preserving hierarchy: parts, chapters, sections, articles, paragraphs, subparagraphs |
| 1c. Structural annotation | Tag each node with metadata: article_id, paragraph_id, amendment_date, enforcement_date, jurisdiction |
| 1d. Cross-reference resolution | Resolve internal references ("as referred to in Article 6(2)") to explicit links |
| 1e. Version control | Store as versioned document. Every amendment creates a new version with diff |

**Output:** A structured regulation object (JSON/YAML):

```yaml
regulation:
  id: eu-ai-act-2024-1689
  title: "Regulation (EU) 2024/1689 - Artificial Intelligence Act"
  jurisdiction: EU
  enforcement_date: 2025-08-01
  source_url: https://eur-lex.europa.eu/eli/reg/2024/1689/oj
  structure:
    - chapter: III
      title: "High-Risk AI Systems"
      articles:
        - id: art-9
          title: "Risk Management System"
          paragraphs:
            - id: art-9-1
              text: "A risk management system shall be established, implemented, documented and maintained..."
              cross_refs: [art-6, annex-iii]
            - id: art-9-2
              text: "The risk management system shall be understood as a continuous iterative process..."
              subparagraphs:
                - id: art-9-2-a
                  text: "identification and analysis of the known and the reasonably foreseeable risks..."
                - id: art-9-2-b
                  text: "estimation and evaluation of the risks that may emerge..."
```

**Key decisions:**
- We do NOT attempt to parse all law generically. We curate specific AI-relevant regulations.
- Human legal analysts review every ingested regulation. This is not fully automated. Accuracy matters more than speed here.
- We still need to decide on an accepted standard for our extracted rulesets (e.g. LegalXML)

---

### Stage 2: Obligation Extraction

**Goal:** Extract discrete, actionable obligations from prose legal text.

**Input:** Structured regulation object from Stage 1.

**Process:**

| Step | Detail |
|---|---|
| 2a. Obligation identification | For each paragraph, identify: WHO must do WHAT, WHEN, under WHAT CONDITIONS |
| 2b. Obligation classification | Tag each obligation by type: documentation, technical, process, disclosure, human-oversight, data-governance, monitoring |
| 2c. Applicability scoping | Determine which obligations apply to which actor (provider, deployer, importer, distributor) and which risk level (high-risk, limited-risk, minimal-risk, prohibited) |
| 2d. Ambiguity flagging | Flag vague terms ("appropriate measures", "state of the art", "reasonable") for human review and interpretation guidance |
| 2e. Obligation graph | Build dependency graph: which obligations are prerequisites for others |

**Output:** An obligation registry:

```yaml
obligations:
  - id: OBL-EU-AI-ACT-009-001
    source: art-9-1
    actor: provider
    applies_when:
      risk_level: high-risk
    type: process
    action: "Establish, implement, document, and maintain a risk management system"
    keywords: [risk-management, documentation, lifecycle]
    ambiguity_notes:
      - term: "established, implemented, documented and maintained"
        guidance: "Requires evidence of all four activities, not just a document existing"
    depends_on: [OBL-EU-AI-ACT-006-001]
    enforcement_date: 2026-08-01

  - id: OBL-EU-AI-ACT-009-002-A
    source: art-9-2-a
    actor: provider
    applies_when:
      risk_level: high-risk
    type: technical
    action: "Identify and analyse known and reasonably foreseeable risks to health, safety, or fundamental rights"
    keywords: [risk-identification, risk-analysis, fundamental-rights]
    testable: true
    test_strategy: "Check for existence and completeness of risk register covering health, safety, and rights dimensions"
```

**Key decisions:**
- This stage uses **LLM-assisted extraction + mandatory human legal review**. The LLM proposes obligations; a legal analyst validates, corrects, and signs off.
- Every obligation gets a `testable` boolean. Some obligations are inherently untestable via automation (e.g., "act in good faith"). These are flagged as `manual_review_required`.

---

### Stage 3: Testable Assertion Design

**Goal:** For each testable obligation, design one or more concrete assertions that can be evaluated against evidence.

**Input:** Obligation registry from Stage 2.

**Process:**

| Step | Detail |
|---|---|
| 3a. Evidence mapping | For each obligation, define WHAT EVIDENCE would prove compliance (document, config, API response, metric, log) |
| 3b. Assertion authoring | Write assertions in structured format: GIVEN [context] WHEN [condition] THEN [expected evidence] |
| 3c. Severity assignment | Classify each assertion: critical (blocking), major (must-fix), minor (advisory), info (best practice) |
| 3d. Interpretation variants | Where the law is ambiguous, offer strict and pragmatic interpretation modes |
| 3e. Peer review | Second legal analyst reviews assertion-to-obligation traceability |

**Output:** Assertion specifications:

```yaml
assertions:
  - id: ASSERT-EU-AI-ACT-009-001-01
    obligation: OBL-EU-AI-ACT-009-001
    title: "Risk management system documentation exists"
    description: "Provider must have a documented risk management system for the high-risk AI system"
    severity: critical
    category: documentation
    evidence_type: document
    assertion:
      given: "AI system is classified as high-risk"
      when: "Compliance check is executed"
      then: "A risk management document exists, is dated, and covers the system identified use cases"
    evidence_spec:
      accepts:
        - type: file
          formats: [pdf, docx, md]
          path_hint: "docs/risk-management/"
          required_fields:
            - system_name
            - identified_risks
            - mitigation_measures
            - review_date
        - type: structured
          schema: risk_management_v1.json

  - id: ASSERT-EU-AI-ACT-009-002-A-01
    obligation: OBL-EU-AI-ACT-009-002-A
    title: "Risk register includes health, safety, and fundamental rights dimensions"
    severity: critical
    category: technical
    evidence_type: structured_data
    assertion:
      given: "A risk register exists"
      when: "Register entries are evaluated"
      then: "At least one risk is documented for each dimension: health, safety, fundamental_rights"
    evidence_spec:
      accepts:
        - type: structured
          schema: risk_register_v1.json
          validation_rules:
            - field: "risks[].dimension"
              must_include_all: [health, safety, fundamental_rights]
            - field: "risks[].severity"
              must_be_one_of: [low, medium, high, critical]
            - field: "risks[].mitigation"
              must_not_be: null

  - id: ASSERT-EU-AI-ACT-013-001-01
    obligation: OBL-EU-AI-ACT-013-001
    title: "AI system discloses AI-generated content to users"
    severity: critical
    category: transparency
    evidence_type: runtime_check
    assertion:
      given: "AI system produces output to end users"
      when: "Output is rendered in UI"
      then: "A visible disclosure indicates the content is AI-generated"
    evidence_spec:
      accepts:
        - type: api_probe
          endpoint: "{system_url}/api/health"
          check: "response.headers X-AI-Disclosure exists OR response.body contains ai_disclosure field"
        - type: screenshot
          check: "manual_review"
        - type: config
          path: "config/transparency.yaml"
          check: "ai_disclosure.enabled == true"
```

**Key decisions:**
- Assertions are **not code yet**. They are structured specifications. This separation matters because legal analysts can read and validate them without touching code.
- Each assertion traces back to exactly one obligation, which traces back to exactly one article/paragraph. **Full provenance chain is non-negotiable.**

---

### Stage 4: Test Encoding

**Goal:** Compile assertion specifications into executable test code.

**Input:** Assertion specs from Stage 3 + test SDK/framework.

**Process:**

| Step | Detail |
|---|---|
| 4a. Evidence collector authoring | For each evidence_type, write a collector plugin that knows how to gather evidence (scan filesystem, call API, query config, parse model card) |
| 4b. Test function generation | Generate test functions from assertion specs, either hand-written or template-generated |
| 4c. Schema validation | Validate collected evidence against the evidence_spec schema |
| 4d. Result normalization | Standardize all test results into a uniform result object |
| 4e. Test tagging | Tag each test with metadata for filtering: framework, article, severity, category, actor_type, risk_level |

**Output:** Executable test modules:

```python
# tests/eu_ai_act/article_9/test_risk_management.py

from Rulestatus import rule, evidence, severity

@rule(
    id="ASSERT-EU-AI-ACT-009-001-01",
    framework="eu-ai-act",
    article="9.1",
    severity=severity.CRITICAL,
    applies_to={"actor": "provider", "risk_level": "high-risk"},
    title="Risk management system documentation exists",
)
def test_risk_management_doc_exists(system):
    doc = system.evidence.find_document(
        category="risk-management",
        paths=["docs/risk-management/", "compliance/"],
        formats=["pdf", "docx", "md"],
    )
    assert doc is not None, (
        "No risk management document found. "
        "Expected in docs/risk-management/ or compliance/"
    )
    assert doc.has_field("system_name"), "Document missing: system name"
    assert doc.has_field("identified_risks"), "Document missing: identified risks"
    assert doc.has_field("mitigation_measures"), "Document missing: mitigation measures"
    assert doc.has_field("review_date"), "Document missing: review/update date"
    assert doc.field("review_date").within_months(12), (
        "Risk management document not reviewed in last 12 months"
    )


@rule(
    id="ASSERT-EU-AI-ACT-009-002-A-01",
    framework="eu-ai-act",
    article="9.2.a",
    severity=severity.CRITICAL,
    applies_to={"actor": "provider", "risk_level": "high-risk"},
    title="Risk register covers health, safety, and fundamental rights",
)
def test_risk_register_dimensions(system):
    register = system.evidence.load_structured("risk_register")
    assert register is not None, "No risk register found"

    dimensions_covered = {r["dimension"] for r in register["risks"]}
    required = {"health", "safety", "fundamental_rights"}
    missing = required - dimensions_covered

    assert not missing, (
        f"Risk register missing dimensions: {missing}. "
        f"Art. 9(2)(a) requires all three."
    )

    for risk in register["risks"]:
        assert risk.get("severity") in ("low", "medium", "high", "critical"), (
            f"Risk '{risk['id']}' has invalid severity: {risk.get('severity')}"
        )
        assert risk.get("mitigation") is not None, (
            f"Risk '{risk['id']}' has no mitigation measure documented"
        )


@rule(
    id="ASSERT-EU-AI-ACT-013-001-01",
    framework="eu-ai-act",
    article="13.1",
    severity=severity.CRITICAL,
    applies_to={"actor": "provider", "risk_level": "high-risk"},
    title="AI system provides transparency disclosure",
)
def test_ai_disclosure(system):
    config = system.evidence.load_config("transparency")
    if config:
        assert config.get("ai_disclosure", {}).get("enabled") is True, (
            "AI disclosure is disabled in transparency config"
        )
        return

    if system.has_api():
        response = system.api.probe("/api/health")
        has_header = "X-AI-Disclosure" in response.headers
        has_body = response.json().get("ai_disclosure") is not None
        assert has_header or has_body, (
            "API endpoint missing AI disclosure header or body field"
        )
        return

    system.evidence.require_manual(
        "Provide screenshot or documentation proving AI disclosure to users"
    )
```

**The SDK structure:**

```
Rulestatus/
  core/
    engine.py          # Test runner, parallel execution, result aggregation
    decorators.py      # @rule decorator with metadata
    severity.py        # CRITICAL, MAJOR, MINOR, INFO
  evidence/
    collectors/
      filesystem.py    # Scan project dirs for docs, configs
      api_probe.py     # Hit endpoints, check headers/responses
      model_card.py    # Parse HuggingFace / custom model cards
      config.py        # Read YAML/JSON/TOML config files
      git.py           # Check commit history, review processes
      manual.py        # Prompt for human-provided evidence
    schemas/           # JSON schemas for structured evidence
      risk_register_v1.json
      model_card_v1.json
      data_governance_v1.json
      bias_assessment_v1.json
  frameworks/
    eu_ai_act/         # All EU AI Act test modules
    colorado_ai/       # Colorado SB 21-169
    iso_42001/         # ISO/IEC 42001
    nist_ai_rmf/       # NIST AI Risk Management Framework
    nyc_ll144/         # NYC Local Law 144 (hiring AI)
  reporters/
    console.py         # Terminal output with pass/fail/warn
    json.py            # Machine-readable results
    pdf.py             # Audit-ready PDF report
    sarif.py           # SARIF format for IDE/GitHub integration
    badge.py           # Compliance badge SVG generator
  plugins/
    ci/
      github_action/
      gitlab_ci/
      jenkins/
    ide/
      vscode/
```

Note: Our code should be able to generate SDKs in various programming languages

---

### Stage 5: Evidence Collection

**Goal:** At runtime, gather all required evidence from the target AI system.

**Input:** The AI system's project directory, APIs, configs, documentation.

**Process:**

| Step | Detail |
|---|---|
| 5a. System profiling | Scan project structure, detect frameworks (PyTorch, TensorFlow, HuggingFace, etc.), identify config files |
| 5b. Evidence gathering | Run all relevant collectors based on test requirements |
| 5c. Evidence caching | Cache collected evidence for the session to avoid redundant reads |
| 5d. Gap identification | List evidence that was requested but not found. These become SKIP or FAIL depending on severity |

**Configuration (.Rulestatus.yaml in project root):**

```yaml
# .Rulestatus.yaml - project-level configuration

system:
  name: "Acme Fraud Detection Model v2.1"
  actor: provider
  risk_level: high-risk
  domain: financial-services
  intended_use: "Automated fraud detection for credit card transactions"

frameworks:
  - eu-ai-act
  - iso-42001

evidence:
  docs_path: ./docs/compliance/
  model_card: ./model/model_card.yaml
  risk_register: ./docs/risk_register.json
  api_base_url: http://localhost:8080
  config_path: ./config/

reporting:
  format: [console, pdf, sarif]
  output_dir: ./compliance-reports/
  badge: true

severity_gate:
  fail_on: critical
  warn_on: major
```

---

### Stage 6: CI/CD Integration

**Goal:** Run compliance tests as part of the deployment pipeline. Block deploys that fail critical checks.

**Developer experience:**

```bash
# Install
pip install rulestatus

# Initialize project config
rulestatus init --actor provider --risk-level high-risk --frameworks eu-ai-act

# Run all applicable tests
rulestatus run

# Run specific framework
rulestatus run --framework eu-ai-act

# Run specific article
rulestatus run --framework eu-ai-act --article 9

# Run only critical tests
rulestatus run --severity critical

# Generate audit report
rulestatus report --format pdf --output compliance-report.pdf

# Check for regulation updates
rulestatus update
```

**Terminal output:**

```
$ Rulestatus run --framework eu-ai-act

  Rulestatus v1.0 - EU AI Act (2024/1689)
  System: Acme Fraud Detection Model v2.1
  Actor: provider | Risk level: high-risk
  ----------------------------------------

  Art. 9 - Risk Management
    PASS  ASSERT-009-001-01  Risk management doc exists
    PASS  ASSERT-009-002-A-01  Risk register dimensions
    FAIL  ASSERT-009-002-B-01  Emerging risk estimation
      -> No emerging risk analysis found. Expected in risk register
         under "emerging_risks" field.
    WARN  ASSERT-009-004-01  Testing with representative data
      -> Dataset representativeness documentation incomplete.

  Art. 10 - Data Governance
    PASS  ASSERT-010-002-01  Training data documentation
    FAIL  ASSERT-010-002-02  Bias examination documented
      -> No bias examination report found for training data.
    PASS  ASSERT-010-003-01  Data relevance justified

  Art. 11 - Technical Documentation
    PASS  ASSERT-011-001-01  Technical documentation exists
    WARN  ASSERT-011-001-02  Annex IV completeness
      -> Missing 3 of 15 required sections in technical docs.

  Art. 13 - Transparency
    PASS  ASSERT-013-001-01  AI disclosure enabled

  Art. 14 - Human Oversight
    FAIL  ASSERT-014-001-01  Human override mechanism
      -> No human-in-the-loop endpoint or config found.

  ----------------------------------------
  Results: 8 passed | 3 failed | 2 warnings | 0 skipped
  Critical failures: 3 - pipeline BLOCKED

  Full report: ./compliance-reports/eu-ai-act-2026-04-26.pdf
  Fix guide:   Rulestatus explain ASSERT-009-002-B-01
```

- Should we allow exporting the report as JUnit XML?

**GitHub Actions integration:**

```yaml
# .github/workflows/compliance.yml
name: AI Compliance Check

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Rulestatus
        uses: Rulestatus/action@v1
        with:
          frameworks: eu-ai-act
          severity-gate: critical
          report-format: sarif

      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: Rulestatus-results.sarif
```

---

## 5. The Explain Command: Remediation Engine

When a test fails, `rulestatus explain` provides actionable guidance:

```
$ Rulestatus explain ASSERT-009-002-B-01

  ASSERT-009-002-B-01
  Emerging risk estimation
  Severity: CRITICAL | Framework: EU AI Act

  LEGAL BASIS
  EU AI Act, Article 9(2)(b):
  "estimation and evaluation of the risks that may emerge when the
  high-risk AI system is used in accordance with its intended purpose
  and under conditions of reasonably foreseeable misuse"

  WHY YOU FAILED
  Your risk register (docs/risk_register.json) contains 12 risks,
  but none are tagged with source: "emerging" or category: "misuse".
  Article 9(2)(b) requires explicit analysis of risks that may emerge
  during use, including foreseeable misuse scenarios.

  HOW TO FIX
  Add entries to your risk register with:

    {
      "id": "RISK-013",
      "dimension": "safety",
      "source": "emerging",
      "category": "misuse",
      "description": "Model used on population outside training distribution",
      "severity": "high",
      "likelihood": "medium",
      "mitigation": "Input validation + distribution shift detection"
    }

  Consider these common emerging risk categories:
    - Distribution shift in production data
    - Adversarial inputs / prompt injection
    - Unintended use by downstream deployers
    - Feedback loops amplifying bias over time
    - Interaction effects with other systems

  RESOURCES
  - EU AI Act Art. 9 full text: https://eur-lex.europa.eu/...
  - NIST AI RMF Govern 1.1 (related guidance)
  - Template: Rulestatus generate risk-entry --type emerging
```

---

## 6. Provenance Chain: The Non-Negotiable

Every test result must be fully traceable:

```
Art. 9(2)(a)                       <- Source law (paragraph-level)
    |
    v
OBL-EU-AI-ACT-009-002-A           <- Extracted obligation
    |
    v
ASSERT-EU-AI-ACT-009-002-A-01     <- Testable assertion
    |
    v
test_risk_register_dimensions()    <- Executable test
    |
    v
RESULT: PASS/FAIL + evidence       <- Auditable result with timestamp
```

**Why this matters:** When an auditor asks "how do you know you comply with Article 9?", you hand them a report that traces from the test result, through the assertion, to the exact paragraph of law. No interpretation gaps.

---

## 7. Rule Update Pipeline

When regulations change, new guidance is published, or courts issue relevant decisions:

```
 Regulation amendment published
           |
           v
 Legal team reviews changes
           |
           v
 Obligation registry updated (new/modified/deprecated)
           |
           v
 Assertions updated or created
           |
           v
 Tests re-encoded
           |
           v
 Rulestatus update  ->  "3 new tests, 1 modified, 1 deprecated"
           |
           v
 Users re-run  ->  See new pass/fail against updated rules
```

**Versioning:** Regulations are versioned. Users can pin to a specific version or run against the latest. Historical results are preserved. You can always prove you were compliant at the time of deployment.

---

## 8. Architecture

```
+----------------------------------------------------------------+
|                        USER LAYER                              |
|                                                                |
|   CLI          GitHub Action       VS Code        Dashboard    |
|   Rulestatus     Rulestatus/action     Extension      (SaaS)       |
+------+--------------+----------------+--------------+----------+
       |              |                |              |
       v              v                v              v
+----------------------------------------------------------------+
|                      CORE ENGINE                               |
|                                                                |
|  +----------+  +-----------+  +------------+  +------------+  |
|  | Test     |  | Evidence  |  | Result     |  | Report     |  |
|  | Runner   |  | Collector |  | Aggregator |  | Generator  |  |
|  +----------+  +-----------+  +------------+  +------------+  |
+----------------------------+-----------------------------------+
                             |
+----------------------------v-----------------------------------+
|                     RULE LIBRARY                               |
|                     (THE MOAT)                                 |
|                                                                |
|  +--------------+  +--------------+  +----------------------+  |
|  | Obligations  |  | Assertions   |  | Evidence Schemas     |  |
|  | Registry     |  | Specs        |  | and Collectors       |  |
|  +--------------+  +--------------+  +----------------------+  |
|                                                                |
|  eu-ai-act/  colorado-ai/  iso-42001/  nist-ai-rmf/  ...      |
+----------------------------------------------------------------+
```

---

## 9. Revenue Model

| Tier | Price | Includes |
|---|---|---|
| **Open Source CLI** | Free | Core engine, 15 basic tests per framework, console output |
| **Pro** | $499/mo | Full test library, PDF reports, explain command, badge, 1 framework |
| **Team** | $1,499/mo | All frameworks, SARIF/CI integration, evidence vault, 10 seats |
| **Enterprise** | $5K-20K/mo | Custom rules, audit-ready reports, SSO, API, dedicated CSM |
| **Auditor Platform** | $3K/mo/seat | Multi-client management, benchmarks, white-label reports |

---

## 10. Phase 1 Scope (MVP - 12 weeks)

| Week | Deliverable |
|---|---|
| 1-2 | Core engine: test runner, @rule decorator, console reporter |
| 3-4 | Evidence collectors: filesystem, config, model card |
| 5-8 | EU AI Act rule library: Articles 6, 9, 10, 11, 13, 14, 15 (high-risk provider obligations) - approx 40 tests |
| 9-10 | CLI (init, run, explain, report), .rulestatus.yaml config |
| 11 | GitHub Action, PDF reporter |
| 12 | Docs site, landing page, open-source launch |

**MVP = open-source CLI with EU AI Act high-risk provider tests.**

---

## 11. Success Metrics

| Metric | 6-month target |
|---|---|
| GitHub stars | 2,000 |
| CLI installs (pip) | 5,000 |
| Paying teams | 50 |
| Frameworks covered | 3 (EU AI Act, ISO 42001, NIST AI RMF) |
| Tests in library | 200+ |
| Auditor partners | 3 |

---

## 12. What Makes This Uncloneable

1. **The rule library compounds.** Every regulation, every amendment, every guidance document, every court ruling adds tests. After 2 years, you have thousands of curated, legally-reviewed, battle-tested assertions. A new entrant starts from zero.

2. **Auditor lock-in.** Once auditors accept your report format as evidence of compliance, switching costs become enormous. You become the unit of measurement.

3. **Provenance chain.** Full traceability from test result to assertion to obligation to exact legal paragraph. This is what auditors and regulators actually need. It is tedious to build and impossible to fake.

4. **Community contributions.** Open-source core means the community adds evidence collectors, new framework support, edge case tests. Network effects compound the library faster than any team could alone.

5. **Benchmark data.** Anonymized, aggregated compliance scores across the industry. "Your system is in the 73rd percentile for EU AI Act readiness." This data only exists if you have distribution. First mover with distribution wins.
