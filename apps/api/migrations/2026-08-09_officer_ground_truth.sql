-- Officer ground-truth capture — 2026-08-09
--
-- Why: every VargBot evaluation to date is domain-level, because nothing in the
-- system ever recorded what the correct LEAF category was. And "did the officer
-- accept the AI's SNP recommendation?" could only be approximated after the fact
-- by re-scoring, which drifts as new match rows accumulate.
--
-- These columns turn each NSIC review into a durable gold label:
--   * leaf-level classification ground truth (the gap in every eval so far)
--   * expert MSE->SNP relevance labels (currently heuristic, self-generated)
--
-- Safe to re-run: every statement is IF NOT EXISTS and every column is nullable,
-- so existing rows and all current write paths are unaffected.
--
-- Apply against Supabase (Mumbai) before deploying the matching API build.

BEGIN;

-- ── classification_results: what the officer says the answer really was ──
ALTER TABLE classification_results
    ADD COLUMN IF NOT EXISTS predicted_category VARCHAR(40),
    ADD COLUMN IF NOT EXISTS officer_verdict    VARCHAR(20),
    ADD COLUMN IF NOT EXISTS officer_domain     VARCHAR(20),
    ADD COLUMN IF NOT EXISTS officer_category   VARCHAR(40),
    ADD COLUMN IF NOT EXISTS officer_note       TEXT,
    ADD COLUMN IF NOT EXISTS corrected_by       VARCHAR(100),
    ADD COLUMN IF NOT EXISTS corrected_at       TIMESTAMP;

COMMENT ON COLUMN classification_results.predicted_category IS
    'Leaf the chain settled on; also inside top3_predictions, denormalised so '
    'leaf-level accuracy is a query rather than a JSON parse.';
COMMENT ON COLUMN classification_results.officer_verdict IS
    'confirmed | corrected — NSIC officer verdict on the AI prediction.';

-- Only verified rows are gold labels, so index the verified subset.
CREATE INDEX IF NOT EXISTS ix_classification_officer_verdict
    ON classification_results (officer_verdict)
    WHERE officer_verdict IS NOT NULL;

-- ── mses: what the AI actually recommended at allocation time ───────────
ALTER TABLE mses
    ADD COLUMN IF NOT EXISTS recommended_snp_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_mses_recommended_snp'
    ) THEN
        ALTER TABLE mses
            ADD CONSTRAINT fk_mses_recommended_snp
            FOREIGN KEY (recommended_snp_id) REFERENCES snps (id);
    END IF;
END $$;

COMMENT ON COLUMN mses.recommended_snp_id IS
    'SNP the AI put in front of the officer at allocation time. Compared with '
    'assigned_snp_id this gives a true accept/override label instead of the '
    'post-hoc top-score approximation used by the drift monitor.';

COMMIT;
