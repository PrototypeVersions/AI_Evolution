"""Package an already-completed pilot; never runs or changes the experiment."""
import gzip
import hashlib
import io
import json
import sys
import tarfile
from pathlib import Path
from statistics import mean

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / (sys.argv[1] if len(sys.argv) > 1 else 'work/adaptation-pilot-v1')
dest = ROOT / 'data/adaptation'
dest.mkdir(parents=True, exist_ok=True)
report = json.loads((source / 'pilot.json').read_text())
metadata = {
    'response-pair': {'name': 'Best learning pair', 'short': 'Learning pair', 'color': '#b7a3ff',
                      'description': 'Keep the pair whose averaged predictions work best after short practice lessons.'},
    'response-individual': {'name': 'Two fastest learners', 'short': 'Individual learners', 'color': '#f0bc7b',
                            'description': 'Use the same practice lessons, but select by individual performance.'},
    'current-pair': {'name': 'Best current pair', 'short': 'Current pair', 'color': '#73cfec',
                     'description': 'Keep the pair whose averaged predictions work best on the current problem.'},
    'current-individual': {'name': 'Two best current models', 'short': 'Current individuals', 'color': '#f295b8',
                           'description': 'Select the two strongest current models individually.'},
    'continual': {'name': 'Keep all four', 'short': 'Keep all four', 'color': '#d4d6df',
                  'description': 'Continue training every original model. Use the best current pair for reporting.'},
}
curves = {}
for family_group in ['familiar', 'wave']:
    curves[family_group] = {}
    for method in report['methods']:
        points = []
        for step in [0, 16, 64, 256]:
            values = []
            for world in report['worlds']:
                rows = [row for row in world['outcomes'][method]['rows']
                        if (row['family'] == 'wave') == (family_group == 'wave')]
                stages = [s for row in rows for s in row['stages'] if s['examplesPerModel'] == step]
                values.append({'seed': world['seed'], 'loss': mean(s['loss'] for s in stages),
                               'accuracy': mean(s['accuracy'] for s in stages)})
            points.append({'examples': step, 'loss': mean(v['loss'] for v in values),
                           'accuracy': mean(v['accuracy'] for v in values), 'worlds': values})
        curves[family_group][method] = points
viewer = {key: report[key] for key in ['id', 'sourceSha256', 'protocolCommit', 'startedAt', 'finishedAt',
                                      'config', 'seeds', 'methods', 'compute', 'runtime', 'summary']}
viewer.update({'metadata': metadata, 'curves': curves,
               'engineCommit': '278c186827e81e47bf2ad8c4e89c925d01f5f61f'})

# All raw outcomes, sealed populations, and the exact experimental sources travel together.
files = {p.name: p.read_bytes() for p in sorted(source.glob('*.json'))}
for p in ['src/adaptation.mjs', 'scripts/pilot-adaptation.mjs', 'tests/adaptation.test.mjs',
          'docs/ADAPTATION_PILOT_PROTOCOL.md']:
    files[p] = (ROOT / p).read_bytes()
files['REPRODUCE.txt'] = b'''Adaptation 004, protocol 1. Node 24+, no dependencies.
Run: node scripts/pilot-adaptation.mjs reproduced
Run checks: node --test tests/adaptation.test.mjs
All eight worlds must be present. Do not select seeds by outcome.
Runtime/timestamps differ between machines; use trajectory hashes for deterministic state comparisons.
The population record hash in pilot.json hashes compact JSON before the trailing newline.
SHA256SUMS.txt below hashes actual file bytes, including trailing newlines.
The neural-MAC ledger excludes scalar overhead; it is not exact hardware FLOP accounting.
This exploratory pilot did not pass its expansion gate. No long-running replacement study was started.
'''
files['SHA256SUMS.txt'] = ''.join(f'{hashlib.sha256(b).hexdigest()}  {name}\n' for name, b in sorted(files.items())).encode()
tar_bytes = io.BytesIO()
with tarfile.open(fileobj=tar_bytes, mode='w') as tar:
    for name, payload in sorted(files.items()):
        info = tarfile.TarInfo('adaptation-004-pilot-1/' + name)
        info.size, info.mtime, info.mode = len(payload), 0, 0o644
        tar.addfile(info, io.BytesIO(payload))
archive = gzip.compress(tar_bytes.getvalue(), mtime=0)
(dest / 'pilot-records.tar.gz').write_bytes(archive)
viewer['archive'] = {'file': 'pilot-records.tar.gz', 'bytes': len(archive),
                     'sha256': hashlib.sha256(archive).hexdigest()}
(dest / 'observatory.json').write_text(json.dumps(viewer, separators=(',', ':')) + '\n')

summary = report['summary']
rows = '\n'.join(f"| {metadata[m]['name']} | {summary['methods'][m]['loss']['mean']:.4f} | "
                 f"{summary['methods'][m]['accuracy']['mean'] * 100:.2f}% |"
                 for m in report['methods'])
contrasts = '\n'.join(f"| {metadata[m]['name']} | {v['mean']:+.4f} | "
                      f"[{v['interval95'][0]:+.4f}, {v['interval95'][1]:+.4f}] | {v['wins']}/8 |"
                      for m, v in summary['contrasts'].items())
seed_rows = '\n'.join('| ' + str(seed) + ' | ' + ' | '.join(
    f"{summary['methods'][m]['loss']['values'][i]:.6f}" for m in report['methods']) + ' |'
    for i, seed in enumerate(report['seeds']))
doc = f'''# Adaptation 004 — completed pilot

**Decision: do not expand this selector into a long-running study.** The protocol's gate failed: learning-pair selection beat the individual-learning ablation in only one of eight worlds; the other seven were exact ties. Its average loss improved over current-performance selection, but that does not establish the proposed complementarity mechanism.

[Protocol](ADAPTATION_PILOT_PROTOCOL.md) · [Full records and source](../data/adaptation/pilot-records.tar.gz) · [Machine-readable summary](../data/adaptation/observatory.json)

## What was actually run

Eight paired worlds, five methods, sixteen population rounds, four models per method. Networks learn hidden geometric classification rules from labeled points. They have 129 parameters and are not LLMs. At each checkpoint, disposable copies learn new tasks and predict separate examples. The primary score averages losses after 16, 64 and 256 learning examples per member across six withheld tasks and four checkpoints. Lower loss is better. Task/checkpoint repetitions are not treated as independent worlds.

The [design record](https://github.com/PrototypeVersions/AI_Evolution/commit/738da7a86fd1ce89a1732441215df921d7878ad8) and [tested implementation](https://github.com/PrototypeVersions/AI_Evolution/commit/278c186827e81e47bf2ad8c4e89c925d01f5f61f) were committed before outcome runs. The only pre-run protocol wording correction made the training reduction exact (23.4375%). No settings, seeds, thresholds or stopping rules changed after outcomes. The run completed at {report['finishedAt']}.

## Primary outcome

| Method | Future loss, nats ↓ | Future accuracy ↑ |
|---|---:|---:|
{rows}

Accuracy is a secondary descriptive measure. These percentages average the three learning checkpoints; they are not final accuracy after 256 examples.

| Comparator | Learning-pair minus comparator loss ↓ | Descriptive paired 95% t interval | Learning-pair wins |
|---|---:|---:|---:|
{contrasts}

Intervals use eight paired world differences (df=7), not hundreds of correlated evaluations. They are not multiplicity-adjusted confirmation tests. The practical gate required a loss improvement of at least 0.005 nats and six wins over both current-pair and response-individual, without materially trailing continual. The response-individual comparison failed the win-count requirement.

## What the result does and does not establish

1. The proposed pair selector and individual-learning ablation have identical prospective outcomes in seven worlds. Current-pair and current-individual also coincide in all eight. This setup rarely creates a consequential choice between individually good models and a complementary pair.
2. The proposed ensemble beats both of its members on only {summary['methods']['response-pair']['bothContributionRate'] * 100:.2f}% of the 576 familiar-task/checkpoint/learning-stage evaluations. This descriptive member-removal check is performed after the same individual learning exposure. It does **not** reallocate the removed member's compute and is not evidence for two-parent synergy.
3. The lower primary loss is concentrated early in adaptation. After 256 examples/member, learning-pair accuracy is {curves['familiar']['response-pair'][-1]['accuracy'] * 100:.2f}% versus {curves['familiar']['continual'][-1]['accuracy'] * 100:.2f}% for keeping all four. Learning-pair loss is {curves['familiar']['response-pair'][-1]['loss']:.4f}, versus {curves['familiar']['continual'][-1]['loss']:.4f}. The early advantage does not persist at the final learning checkpoint.
4. Confidence matters: the primary average loss exceeds log(2) ≈ 0.6931, the loss of always predicting 50/50, despite accuracy near 69%. Networks are especially overconfident just after rule changes; they recover with more learning. This is a weakness in probability prediction, not a claim that their classification accuracy is below chance.
5. Probing methods spend 23.4375% less time training the current rule. Less specialization or overconfidence is one possible explanation for their lower early loss. The experiment does not isolate that explanation from the effect of selecting by future learning. Equal total compute is necessary but does not by itself identify the mechanism.
6. Both population members receive the same examples, replacement copies are lightly mutated, and the competence guard restricts selection. These choices may suppress useful diversity. This is an interpretation of a bounded null/mixed pilot, not proof that complementary learning responses are impossible.

## Next decision

Do not retune this pilot or run it for hundreds more rounds. Before another evolution experiment, a separately specified diagnostic should establish that useful differences in learning response exist and that a simple equal-training control cannot explain the early loss advantage. Any new design needs new outcome seeds and a new protocol. An LLM inheritance study remains a separate possible project; this pilot provides no basis for claiming improved LLM intelligence.

Study 003 remains intact. No new scheduler, paid API, or visitor-controlled training was added.

## Every world

| Seed | Learning pair | Individual learners | Current pair | Current individuals | Keep all four |
|---|---:|---:|---:|---:|---:|
{seed_rows}

## Reproducibility

All methods spent **21,954,560 accounted dense neural MACs per world**: 15,138,816 for the algorithm and 6,815,744 for disposable future evaluation. Scalar activations, biases, pair scoring, mutation, copying, RNG and I/O are excluded. Total runtime for this small pilot on the development machine was {report['runtime']['seconds']:.3f} seconds; peak RSS {report['runtime']['peakRssKiB']:,} KiB. Those hardware measurements are not per-method matching claims.

Thirty-seven repository tests passed before the outcome run, including numerical gradient checks, actual learning, pair scoring, immutable future evaluation, matched compute, deterministic method order and inherited-parent records.

Source SHA-256: `{report['sourceSha256']}`

Archive SHA-256: `{viewer['archive']['sha256']}`

The archive contains every per-task outcome, every selection candidate score, all births, the sealed populations/selected weights, source, protocol, and byte-level checksums. It includes instructions to reproduce the run with Node 24 and no package installation.

```sh
node --test tests/adaptation.test.mjs
node scripts/pilot-adaptation.mjs work/adaptation-reproduction
```

The runner refuses to overwrite a completed output directory. Timestamps and runtime will differ; deterministic population hashes provide the replication check.
'''
(ROOT / 'docs/ADAPTATION_PILOT_RESULTS.md').write_text(doc)
print(json.dumps({'archiveBytes': len(archive), 'viewerBytes': (dest / 'observatory.json').stat().st_size,
                  'archiveSha256': viewer['archive']['sha256'], 'decision': summary['decision']}))
