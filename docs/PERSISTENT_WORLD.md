# Continuum 001 — one persistent digital ecology

This is the main experiment as of the persistent-world revision. It begins at its own recorded genesis; it is not a continuation of any of the earlier 240-tick comparison trials. Those controlled trials remain available as a separate baseline record.

## Continuity and ownership

The world has no fixed terminal tick. Every hourly GitHub Actions job restores the preceding checkpoint and advances the same population by 240 simulation steps. Reproduction, accumulated memory, inherited traits, counters, agent IDs, resource state and ancestry remain continuous. Computation pauses between jobs; elapsed real time does not age the agents. GitHub scheduling can be delayed. The site displays the checkpoint time and recorded playback explicitly.

Visitors only read snapshots. Selecting an agent, hiding a layer or replaying a saved segment does not change the shared world. There are no browser start, reset, configure, upload or mutation endpoints. Only repository-authorized workflows can publish continuation. A missing, mismatched or corrupt checkpoint stops the runner instead of creating a new world.

## Four populations

Grove, Basin, Ridge and Delta each contain 36 locations and begin with six founders. Habitats offer three resource actions. Their resource-regeneration rates are .72, .68, .80 and .64 units per tick respectively; the capacity of each location is three units. Ordinary movement and births remain within an island. With probability `migration_trait × .01` each tick, an agent with energy above eight may move to a free portal in the next island and pay two energy units. The four islands form a directed ring. These are simulated regions, not four real devices.

Agents pay .70 upkeep plus .002 per inherited neural-policy unit, .45 per harvest attempt, .30 per local move and .12 per neighbor-learning event. A successful harvest yields three energy units. The favored action succeeds with probability .86; alternatives with .12. A local offspring requires parent energy at least 29 and a vacant adjacent location, costs the parent 17 energy, and starts with 12. Founders begin with 18. Agents die at zero energy or age 50. A local extinction may be followed by natural recolonization through migration. Global extinction ends this world permanently unless the owner explicitly initiates a separately identified experiment; there is no automatic rescue or reset.

Every 600 ticks, a scheduled environmental change rotates one habitat's favored action on one island. Islands cycle first; habitat types cycle over successive rounds. This exogenous rule is fixed at genesis and all changes are logged.

## Learning and evolution

Each agent estimates action success in each habitat, learns from its outcomes, and sometimes explores. It may also copy part of the learned estimates of its highest-energy adjacent neighbor, paying an energy cost. Directed learning edges are observable events, not evidence of communication in a natural language or cooperative intent.

Offspring inherit their parent's learned estimates and four traits: exploration, learning rate, propensity to learn from neighbors, and migration propensity. Each trait independently receives a uniform perturbation in [−.04,.04], clipped to [.01,.8]. Individuals with different traits may leave different numbers of surviving descendants. Ancestry and trait changes are recorded at every birth. The live inspector carries the last 12 ancestors for compactness; complete parentage remains in archived birth events.

Each agent also has a small inherited neural policy, initially two hidden units. Each unit receives eight inputs (three learned action estimates, energy, age, local resources, island and habitat), applies tanh, and adds weighted biases to the three action scores. At each birth there is an .08 probability of inserting a unit, .04 of deleting a unit and .50 of perturbing one connection. Connections are clipped to [−2,2]; a deployment budget permits at most 24 units. Full policies are recorded at birth. This allows structural variation and policy growth or simplification, with a small computation cost. Unit count is a descriptive complexity measure, not an intelligence score. The budget can be revised explicitly; this deployment is not literally unbounded.

This permits learning, selection, structural policy evolution, migration and cultural transmission in a limited state/action space. Agents cannot invent new executable code, new actions, arbitrary architectures or capabilities. No LLM controls the organisms. Persistence alone does not establish open-ended evolution, increasing intelligence, novelty, cooperation or autonomous goal formation. Interesting candidate patterns need later controlled comparisons or interventions.

## Optional GPT director

Default: disconnected. Automatic measurement notes are explicitly labeled as non-GPT. The world runs without a model API. The owner can separately configure a repository secret `OPENAI_API_KEY` and repository variables `OPENAI_MODEL` and `DIRECTOR_ENABLED=true` after choosing a model and spending budget. Do not enter keys into the public website or commit them.

The adapter makes at most one request per UTC day on the normal successful continuation path, with a 45-second timeout, at most 1,600 output tokens and no retries inside a job. Input consists of compact world measurements, fixed policy and model limits; no user documents or credentials are included. Failed/uncommitted jobs can be retried by GitHub or the owner, so these limits are not a guaranteed dollar spending cap. Set an appropriate provider-side project budget and monitor usage before activation. No paid request was made while building this revision.

The director records an observation, hypothesis, prediction and rationale. It defaults to observing. Proposed interventions are not applied unless `DIRECTOR_ALLOW_INTERVENTIONS=true`. The only allowed intervention is rotating one habitat's favored action on one island. It cannot spawn agents, reset a population, modify genomes, run code, contact devices or change its action vocabulary. An intervention requires occupancy at least .65, at least 240 ticks since any environment change, at least 1,200 ticks since its last intervention, and at least 120 ticks until the next scheduled change. The full request, response, usage, decision and whether it was applied are archived. The public director page shows the decision and outcome. A failed or malformed model response leaves the world under its existing rules.

This is a narrow initial director, not an autonomous research scientist. Broader experimental design, richer agent architectures, reasoning between checkpoints and better novelty measures are future research work. Owner-reviewed code/model changes must be recorded as protocol revisions, not silently mixed into an unchanged experiment.

## Records and recovery

`data/world-state.json` is the current resumable checkpoint. `data/world.json` is the public observational projection. Both are committed atomically in one Git commit. The runner checks a SHA-256 hash of the checkpoint and a hash of its simulation/runner/director sources. Source changes require an explicit migration. Source hashes and checksums detect inconsistency; they are not a security boundary against an authorized repository editor.

Each segment is archived before its checkpoint is published, as a versioned GitHub Release containing before/after states, complete compressed events, measurements, frames, director records, checksums and matching source. A release can exist for a run whose subsequent Git push failed. Only segments linked from the committed public report belong to the accepted world history; parent and checkpoint hashes establish their chain. Old accepted reports remain in Git history. Download important archives for an independent backup.

The website retains the latest 2,048 sampled measurements, 100 segment summaries and 100 notes, plus a 12-tick-spaced replay of the latest segment. This bounded display is not the entire raw history. Full older records remain in their release archives. The checkpoint retains living agents and recent edges; archived death/birth events preserve complete parentage and extinct populations.

If computation or deployment fails, the last published checkpoint remains visible. The next successful job resumes it. If a job is manually retried after its checkpoint already committed, its run ID prevents duplicate advancement. A source mismatch or integrity failure needs owner attention; it never generates a replacement world.

## Across real devices, later

The same structure could distribute the islands over explicitly enrolled computers or servers. Migration would transfer validated data—identity, genome/traits, memory and parentage—not install or propagate software. A coordinator would give each agent one authoritative owner, record a handoff once, resolve delayed hosts and prevent duplication. Different hosts could impose different compute, memory, latency and energy budgets. That would let us study resource-dependent specialization and population interaction. This release simulates those distinctions on one runner; it does not connect to or spread across other computers.

The most useful next capabilities would be evolvable strategies/programs within a restricted language, task diversity, and measurable exchanges between agents. They should be added as explicit model revisions with appropriate cost controls and comparisons, rather than asserted as properties already present here.
