-- Issue search. fold_text() is the one definition of "ignoring case and accents", shared by
-- containsText() (packages/db/src/search.ts), the search vector of issues and the trigram index
-- on their titles. Immutable, so that a generated column and an index may use it: changing it
-- means rebuilding both in a new migration. Accented letters are folded before lower(), which
-- lowers ASCII only on some collations.
--
-- pg_trgm ships with PostgreSQL and is trusted: the owner of the database may create it.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE FUNCTION fold_text(value text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  RETURN lower(translate(
    value,
    'àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
    'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY'
  ));
