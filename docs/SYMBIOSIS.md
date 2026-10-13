# Symbiosis 002 — protocol 1

This is a new experiment, not a reset or continuation of Continuum 001. Its seed is 20261013. The first experiment's accepted checkpoints, code and releases are preserved; its hourly schedule is paused. Its observatory remains at `continuum.html`. Diagnostics used seeds 101, 202 and 303 before this protocol was frozen; those runs are not part of the official history.

## Question

How do inherited decision circuits change when agents compete for two resources and can trade, construct shared habitat, raid, defend and move? A long trajectory can generate hypotheses. It cannot by itself establish adaptation, intelligence, cooperation as a stable evolutionary strategy, or unlimited growth.

## World

There are four habitats, each with 64 spatial sites. One organism occupies each site. Sites use a symmetric nearest-neighbor graph. Twenty-four founders start in Verdant Shelf; the other habitats start empty. Food and mineral replenish at different rates. Tidal Reach follows a prescribed sinusoidal food cycle, not an evolved or AI-triggered change. Movement is local; migration pays energy to move to a free site in an adjacent habitat on a four-habitat ring. Sites represent simulated locations, not physical devices.

Food converts to energy; mineral is needed to reproduce and build. Energy upkeep, movement, construction, defense, raids, trading and circuit size impose costs. Agents reproduce automatically when they have enough energy, food, mineral and a neighboring vacancy. Birth transfers 10 energy, 1 food and 0.6 mineral; the parent pays 12 energy, 1 food and 1.2 mineral. Remaining energy/mineral is dissipated. Death follows energy exhaustion or 160 ticks of age. Inventories cap at six units, energy at 36. Death removes carried resources. There is no automatic reseeding after global extinction.

## Evolvable programs

An agent's program is an acyclic circuit, starting with six units. Each unit reads two sensors or earlier units, combines them with weights and a bias, applies tanh, and adds a weighted vote to one action. Nine inherited action biases and learned action values also contribute. The highest-scoring action wins unless exploration selects a random action. The twelve inputs include resource inventories, local resources, neighbors, recent harm, structures and age. The nine actions are FORAGE, MINE, TRADE, BUILD, RAID, GUARD, MOVE, MIGRATE and REST.

Birth can insert, delete, rewire or retune units; it also mutates action biases and exploration, learning and memory-inheritance rates. The executable circuit is bounded to 1–48 units. References only point to sensors or earlier units. Programs are data interpreted by the engine, never host code. Offspring inherit a fraction of learned action values. Learning updates the chosen action's estimated immediate material return. This is a simple learner, not an LLM.

Founders are seeded with viable gathering and movement behavior plus two random units. Movement was revised after diagnostic extinction: starving founders otherwise kept harvesting depleted sites. These starting abilities are designed, not discoveries. Random exploration can choose every action from the beginning; the viewer reports its share. Structural diversity ignores weights, biases and numeric tuning and groups the ordered wiring/action targets. Program insertion is more frequent than deletion, so longer circuits can reflect mutation bias as well as selection. No intelligence score is claimed.

## Interactions

- TRADE advertises a standing offer for 12 ticks. Another trading neighbor can exchange one food for one mineral only if both have complementary surpluses and a current offer. Inventories transfer exactly; no resource is created by trade. The second party's consent is its standing offer, not a fresh action at the moment of exchange.
- BUILD consumes mineral and energy, raises local structure and improves food regeneration at that site and neighboring sites. It also provides passive raid resistance. Structures persist after builders die and decay by 0.006 each tick. Benefits are available to any occupant. The effect is a designed rule; the frequency and distribution of building are observations.
- RAID attempts to transfer food and mineral from a neighbor. A recent GUARD action and structure reduce success probability. A blocked raider pays an additional cost. All transfers conserve the transferred resources.
- GUARD raises temporary resistance, which decays. Recent harm is a sensor available to an agent's circuit.

Randomized turn order is reproducible from the saved PRNG state. Actions resolve sequentially. Newborns can be interacted with immediately but first act on the next tick. One tick is a computational step, not a unit of physical time.

## Evidence and persistence

The authoritative checkpoint includes the entire world and PRNG state. Every continuation checks a SHA-256 digest of the checkpoint, its matching public report, and the simulation source. Changes to the engine, runner or director stop continuation pending an explicit new protocol. Genesis refuses to overwrite either existing file. Extinction remains recorded. Git commits update the checkpoint and public report together. A workflow run ID prevents committing the same segment twice.

Each accepted segment links to a GitHub Release containing before/after checkpoints, compressed full events, measurements, sampled replay frames, the director record, source, protocol and checksums. The release is uploaded before the checkpoint commit. A failed commit can leave an orphan release; only releases linked by accepted checkpoint manifests belong to the official chain. A replay consists of sampled recorded states, not a browser simulation. The latest 300 ticks are sampled every five ticks. Long-term charts retain sampled measurements; older samples are thinned after 1,200 entries. Full segment measurements remain in releases. Recent public lists are bounded. The event log plus source and PRNG state supports exact replay.

The scheduled worker advances 1,000 ticks hourly at minute 37 UTC. A manual dispatch can advance up to 5,000. GitHub may delay or disable scheduled jobs; the page displays the checkpoint timestamp and stale status. Closing the browser has no effect. Visitors only fetch public data. No page control can start, change or reset the world.

## Optional AI director

The director is advisory and disconnected by default. It needs repository variable `SYMBIOSIS_DIRECTOR_ENABLED=true`, `OPENAI_MODEL` and secret `OPENAI_API_KEY`. No model call has been made during development. At most one request is attempted per UTC day in a successfully committed chain. Retries of uncommitted jobs may make extra requests. Calls are separately billed. The adapter records the request, response, model and usage, limits output and times out after 45 seconds. Failures do not stop the ecology. It can state observations, hypotheses, predictions and proposed studies; it cannot mutate the world, execute studies, change code or provision devices. API output is displayed as text.

## Reading the observatory

Dot positions are real occupied sites; colors can encode the most recent action or founder ancestry. Link colors distinguish exchange, raids, blocked raids and migration. Resource and infrastructure layers show recorded quantities. The circuit inspector shows a selected organism's last decision, including exploration, sensor readings, intermediate activations and action scores. It explains execution, not a proven evolutionary reason. Founder bands show ancestry abundance, not species. Strategy shapes, effective diversity, generation and circuit length are separate descriptive measures. All headlines and counts are measurements unless explicitly marked as an AI hypothesis.
