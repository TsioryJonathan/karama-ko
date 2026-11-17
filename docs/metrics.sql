-- Anonymous counters: one row per day, kind and name. Nothing about who, nothing typed by the visitor.
-- Kinds and names come from a fixed list (server/metrics.mjs, VOCABULARY).
CREATE TABLE IF NOT EXISTS metrics (
  day   date   NOT NULL,
  kind  text   NOT NULL,
  name  text   NOT NULL,
  count bigint NOT NULL DEFAULT 0,
  ms    bigint NOT NULL DEFAULT 0,  -- total time of the answered assistant questions, to average
  PRIMARY KEY (day, kind, name)
);
