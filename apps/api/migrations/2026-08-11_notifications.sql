-- In-app notifications for MSE owners — 2026-08-11
--
-- Why: every event that changes an enterprise's standing is triggered by
-- someone else (an NSIC officer approves, allocates; the classifier finishes).
-- The owner had no channel for any of it. Concretely: MSE 5030 has been
-- approved AND allocated since 2026-07-08 and its Certificate of ONDC
-- Onboarding Allocation has been available that whole time — nothing ever
-- told the owner, and no page linked there from the enterprise side.
--
-- Titles and bodies are stored rather than derived so a notification stays a
-- faithful record of what the owner was told at that moment.
--
-- Safe to re-run: IF NOT EXISTS throughout.

BEGIN;

CREATE TABLE IF NOT EXISTS notifications (
    id          SERIAL PRIMARY KEY,
    mse_id      INTEGER      NOT NULL REFERENCES mses (id),
    event       VARCHAR(40)  NOT NULL,
    title_en    VARCHAR(200) NOT NULL,
    title_hi    VARCHAR(200),
    body_en     TEXT,
    body_hi     TEXT,
    href        VARCHAR(200),
    is_read     BOOLEAN      NOT NULL DEFAULT FALSE,
    read_at     TIMESTAMP,
    created_at  TIMESTAMP    DEFAULT NOW()
);

COMMENT ON TABLE notifications IS
    'Enterprise-facing in-app notifications. One row per event an MSE owner '
    'needs to know about; copy is denormalised so history is not rewritten.';
COMMENT ON COLUMN notifications.event IS
    'registration_approved | registration_rejected | snp_allocated | '
    'classification_complete | action_needed';
COMMENT ON COLUMN notifications.href IS
    'In-app destination only (e.g. /certificate) — never an external URL.';

-- The bell polls "my unread, newest first" on every portal page load, so the
-- index matches that query shape exactly.
CREATE INDEX IF NOT EXISTS ix_notifications_mse_created
    ON notifications (mse_id, created_at DESC);

-- Unread badge count: a partial index keeps it cheap as read rows accumulate.
CREATE INDEX IF NOT EXISTS ix_notifications_unread
    ON notifications (mse_id)
    WHERE is_read = FALSE;

-- RLS deny-all to match every other table; the backend owner connection
-- bypasses it, and nothing else should ever read another enterprise's mail.
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

COMMIT;
