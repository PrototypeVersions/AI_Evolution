# Adaptation 004 — completed pilot

**Decision: do not expand this selector into a long-running study.** The protocol's gate failed: learning-pair selection beat the individual-learning ablation in only one of eight worlds; the other seven were exact ties. Its average loss improved over current-performance selection, but that does not establish the proposed complementarity mechanism.

[Protocol](ADAPTATION_PILOT_PROTOCOL.md) · [Full records and source](../data/adaptation/pilot-records.tar.gz) · [Machine-readable summary](../data/adaptation/observatory.json)

## What was actually run

Eight paired worlds, five methods, sixteen population rounds, four models per method. Networks learn hidden geometric classification rules from labeled points. They have 129 parameters and are not LLMs. At each checkpoint, disposable copies learn new tasks and predict separate examples. The primary score averages losses after 16, 64 and 256 learning examples per member across six withheld tasks and four checkpoints. Lower loss is better. Task/checkpoint repetitions are not treated as independent worlds.

The [design record](https://github.com/PrototypeVersions/AI_Evolution/commit/738da7a86fd1ce89a1732441215df921d7878ad8) and [tested implementation](https://github.com/PrototypeVersions/AI_Evolution/commit/278c186827e81e47bf2ad8c4e89c925d01f5f61f) were committed before outcome runs. The only pre-run protocol wording correction made the training reduction exact (23.4375%). No settings, seeds, thresholds or stopping rules changed after outcomes. The run completed at 2026-10-13T03:38:20.663Z.

## Primary outcome

| Method | Future loss, nats ↓ | Future accuracy ↑ |
|---|---:|---:|
| Best learning pair | 1.1278 | 69.30% |
| Two fastest learners | 1.1353 | 69.11% |
| Best current pair | 1.2519 | 69.49% |
| Two best current models | 1.2519 | 69.49% |
| Keep all four | 1.2391 | 69.60% |

Accuracy is a secondary descriptive measure. These percentages average the three learning checkpoints; they are not final accuracy after 256 examples.

| Comparator | Learning-pair minus comparator loss ↓ | Descriptive paired 95% t interval | Learning-pair wins |
|---|---:|---:|---:|
| Two fastest learners | -0.0075 | [-0.0252, +0.0102] | 1/8 |
| Best current pair | -0.1241 | [-0.1560, -0.0921] | 8/8 |
| Two best current models | -0.1241 | [-0.1560, -0.0921] | 8/8 |
| Keep all four | -0.1113 | [-0.1396, -0.0830] | 8/8 |

Intervals use eight paired world differences (df=7), not hundreds of correlated evaluations. They are not multiplicity-adjusted confirmation tests. The practical gate required a loss improvement of at least 0.005 nats and six wins over both current-pair and response-individual, without materially trailing continual. The response-individual comparison failed the win-count requirement.

## What the result does and does not establish

1. The proposed pair selector and individual-learning ablation have identical prospective outcomes in seven worlds. Current-pair and current-individual also coincide in all eight. This setup rarely creates a consequential choice between individually good models and a complementary pair.
2. The proposed ensemble beats both of its members on only 0.52% of the 576 familiar-task/checkpoint/learning-stage evaluations. This descriptive member-removal check is performed after the same individual learning exposure. It does **not** reallocate the removed member's compute and is not evidence for two-parent synergy.
3. The lower primary loss is concentrated early in adaptation. After 256 examples/member, learning-pair accuracy is 82.21% versus 83.22% for keeping all four. Learning-pair loss is 0.3776, versus 0.3611. The early advantage does not persist at the final learning checkpoint.
4. Confidence matters: the primary average loss exceeds log(2) ≈ 0.6931, the loss of always predicting 50/50, despite accuracy near 69%. Networks are especially overconfident just after rule changes; they recover with more learning. This is a weakness in probability prediction, not a claim that their classification accuracy is below chance.
5. Probing methods spend 23.4375% less time training the current rule. Less specialization or overconfidence is one possible explanation for their lower early loss. The experiment does not isolate that explanation from the effect of selecting by future learning. Equal total compute is necessary but does not by itself identify the mechanism.
6. Both population members receive the same examples, replacement copies are lightly mutated, and the competence guard restricts selection. These choices may suppress useful diversity. This is an interpretation of a bounded null/mixed pilot, not proof that complementary learning responses are impossible.

## Next decision

Do not retune this pilot or run it for hundreds more rounds. Before another evolution experiment, a separately specified diagnostic should establish that useful differences in learning response exist and that a simple equal-training control cannot explain the early loss advantage. Any new design needs new outcome seeds and a new protocol. An LLM inheritance study remains a separate possible project; this pilot provides no basis for claiming improved LLM intelligence.

Study 003 remains intact. No new scheduler, paid API, or visitor-controlled training was added.

## Every world

| Seed | Learning pair | Individual learners | Current pair | Current individuals | Keep all four |
|---|---:|---:|---:|---:|---:|
| 24001 | 1.188005 | 1.188005 | 1.389418 | 1.389418 | 1.375012 |
| 24002 | 1.156136 | 1.216021 | 1.241330 | 1.241330 | 1.233785 |
| 24003 | 1.215720 | 1.215720 | 1.337103 | 1.337103 | 1.299235 |
| 24004 | 1.194859 | 1.194859 | 1.333410 | 1.333410 | 1.314292 |
| 24005 | 0.986328 | 0.986328 | 1.135079 | 1.135079 | 1.091138 |
| 24006 | 1.042883 | 1.042883 | 1.144067 | 1.144067 | 1.142355 |
| 24007 | 1.195395 | 1.195395 | 1.297048 | 1.297048 | 1.296592 |
| 24008 | 1.043113 | 1.043113 | 1.137562 | 1.137562 | 1.160402 |

## Reproducibility

All methods spent **21,954,560 accounted dense neural MACs per world**: 15,138,816 for the algorithm and 6,815,744 for disposable future evaluation. Scalar activations, biases, pair scoring, mutation, copying, RNG and I/O are excluded. Total runtime for this small pilot on the development machine was 2.047 seconds; peak RSS 141,904 KiB. Those hardware measurements are not per-method matching claims.

Thirty-seven repository tests passed before the outcome run, including numerical gradient checks, actual learning, pair scoring, immutable future evaluation, matched compute, deterministic method order and inherited-parent records.

Source SHA-256: `fa739141da39c6ce4e4d90a48953f9d240db791e91a1e42b71c4c94f5e7749e5`

Archive SHA-256: `bb70b393045d27502ac7967ea7c755be498d628e7456687ff36dba82d143923d`

The archive contains every per-task outcome, every selection candidate score, all births, the sealed populations/selected weights, source, protocol, and byte-level checksums. It includes instructions to reproduce the run with Node 24 and no package installation.

```sh
node --test tests/adaptation.test.mjs
node scripts/pilot-adaptation.mjs work/adaptation-reproduction
```

The runner refuses to overwrite a completed output directory. Timestamps and runtime will differ; deterministic population hashes provide the replication check.
