# Measurement clarification — Inheritance 003

Added after the first accepted segment, without changing the frozen engine, protocol, checkpoints or selection rules.

The matched neural MAC ledger covers the training, selection, primary audit, composition probe and phase-end assay inside the learning loop. It does **not** cover the additional forward passes used when preparing illustrative predictions for the website. Each report computes four examples for every live model: 16 forward passes (7,680 MACs) per population arm and four (1,920 MACs) for the continuous-learner arm, per replicate per segment. Genesis also prepares these examples. These predictions do not train the models or influence selection. Total neural work including presentation is therefore slightly unequal; the claim of equality applies to the explicitly accounted experimental loop.

The archived worker elapsed and CPU times cover that learning loop, not the entire GitHub job, report preparation, archive compression or deployment. Peak RSS is the process high-water mark at the time of measurement. The GitHub workflow record provides overall job duration. No claim of equal physical runtime, energy consumption or total memory usage is made.

This clarification narrows the accounting language in protocol 1; it does not change the experiment. The current website labels these distinctions. Any publication should include presentation overhead or explicitly exclude it for all comparisons. The original protocol remains source-hashed and archived unchanged.

## Viewer language clarification — 2026-10-13

The display names now describe what persists:

| Frozen protocol / data name | Viewer name |
| --- | --- |
| Inherited population (`inherit`) | Survivors + inherited copies |
| Fresh offspring (`reset`) | Survivors + fresh models |
| Continuous learner (`single`) | One continuing learner |

Both populations keep the two best models by selection loss and replace only the other two after every round. Retained models keep training with their learned weights. In `reset`, replacement models receive random connection weights and zero biases, with no inherited learned state. The entire population is never reset together.

The graph reports one selection-chosen model per replicate, evaluated on separate withheld inputs, then averages the three replicate scores. It does not report mean population performance or newborn performance. A rising `reset` curve can result from old survivors improving; it does not demonstrate a benefit from restarts. Four models and two replacements are baseline design choices, not optimized settings. A four-model population with no replacement would be a useful additional control in a subsequent protocol.

The viewer now exposes each plotted model’s founder/descendant status and training history. Inherited training exposure is distinguished from training performed after birth; neither is a measure of retained knowledge. These are presentation changes derived from the existing record. The running experiment, checkpoint, data schema, and frozen source hash are unchanged.
