# Methods for the baseline inheritance experiment

## Purpose and inferential scope

This project studies an explicit artificial ecology. It does not measure LLM capabilities or reproduce hardware self-replication experiments. The initial question is whether an abrupt environmental change reduces the population benefit of faithful inherited memory. Results are conditional on the rules below. Novelty is not established; a literature review and broader robustness work are needed before publication claims.

## World and resource dynamics

The controlled protocol uses 81 locations in a bounded 9 by 9 grid, with orthogonal adjacency, 12 founders, and a 240-tick observation horizon. Habitat types and initial placement are seeded. Each habitat has one initially favored action from a set of three. A favored action succeeds with probability 0.86; either other action succeeds with probability 0.12.

Each location starts with 3 resource units and regenerates 0.72 units per tick, capped at 3. At most one living agent occupies a location. Processing order is deterministically randomized each tick; newborns first act on the next tick. Updates are sequential, so scheduling and local exclusion are model assumptions.

An agent pays 0.70 energy per tick. If a neighboring location is vacant, it moves to a vacant neighbor with the most resources when local resources are depleted, or with probability 0.06; moving costs 0.30 energy. Ties are resolved by location index. Moving is a fixed controller rule, not an evolved strategy in this version.

Harvesting consumes 1 resource unit and 0.45 energy. Success adds 3.0 energy. Founders start with 18 energy; descendants with 12. An agent dies at zero energy or age 50. An agent with at least 29 energy can reproduce into a randomly selected vacant neighboring location, paying 17 energy. The difference between this cost and the child's initial energy is a birth cost, so reproduction does not create free energy.

In the change condition, every habitat's favored action rotates by one at the start of tick 120. In the stable condition, it remains unchanged. This complete abrupt shift is an intentionally narrow test; gradual or partial changes are not covered.

## Learning and inheritance

Each agent stores nine success estimates, one for each habitat/action pair, initialized to 0.50. With probability 0.16 it chooses uniformly among all three actions; otherwise it selects a maximal estimate, breaking ties deterministically at random. An observed binary outcome updates the selected estimate using `q ← q + 0.18 × (outcome − q)`. Observation counts are logged but do not affect learning rate or action selection.

Three birth treatments are compared:

- **None:** reset all estimates to 0.50 and counts to zero.
- **Faithful:** copy the parent's full estimates and counts without sharing mutable memory objects.
- **Scrambled:** copy the same values and counts, but apply an independently seeded nonzero circular permutation to the action labels within each habitat row. This is a content corruption control, not a sample from an unrelated lineage.

All treatments have the same storage capacity and per-action budget. This version assigns no separate energy cost for retaining memory. Faithful descendants therefore have more relevant prior information than the no-memory control, by design. An advantage in stable worlds alone is not surprising evidence of novel emergence.

Exploratory worlds can enable heritable mutation of exploration and learning rates by an additive uniform increment in [−0.04, 0.04], clamped to [0.01, 0.8]. Mutation is disabled for all trials in the first controlled protocol.

## Randomness and repeatability

Random draws use a documented deterministic 32-bit hash of the seed, tick, location or agent identifier, and channel. The world, initial population, exogenous harvest random field, and pre-change trajectories are paired across treatments where applicable. Divergent populations lead to divergent agent identities and decisions; pairing does not mean trajectories remain identical after treatment effects begin.

Replay requires the original engine source and configuration. Source SHA-256 covers `src/engine.mjs`, `src/experiment.mjs`, and `scripts/research.mjs`, in that order separated by newlines. Trial IDs derive from that hash and the complete configuration. A source change cannot silently reuse an old trial ID. The initial campaign was run under Node 24; browser and Node use the same engine module.

## Outcome and analysis

The primary outcome is the mean occupied fraction over ticks 120 through 239 inclusive. States are measured after each tick. If extinction occurs earlier, remaining observations are zero rather than omitted. Stable worlds use the same time window. The trial horizon is finite; survival to tick 240 is not proof of indefinite sustainability.

For each independent seed, compute:

`interaction = (changed faithful − changed none) − (stable faithful − stable none)`.

The prespecified prediction is a negative interaction. There are 24 exploration seeds (10000–10023) and 48 distinct confirmation seeds (50000–50047). Each seed generates all six conditions, for 432 trials. Subsequent campaigns add `campaign × 100000` to both ranges. These blocks are independent simulation seeds, not independent research teams or models.

The reported interval is the 2.5th–97.5th percentile of 2,000 seeded bootstrap means, resampling complete seed-level contrasts. This preserves pairing and avoids treating individual agents or time points as independent samples. Group intervals are separately computed for descriptive plots. No correction turns these secondary comparisons into confirmatory tests.

The interface says **Confirmed within this model** only when both exploration and confirmation intervals for the primary interaction lie below zero. **Prediction not supported** is used if the confirmation interval lies above zero. Other cases are **Inconclusive**. This simple classification is not a calibrated posterior probability and does not establish external validity.

## Provenance and limitations

The local protocol file is written before the campaign begins. This is a prospective local record, not an externally registered preregistration. Pilot calibration used a separate seed and is documented in `PILOT.md`. Full manifests retain timestamps, runtime version, source hash, configuration, trial ID, and compressed trace checksums. All scheduled conditions are retained regardless of their result.

The project currently has one experiment family, one learning algorithm, one topology, one resource model, one horizon, and one severe change type. Population ceilings, fixed movement rules, founder placement, numerical precision, and short horizons all matter. Behavioral roles, intelligence growth, autonomy in the real world, and self-replicating software are not established by these experiments.

Before a paper, test alternative learning rules, slower and partial change, memory decay and costs, population scales, environmental topology, and intervention-based explanations. Keep exploration and confirmation records distinct when selecting these extensions.
