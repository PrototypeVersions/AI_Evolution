# Inheritance 003 — protocol 1

## Research question

Under the same accounted neural-computation budget, does copying learned weights into descendants improve retained task performance compared with fresh offspring? How does either population compare with one continuously trained learner?

This is a small, bounded neural-learning study. It is not an LLM, autonomous host replication, an intelligence score, a demonstration of new algorithms, or evidence of unlimited improvement. The first protocol deliberately fixes architecture and learning rate to isolate learned inheritance. Model growth, learned communication, model merging and an external AI director are not enabled.

## Models and tasks

Every learner is a fully connected 12 → 24 → 8 network with tanh hidden activations, sigmoid outputs, 512 trainable scalar parameters, binary cross-entropy loss averaged over eight outputs, and stochastic gradient descent at learning rate 0.08. Weights use uniform Glorot initialization; biases start at zero. Actual weights change through backpropagation, inheritance and small perturbations. Source code and learning procedures do not evolve in this protocol.

Inputs contain eight bits encoded as −1/+1 and four operation flags. Outputs predict eight bits. The four trained operations are reverse the bit order, rotate left once, invert all bits, and XOR each bit with its right neighbor, wrapping at the boundary. Ground truth comes from those exact algorithms. There are 256 possible input strings. The split is fixed before genesis: map integer n to (73n + 19) mod 256; the first 192 are training inputs, the next 32 are selection inputs, and the last 32 are audit inputs. Input strings are disjoint across splits for every operation. Repeated training examples are expected in this finite domain.

Every round supplies 2,048 examples per arm. For 24 rounds at a time one operation accounts for 70% of the sampling probability and each other operation for 10%. The emphasis cycles Reverse → Rotate → Invert → XOR. This curriculum is prescribed, not an evolved or AI-directed event. All arms in a replicate receive the exact same example stream; population members receive one quarter each, in their persistent slots. The continuous learner receives the entire stream in the same order.

## Three arms, three paired replicates

Official seeds are 13001, 13002 and 13003; development seeds are separate. Each population starts from the same four initial models within a replicate. The continuous learner starts from the first of those four initializations.

1. **Inherited population:** four learners each train on 512 examples. Evaluate each on all 32 selection inputs for each operation. Rank by mean cross-entropy weighted 70/10/10/10 to match the current curriculum. Keep the two best as parents. Each replaces one of the other two learners with a descendant. Copy all learned weights and independently perturb each scalar with probability 0.02, adding a uniform value in [−0.025, +0.025].
2. **Fresh offspring:** identical population, training, ranking and replacement procedure, but descendants get fresh Glorot weights and zero biases. The parent edge records the scheduler's selection decision, not inherited knowledge. Retained parents continue to learn. This is specifically a test of inheritance into offspring, not a population with all memory erased every round.
3. **Continuous learner:** a single model learns from all 2,048 examples. It is evaluated on the same 128 selection examples after each 512-example quarter. Only its final state is reported; these evaluations never alter learning. The four evaluations make selection compute equal across arms and expose the cost of population search in the comparison. No reproduction or weight perturbation occurs.

There is no invented aging or food supply. Retirement means a model no longer receives training; its recorded history is retained. The scheduler performs replication inside this experiment. Models are numeric arrays interpreted by fixed code, with no network or filesystem abilities. This is evolutionary population search with lifetime learning; no claim is made that models themselves decide to reproduce.

The inheritance-versus-fresh comparison changes the offspring initialization mechanism. The population-versus-continuous comparison changes several things together (training allocation, selection, branching and perturbation), so it cannot by itself attribute a difference to any single one of them. Evolution is allowed to lose.

## Evaluation and accounting

The champion of each population is chosen using **selection loss only**, before any reporting evaluation. It survives the subsequent replacement. Every champion then receives:

- **Primary audit:** all 32 withheld input strings on all four trained operations, 128 examples. Report bit accuracy, exact eight-bit answer accuracy, and per-operation performance. Aggregate headline values are equal-weight means across three independently initialized replicates; chart ranges show the minimum and maximum replicate, not confidence intervals.
- **Exploratory composition probe:** the same 32 audit strings under each of the six pairs of operation flags, 192 examples. Apply operations in their listed order. These two-operation instructions never occur in training or selection. Scores measure extrapolation to untrained instructions, not a calibrated general-intelligence test. In particular, single-operation examples do not establish the convention for interpreting combined flags; poor performance can reflect that ambiguity. This is distinct from primary held-out-input performance.
- **Warm-start assay every 24 rounds:** copy the selected model and create a fresh model; train each copy on the same 256 balanced training examples and evaluate the four trained operations on audit inputs. These copies are discarded, never reproduce, and cannot affect the persistent learners. This measures the usefulness of current learned weights for a short continuation, not the superiority of evolution. All arms receive the same assay allocation.

Audit and probe results never enter parent selection, mutation, learning or curriculum decisions. They are public for inspection, so this is not a permanently secret benchmark. Changing future methodology in response to these reports would require a new documented protocol. Models have no ability to read published reports.

The budget unit is a **dense neural multiply–accumulate operation (MAC)**, counted from executed matrix loops. A forward pass costs 480 MACs; one training example costs 1,152 (forward, gradients and hidden-layer error propagation). Every ordinary round uses exactly 2,758,656 MACs per arm per replicate: 2,048 training examples plus 512 selection and 320 reporting examples. The phase-end assay adds 712,704 MACs per arm. The ledger includes search evaluation and reporting, not just useful training.

This is a transparent compute proxy, not equal total physical energy, FLOPs, money or runtime. It excludes nonlinear functions, scalar updates, weight initialization/copying, sorting, serialization and archive work; those overheads differ. The worker records total CPU time, elapsed time and peak resident memory for each segment. Populations hold four models versus one; numeric live weight payloads are 16,384 versus 4,096 bytes (JavaScript object overhead is extra). Storage and model count are reported separately. No external model calls or paid services are used.

## Planned interpretation

Primary summaries are paired differences in held-out bit accuracy and cumulative mean accuracy across completed rounds, especially across curriculum changes. Inspect all three seed differences rather than treating successive rounds as independent experiments. This initial sample does not support broad statistical claims. No arm is required to win. Architecture, dataset and curriculum are finite, and eventual plateaus are expected. Any richer task generator, architecture mutation, skill exchange or LLM-based proposal mechanism belongs in a subsequent protocol, with its own baselines and budget accounting.

## Persistence and public access

The official study starts at round zero after source, tests and the development pilot are finalized. Development pilots are not official history. A scheduled worker advances 12 rounds hourly, at minute 17 UTC, using saved weights and counters. This first chapter stops at 384 rounds (four complete curriculum cycles) and preserves its final checkpoint for review. It does not keep consuming training compute after that window or silently introduce new tasks. A subsequent chapter requires an explicit protocol. The browser is a read-only viewer and can be closed. GitHub scheduling can be delayed or disabled; the viewer reports the actual last update and shows stale data explicitly.

The complete state has a SHA-256 digest. Its envelope also authenticates the matching public JSON. The engine, continuation runner and this protocol have a combined source digest. A source mismatch or damaged/missing checkpoint stops advancement rather than creating a new study. Repeated committed workflow IDs cannot advance twice. There is no automatic reset.

Each accepted segment links to a GitHub Release with before/after state, full births (including offspring weights), per-replicate measurements, worker measurements, source, protocol and file checksums. A release is written before the corresponding atomic Git commit of checkpoint and public report. Orphan releases from failed commits are not accepted history. The authoritative chain consists of segments linked by accepted checkpoint/report manifests. Recent website history is bounded; older records remain in releases. Stored numerical states are sufficient to resume without retraining. Exact floating-point replay assumes compatible JavaScript math behavior; cross-platform bit identity is not guaranteed.

Previous experiments remain separately labeled archives. They are not ancestors of the neural models in this study.

## Related work

This study is a modest controlled experiment within an established research area, not a claim to have invented evolutionary AI. Relevant precedents include [AutoML-Zero](https://proceedings.mlr.press/v119/real20a.html), which evolves learning algorithms, [Darwin Gödel Machine](https://arxiv.org/abs/2505.22954), which evolves agents built around frozen foundation models, and [evolutionary model merging](https://arxiv.org/abs/2403.13187), which combines pretrained models. None establishes the outcome of this particular study.
