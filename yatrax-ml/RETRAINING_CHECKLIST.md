# YatraX ML Retraining Checklist

This checklist is based on the current `yatrax-ml` code and the exported
Colab artifacts in `data/processed`, `data/training`, and `models`.

The current model should not be retrained yet.

Why:
- several processed sources are sparse or default-heavy
- merge logic silently fills missing coverage with defaults
- label generation derives the target from the same features used in training

The goal of this checklist is to make retraining meaningful instead of
reproducing the same behavior.

## 1. Highest-Priority Blockers

- Fix ingestion bugs and schema mismatches before touching model code.
- Stop silent default-filling from hiding missing or low-quality sources.
- Replace synthetic safety labels with labels built from independent outcomes.
- Add quality gates so bad processed data fails the pipeline early.

## 2. Ingestion Fixes

### 2.1 Crime

Files:
- `ingestion/ingest_crime.py`

Observed issues:
- Current state header matching misses NCRB columns like `STATE/UT` and
  `States/UTs`.
- On the raw files in this repo, all checked crime CSVs miss the current
  `STATE_COL_NAMES` mapping.
- The processed crime output currently collapses to about one row per state,
  which removes most spatial value.

Required changes:
- Expand `STATE_COL_NAMES` to include:
  - `STATE/UT`
  - `States/UTs`
  - `STATE/UTS`
- Expand district matching for common NCRB variants if needed.
- Ignore non-district crime files that do not represent local incident counts.
- Add an ingestion summary:
  - files parsed
  - files skipped
  - rows with valid state
  - rows with valid district
  - rows with mapped coordinates
- Fail the ingest step if district/state match rate is below a threshold.

Success criteria:
- `crime_grid.parquet` has believable district-level coverage, not just
  state-level points.

### 2.2 AQI

Files:
- `ingestion/ingest_aqi.py`

Observed issues:
- If a raw AQI file has no latitude/longitude columns, the ingestor does not
  add fallback coordinates.
- That can produce a processed AQI file with no spatial columns, which means
  merge falls back to defaults everywhere.

Required changes:
- Always emit `latitude` and `longitude` in the processed output.
- Add city/station geocoding fallback if raw station coordinates are absent.
- If only city/state is available, aggregate at city level and assign known
  coordinates instead of leaving the file non-spatial.
- Add QA checks:
  - percent of rows with coordinates
  - number of unique cities/stations
  - AQI value range
- Fail if coordinate coverage is too low.

Success criteria:
- `aqi_grid.parquet` contains usable spatial coordinates and contributes real
  AQI variation to the unified grid.

### 2.3 Health

Files:
- `ingestion/ingest_health.py`

Observed issues:
- Health coverage is sparse.
- Deduping by `name_lower + state` may collapse distinct hospitals with common
  names.
- If coordinates are missing, the current ingest path keeps `NaN` and later
  loses those rows.

Required changes:
- Review the dedupe rule and include district/city/coordinates when possible.
- Add fallback geocoding by district/state if hospital coordinates are missing.
- Report:
  - facilities read
  - facilities kept
  - facilities dropped for missing coordinates
  - unique grid cells covered
- Fail if the processed grid is too sparse.

Success criteria:
- `health_grid.parquet` covers enough cells to produce meaningful hospital and
  emergency features.

### 2.4 Accidents

Files:
- `ingestion/ingest_accidents.py`

Observed issues:
- Many sources are likely city- or state-level, not dense point incidents.
- State fallback plus interpolation can create broad smooth gradients that look
  precise but are not.

Required changes:
- Separate truly geocoded accident points from city/state aggregates.
- Do not treat state-level accident summaries as point observations.
- Add coverage metadata for each processed row:
  - exact point
  - city geocoded
  - state fallback
- Consider keeping state-level accident features at state granularity instead
  of interpolating across the country.

Success criteria:
- `accident_grid.parquet` clearly distinguishes high-confidence local accident
  data from coarse fallback estimates.

### 2.5 Water

Files:
- `ingestion/ingest_water.py`

Observed issues:
- Water quality output is sparse and banded.
- State fallback can make coarse values appear spatially precise.

Required changes:
- Prefer exact station coordinates when available.
- Track how many rows come from exact coordinates vs state fallback.
- Do not spread state-level averages as if they were local measurements.
- Add QA:
  - unique stations
  - coordinate coverage
  - value bands

Success criteria:
- `water_quality_grid.parquet` reflects actual station coverage rather than
  repeated fallback bands.

### 2.6 Noise

Files:
- `ingestion/ingest_noise.py`

Observed issues:
- Current output can be empty.
- Station-name parsing may fail silently.

Required changes:
- Improve city/station parsing and geocoding coverage.
- Emit a hard warning or fail if processed noise output is empty.
- Add QA:
  - rows read
  - rows with coordinates
  - unique stations
  - unique grid cells

Success criteria:
- `noise_grid.parquet` is either valid and spatial, or the pipeline stops and
  tells us it is unusable.

## 3. Grid and Merge Fixes

Files:
- `processing/geo_grid.py`
- `processing/merge_sources.py`
- `app/grid_lookup.py`

Observed issues:
- Sparse sources are interpolated over the full India grid using IDW.
- Missing values are later filled with defaults, which hides data failure.
- Inference defaults differ from some merge defaults, so missingness can be
  interpreted inconsistently.

Required changes:
- Add per-source coverage reports during merge:
  - row count
  - cells hit directly
  - cells interpolated
  - cells default-filled
- Add thresholds that fail merge when a source is too sparse to trust.
- Add explicit missingness or coverage features, for example:
  - `crime_data_available`
  - `health_data_available`
  - `aqi_data_available`
- Do not silently fill important safety features with strong semantic defaults.
  Missing should stay missing unless we have a justified fallback policy.
- Align merge-time defaults and inference-time defaults, or reduce both.
- Revisit interpolation policy:
  - point data can be interpolated locally
  - city/state aggregates should not be treated as precise point fields

Success criteria:
- `unified_grid.parquet` exposes data quality instead of hiding it.

## 4. Label Generation Redesign

Files:
- `processing/label_generator.py`

Observed issues:
- Current labels are built from a weighted formula over the same input features
  the model later sees.
- Synthetic perturbations on crime, hospital distance, and emergency score are
  directly baked into the target.
- This creates leakage and overly optimistic metrics.

Required changes:
- Remove formula-derived `base_danger` labels as the primary target source.
- Build labels from independent outcomes, for example:
  - future incident counts in the same cell over a defined horizon
  - future severity-weighted incident rates
  - future emergency events or hazard occurrences
- Use features from time `t` to predict outcomes in a later window:
  - `t + 1h`
  - `t + 6h`
  - `t + 24h`
  - or another chosen production horizon
- If independent outcome labels are not available for all tasks, keep a
  heuristic score only as a temporary baseline, not as the main model target.
- If synthetic augmentation is still needed, separate it clearly from true
  labels and limit how much it can dominate the data distribution.

Success criteria:
- `safety_score_target` is not a restatement of the same feature recipe used by
  the model.

## 5. Training and Evaluation Fixes

Files:
- `training/train_safety_scorer.py`
- `models/safety_scorer/metadata.json`

Observed issues:
- Current metrics are likely inflated by target construction.
- Random split on synthetic temporal variants can leak nearby or nearly
  identical samples across train/val/test.

Required changes:
- Use stronger splits:
  - geographic holdout by grid cells or regions
  - temporal holdout by time window
  - or both
- Track metrics by:
  - safe locations
  - urban locations
  - rural locations
  - known high-risk locations
- Add sanity tests:
  - safer hospital access should not reduce score
  - worsening weather should not improve score
  - lower incident exposure should not reduce score
- Re-check feature importance after retraining.
- Compare model output against a baseline heuristic instead of only reporting
  train/val/test regression metrics.

Success criteria:
- Validation performance remains believable under stronger holdouts.

## 6. Suggested Order of Work

1. Fix `ingest_crime.py`.
2. Fix `ingest_aqi.py`.
3. Audit and improve `ingest_health.py`, `ingest_accidents.py`,
   `ingest_water.py`, and `ingest_noise.py`.
4. Add quality gates in `merge_sources.py`.
5. Rebuild `data/processed`.
6. Re-audit processed feature distributions.
7. Rewrite `label_generator.py` around independent outcome labels.
8. Rebuild `data/training`.
9. Retrain `train_safety_scorer.py`.
10. Validate with geographic and temporal holdouts plus known-location checks.

## 7. Minimum Done Definition Before Retraining

Do not retrain until all of these are true:

- key ingestors pass schema and coverage checks
- processed features are not mostly defaults
- sparse aggregate sources are no longer treated as precise point fields
- labels are built from independent outcomes
- train/val/test splits avoid obvious leakage
- sanity checks on known locations make sense

## 8. First Files To Edit

Start here:
- `ingestion/ingest_crime.py`
- `ingestion/ingest_aqi.py`
- `processing/merge_sources.py`
- `processing/label_generator.py`

These four files will change the outcome of retraining the most.
