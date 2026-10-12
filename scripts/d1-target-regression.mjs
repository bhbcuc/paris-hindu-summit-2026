import assert from "node:assert/strict"

import {
  isProductionDatabase,
  stripSqlComments,
} from "./d1-target.mjs"

// stripSqlComments: the migration runner sends this form to `cf d1 query`.
assert.equal(
  stripSqlComments("-- leading comment\nCREATE TABLE t (id TEXT);\n-- trailing"),
  "\nCREATE TABLE t (id TEXT);\n"
)
assert.equal(
  stripSqlComments("SELECT 1; /* block\ncomment */ SELECT 2;"),
  "SELECT 1;   SELECT 2;"
)
assert.equal(
  stripSqlComments("INSERT INTO t (a) VALUES ('not -- a comment');"),
  "INSERT INTO t (a) VALUES ('not -- a comment');"
)
assert.equal(
  stripSqlComments('SELECT "weird -- col" FROM t;'),
  'SELECT "weird -- col" FROM t;'
)
assert.equal(
  stripSqlComments("SELECT 'it''s -- kept';"),
  "SELECT 'it''s -- kept';"
)

// Production refusal: every write script gates on these before touching D1.
assert.equal(isProductionDatabase("summit-db"), true)
assert.equal(isProductionDatabase("b9d39325-0be9-4e4b-a935-2d39b6f6512b"), true)
assert.equal(isProductionDatabase("summit-db-dev"), false)
assert.equal(isProductionDatabase("63367dc8-c973-41b2-95ab-a93472fe48a8"), false)

console.log("D1 target regression checks passed.")
