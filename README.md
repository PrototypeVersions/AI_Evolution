# Inheritance — AI Evolution Observatory

A public, read-only study of learned inheritance under an accounted neural-computation budget.

**Live:** https://prototypeversions.github.io/AI_Evolution/

## Study 003, protocol 1

Three paired replicates compare an inherited population, a population with freshly initialized offspring, and one continuously trained learner. All models are real 12 → 24 → 8 neural networks. They learn four bitstring transformations through backpropagation; inherited descendants copy and perturb learned weights.

Each arm receives the same example stream and dense neural MAC budget. Reporting uses input strings withheld from training and parent selection. A separate composition probe and short warm-start assay are explicitly labeled exploratory. This is a bounded first study, not an LLM or a demonstration of unlimited intelligence.

Read [the protocol](docs/INHERITANCE.md) and [the development pilot](docs/INHERITANCE_PILOT.md). The pilot is not official history. Evolution is allowed to lose.

## Operation

- `Continue Inheritance 003` resumes the saved checkpoint for 12 rounds hourly at minute 17 UTC. GitHub may delay scheduled runs.
- The chapter stops at round 384, preserves its weights and records, and waits for a subsequent protocol. It does not automatically reset.
- Every segment is archived in a GitHub Release before the checkpoint and public report are committed together. Accepted reports link the releases belonging to their checkpoint chain.
- Visitors can inspect history and weights; they cannot start, alter or reset the study. Closing the browser has no effect on the worker.
- No paid API, external AI director, credentials in browser code, or third-party frontend dependency is used.

## Local use

Node 24 or newer; no package installation required.

```sh
npm test
npm start
```

`npm run advance` resumes `data/inheritance/checkpoint.json` and writes a local archive. Never run it against an accepted checkout unless intending a local continuation. Local advances are not official cloud segments. `npm run pilot-inheritance` runs separate development seeds and writes to ignored `work/`.

The engine, runner and protocol are source-hashed. Changing them requires a separate protocol/migration; a source mismatch stops advancement. Genesis is an explicit one-time command and refuses to overwrite existing state.

## Previous experiments

- [Symbiosis 002](symbiosis.html): artificial ecology with evolving decision circuits, archived with its schedule paused. Its source, checkpoints and published releases remain available.
- [Continuum 001](continuum.html): original persistent world, schedule paused.
- [Original bounded research plan](docs/RESEARCH_PLAN.md) and [methods](docs/METHODS.md): historical experiments and preserved results.

These are separate experiments. Their organisms are not ancestors of the neural models in Study 003. Old workflows remain available for explicit manual archival work; only Inheritance has a scheduled continuation.
