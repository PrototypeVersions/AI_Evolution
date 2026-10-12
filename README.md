# AI Evolution

A computational ecology laboratory for studying inherited information, adaptation, and population dynamics. Created for Blake A. Myers.

**Open the lab:** https://prototypeversions.github.io/AI_Evolution/

The website contains an interactive world, agent inspection, ancestry, deterministic replay, controlled browser experiments, measured research results, and a research ledger. It uses baseline learning algorithms. No LLM, model API key, or paid service is required.

## Start here

1. Open **Live world** and press **Run world**. At tick 120, every habitat changes which action succeeds most often. Select an agent to inspect its learned estimates and ancestors.
2. Use **Configure world** to compare inheritance modes, stable environments, and optional inherited policy variation. These are exploration runs.
3. Open **Experiments** for the published 432-trial campaign or run 48 fresh exploratory trials in your browser.
4. Open **Research ledger** to inspect the hypothesis, methods, uncertainty, source hash, and exact trial configurations. Replay an underlying trial or download the record.

## Run locally

Requires **Node.js 24**, with no npm dependencies to install. On this Mac, `Start-Lab.command` also supports the Node runtime bundled with ChatGPT if present. From a terminal:

```sh
git clone https://github.com/PrototypeVersions/AI_Evolution.git
cd AI_Evolution
npm start
```

Open http://127.0.0.1:4173. The local dashboard adds a **Run full protocol** button. Closing the browser does not stop the server, but computer sleep or exiting the server stops ongoing computation. Completed trials resume when the same campaign is restarted. The live exploration world is in browser memory until exported.

```sh
npm test
npm run research                 # 24 exploration + 48 confirmation seeds
node scripts/research.mjs --campaign 1  # new, disjoint seed block
npm run publish-results          # commit and push the new derived report
```

Publishing requires a normal authenticated Git checkout. Agents do not receive credentials. The publisher only stages and commits `data/published.json`; it does not force-push.

## Automatic reporting

`.github/workflows/research.yml` runs one short, bounded 432-trial replication campaign daily at **11:23 UTC**, then updates the public report and deploys Pages. It can also be started from GitHub Actions using **Run workflow**. It uses a standard public-repository runner and no paid model API. The run is limited to ten minutes; it is not a permanently running cloud laboratory.

Each workflow run uses a disjoint seed block. Previous reports remain in Git history. Complete raw records are uploaded as workflow artifacts with **90-day retention**; download important archives before they expire. Source changes produce a different campaign identity. Daily results are repeat tests of the fixed protocol, not new hypotheses selected by an AI scientist.

GitHub schedules may be delayed and can be disabled after prolonged repository inactivity. See [GitHub scheduling documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule). No claim of guaranteed uninterrupted hosting or execution is made.

Pages uses **GitHub Actions** as its publishing source. The deployment workflow tests the engine and publishes only `index.html`, `assets`, `src`, `docs`, and `data`. The raw database is not included in the website.

## Evidence and storage

| Record | Location | Retention |
| --- | --- | --- |
| Source, methods, fixed protocol | Git repository | Version history |
| Published summaries and all per-trial outcomes | `data/published.json` | Git history after publishing |
| Local trial manifests and results | `research/ledger.sqlite` | On the originating computer |
| Complete local action traces and state | `research/runs/*.json.gz` | On the originating computer |
| Immutable campaign protocol and summary | `research/campaigns/` | On the originating computer |
| Consistent ledger snapshot | `research/campaign-*.sqlite` | On the originating computer |
| Browser experiments | Browser IndexedDB | Subject to browser storage clearing; export to retain |
| Scheduled campaign raw data | GitHub Actions artifact | 90 days |

The local ledger rejects record updates and deletions through database triggers. This is an append-only application design, not a cryptographic guarantee against a person with filesystem access. Raw files have SHA-256 checksums recorded in the ledger. Back up the complete `research/` directory independently; copying a database on the same disk is not an off-device backup.

## First result

The initial campaign found a smaller faithful-memory benefit after an abrupt environmental change than in stable worlds. The independent 48-seed confirmation block estimated a **−15.1 percentage-point interaction**, with a paired bootstrap interval of approximately **−16.2 to −13.9 points**. These numbers describe this specific artificial model. They do not establish a result about actual LLMs, nor a novel scientific discovery.

Read [Methods](docs/METHODS.md), [Research plan](docs/RESEARCH_PLAN.md), and [Pilot calibration](docs/PILOT.md) before interpreting the findings.

## Containment

The engine is a pure JavaScript state machine. Its agents can select resource actions, move to simulated neighbors, and instantiate simulated descendants. They cannot access shell commands, files, network sockets, external devices, or API credentials. The local server binds to loopback and exposes only fixed research controls. The human-owned publisher and GitHub workflow perform reporting outside the agent world.

## Scope of version 0.1

Implemented: repeatable baseline ecology, learning, memory treatments, optional policy mutation, controlled batches, seed-level statistics, research provenance, archive export, replay, daily replication, and Pages publishing.

Future work: richer environments, hypothesis-driven interventions on apparent roles, comparisons with genuine LLM agents, adaptive experiment selection, and a separately permissioned AI research assistant. No current interface is a placeholder for an undisclosed model connection.
