# HiddenFeeAI v2 — AI Quality Benchmark Report

**Generated**: July 27, 2026  
**Framework**: `worker/src/benchmarks/runBenchmark.ts`  
**Existing Fixtures**: 5 documents (auto-purchase, apartment-lease, medical-bill, subscription, utility-bill)

---

## 1. Current State

The benchmark framework exists with 5 labeled documents and expected results. A full production-quality benchmark of 100 documents has been architected but not yet populated.

### Existing Documents (5 of 100 target)

| Document | Type | Expected Findings | Complexity |
|----------|------|-------------------|------------|
| auto-purchase-agreement.txt | Automotive | 5 (4 fees + 1 clause) | Medium |
| apartment-lease.txt | Housing | 4 findings | Medium |
| medical-bill.txt | Healthcare | 5 findings | Medium |
| subscription-agreement.txt | Subscriptions | 4 findings | Medium |
| utility-bill.txt | Utilities | 4 findings | Simple |

### Quality Metrics Measured

The existing `runBenchmark.ts` (614 lines) measures:
- **Precision**: TP / (TP + FP) — how many detected fees are real
- **Recall**: TP / (TP + FN) — how many real fees were detected
- **F1 Score**: Harmonic mean of precision and recall
- **Evidence Accuracy**: % of findings with correct page references
- **Page Reference Accuracy**: % of page numbers matching ground truth
- **False Positive Rate**: FP / (FP + TN)
- **Confidence Calibration**: Whether confidence_score tracks actual correctness

### Quality Targets

| Metric | Minimum | Target | Enterprise |
|--------|---------|--------|------------|
| Precision | 80% | 90% | 95% |
| Recall | 75% | 85% | 90% |
| F1 Score | 77% | 87% | 92% |
| False Positive Rate | <15% | <8% | <5% |
| Page Reference Accuracy | 70% | 85% | 95% |
| Confidence Calibration | ±15% | ±10% | ±5% |

---

## 2. Production Dataset Architecture (100 Documents)

```
benchmarks/production/
├── documents/           # 100 document fixtures
│   ├── automotive/      # 25 documents
│   │   ├── purchase-*.pdf
│   │   ├── lease-*.pdf
│   │   └── financing-*.pdf
│   ├── housing/         # 15 documents
│   │   ├── rental-*.pdf
│   │   └── mortgage-*.pdf
│   ├── healthcare/      # 15 documents
│   │   ├── hospital-*.pdf
│   │   └── clinic-*.pdf
│   ├── banking/         # 10 documents
│   ├── utilities/       # 10 documents
│   ├── subscriptions/   # 10 documents
│   ├── insurance/       # 10 documents
│   └── contracts/       # 5 documents
├── expected/            # Ground truth labels
│   └── *.json           # One per document
├── results/             # Benchmark run output
└── reports/             # Generated quality reports
```

### Ground Truth Format

```json
{
  "document_type": "auto_purchase",
  "document_name": "purchase-agreement-dealer-1.pdf",
  "description": "Vehicle purchase agreement from Honda dealership with inflated doc fee",
  "expected_findings": [
    {
      "category": "Hidden Fee",
      "fee_name": "Documentation Fee",
      "amount": 895.00,
      "page": 1,
      "severity": "High",
      "evidence_quote": "Documentation Fee: $895.00"
    }
  ],
  "expected_total_hidden_fees": 895.00,
  "expected_risk_level": "Elevated"
}
```

---

## 3. Scoring Calculation

```typescript
// From runBenchmark.ts (existing implementation)
function calculateDetectionScore(
  detected: VerifiableFinding[],
  expected: ExpectedFinding[],
): DetectionScore {
  let truePositives = 0;
  let falsePositives = 0;
  const matched = new Set<number>();

  // Match detected findings to expected findings by category + fee_name
  for (const det of detected) {
    const matchIdx = expected.findIndex(
      (exp, i) => !matched.has(i) && matchCategories(det.category, exp.category) && fuzzyMatchName(det.title, exp.fee_name),
    );
    if (matchIdx >= 0) { truePositives++; matched.add(matchIdx); }
    else { falsePositives++; }
  }

  const falseNegatives = expected.length - matched.size;
  const precision = truePositives / Math.max(truePositives + falsePositives, 1);
  const recall = truePositives / Math.max(truePositives + falseNegatives, 1);
  const f1 = 2 * (precision * recall) / Math.max(precision + recall, 0.001);

  return { truePositives, falsePositives, falseNegatives, precision: +(precision * 100).toFixed(1), recall: +(recall * 100).toFixed(1), f1: +(f1 * 100).toFixed(1) };
}
```

---

## 4. Roadmap to Enterprise Quality (90+)

| Phase | Task | Effort | Quality Gain |
|-------|------|--------|-------------|
| 1 | Populate 25 automotive documents (most common use case) | 3 days | +5 points |
| 2 | Populate 15 healthcare + 15 housing documents | 3 days | +3 points |
| 3 | Populate remaining 45 documents | 5 days | +3 points |
| 4 | Run baseline benchmark, identify weak categories | 1 day | +2 points |
| 5 | Fine-tune prompts for categories with <80% F1 | 3 days | +4 points |
| 6 | Calibrate confidence scores against ground truth | 2 days | +2 points |
| **TOTAL** | | **17 days** | **+19 points → moves AI Quality from 55→74** |

---

*This report is generated from the existing benchmark framework. Quality scores will be populated once benchmarks are run against production documents.*