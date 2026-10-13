# Symbiosis — AI Evolution Observatory

[Open the observatory](https://prototypeversions.github.io/AI_Evolution/)

One persistent digital ecology, continued hourly in the cloud. Visitors can observe organisms, inspect their inherited decision circuits, replay recorded states and follow founder lineages. They cannot alter the world.

Symbiosis 002 introduces two-resource economies, bilateral exchange offers, shared structures that outlive their builders, raids and defenses. Programs are acyclic circuits whose units can be added, deleted, rewired and retuned at reproduction. Learned action values and inherited memory also influence decisions. The world is bounded; circuit growth and action variety are not proof of intelligence or open-ended evolution.

## Run and inspect

Requires Node 24 or newer, with no package dependencies.

```sh
npm start                     # read-only local observatory at localhost:4173
npm test                      # deterministic continuation, ecology, accounting and integrity
npm run advance               # advance checked-out Symbiosis checkpoint by 1,000 ticks
```

The scheduled [Continue Symbiosis 002 workflow](https://github.com/PrototypeVersions/AI_Evolution/actions/workflows/symbiosis.yml) advances 1,000 ticks hourly at minute 37 UTC and deploys automatically. A manual dispatch allows 1–5,000 ticks. GitHub schedules may be delayed; the website displays the actual checkpoint time. Your computer and browser can be off. Do not advance and push an independent local copy concurrently with the cloud worker.

Every accepted segment has a release with before/after checkpoints, complete compressed events, sampled measurements, source, protocol and checksums. The release uploads before the checkpoint is committed. A failed commit can leave an orphan release; only manifests linked by the accepted checkpoint history are official. Re-running an already accepted workflow ID does not advance the world twice. Global extinction is preserved and never automatically reseeded. Engine changes stop the runner until an explicit migration or distinct experiment is prepared.

| Record | Location |
| --- | --- |
| Authoritative world | `data/symbiosis/checkpoint.json` |
| Public observations | `data/symbiosis/observatory.json` |
| Exact mechanisms and limits | `docs/SYMBIOSIS.md` |
| Complete segment archives | GitHub Releases |
| Original world | `continuum.html`, `data/world-state.json`, `data/world.json` |
| Earlier controlled baseline | `docs/METHODS.md`, `docs/PILOT.md`, `data/published.json` |

## AI director

The new director is advisory and disconnected by default. It can review measurements and propose falsifiable studies, but cannot alter this world or execute studies. To connect it later, choose a model/budget and set secret `OPENAI_API_KEY`, variable `OPENAI_MODEL`, and variable `SYMBIOSIS_DIRECTOR_ENABLED=true`. One review is attempted per UTC day in the accepted chain; uncommitted retries may make extra requests. Usage is archived and API billing is separate. No paid model calls were made during development. The older director flags apply only to the archived first experiment.

## Experimental continuity

Symbiosis has a new identity and genesis. Continuum 001 was not silently upgraded or reset: its original code, checkpoints and releases are preserved, and its hourly schedule is paused. Its manual workflow is retained. The earlier controlled comparison is also preserved and manual only. See the protocol for designed starting abilities, exploration, mutation bias, observation limits and the distinction between ancestry and species.
