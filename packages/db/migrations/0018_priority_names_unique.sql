-- Two priorities may not share a name, whatever the case: the default ones never do.
CREATE UNIQUE INDEX "priorities_name_unique" ON "priorities" USING btree (lower("name"));
