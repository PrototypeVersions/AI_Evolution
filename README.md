# AI Evolution — one persistent world

**Watch:** https://prototypeversions.github.io/AI_Evolution/

Continuum 001 is a single saved digital ecology. Four populations learn, reproduce, inherit memories and neural policies, migrate, and sometimes lose lineages. Every hourly continuation starts from the preceding checkpoint. The website is a public observatory: visitors can inspect and replay, but cannot modify the world.

## What runs automatically

`Continue the persistent world` resumes the population for 240 more ticks at minute 17 of each hour (UTC). It archives all events and before/after checkpoints, commits the new state and observations together, and publishes the website. The computer and browser can be off. GitHub can delay or disable scheduled jobs; the site displays the actual checkpoint time. This is continuous state across scheduled computations, not a constantly running server.

There is no fixed terminal tick or automatic reset. Local populations may die out and later be recolonized. Global extinction remains an outcome. The first revision's independent comparison experiments are preserved separately and now run only on explicit manual dispatch.

## What can evolve

- Learned action estimates and their inheritance.
- Exploration, learning rate, neighbor-learning and migration propensities.
- Neural-policy connections, plus insertion and deletion of units at birth.
- Population distributions, lineage survival and information-transfer patterns.

The current budget is 144 locations and at most 24 neural units per agent. Organisms have three resource actions and defined movement/learning mechanisms. No LLM controls the organisms. These limits can be changed only through an explicit model revision. The goal is to investigate increasingly rich evolution; this version does not establish unlimited complexity or intelligence.

## GPT direction

The model adapter is implemented but **disconnected by default**. The world runs without API calls. The research-director page labels this state explicitly.

To activate later, first choose a model and spending budget, then configure repository secret `OPENAI_API_KEY` and repository variables `OPENAI_MODEL` and `DIRECTOR_ENABLED=true`. Keys never belong in the public website. By default the director can only observe and record predictions. `DIRECTOR_ALLOW_INTERVENTIONS=true` additionally permits one limited habitat change under timing/population checks. It cannot edit code, create organisms, reset worlds, or contact devices. Requests, responses, usage and applied/rejected decisions are archived. The daily request/token limits are not a guaranteed dollar cap, especially after failed-job retries. No paid model request was made in development.

Read the exact policy, limits and setup in [the persistent-world protocol](docs/PERSISTENT_WORLD.md).

## Records

| Record | Location |
| --- | --- |
| Authoritative current state | `data/world-state.json` |
| Public observations and recent playback | `data/world.json` |
| Full segment traces, checkpoints, model decisions and source | [GitHub Releases](https://github.com/PrototypeVersions/AI_Evolution/releases) |
| Accepted checkpoint/report history | Git commits on `main` |
| Earlier controlled baseline results | `data/published.json` and existing campaign releases |

Each segment records its parent checkpoint hash, resulting hash and source hash. The runner refuses missing/corrupt checkpoints or an unexpected source revision. A release created before a failed Git push may be unaccepted; the committed public report identifies the accepted chain. The browser shows a bounded recent window; complete older data remains in its archives. Keep independent downloads of important records.

## Owner-operated commands

Requires Node.js 24. There are no npm dependencies.

```sh
npm start                     # read-only local observatory on 127.0.0.1:4173
npm test                      # baseline and continuity/integrity checks
npm run continue-world        # advances the checked-out world; never a public control
```

The initial genesis has already been created and committed. Do not run `--genesis` again; it rejects an existing world. For cloud continuation use [GitHub Actions](https://github.com/PrototypeVersions/AI_Evolution/actions/workflows/world.yml). The workflow publishes automatically. Do not independently advance and push a local copy while the cloud workflow is running: Git history must have one accepted successor to each checkpoint. Normal pushes reject a changed remote head.

## Development and research direction

See [the full protocol](docs/PERSISTENT_WORLD.md) for exact rules, source-migration requirements, extinction behavior, finite resource budgets, optional GPT policy and eventual device distribution. Agents have no network, filesystem, shell, credentials or arbitrary code execution. Future cross-device migration would transfer validated state between explicitly enrolled hosts, not propagate software to other computers.

Promising next stages include richer task ecologies, evolvable memory and policy languages, complementary skills, resource exchange, and carefully defined measures of novelty and capability. Separate populations can become different; whether they develop cooperation, dependence or new capabilities must be measured rather than inferred from appearance.

The previous baseline methods and pilot remain in `docs/METHODS.md` and `docs/PILOT.md`. They describe the earlier comparison experiment, not this persistent-world protocol.
