# Notices for selected Chuck dependency inputs

The table records license declarations in the captured installed package manifests. The linked original texts and in-source attributions remain authoritative for their respective portions; a package declaration does not replace nested notices. No CRAYS AGPL grant is applied to these third-party files.

| Package | Version | Declared license | Preserved original texts |
|---|---|---|---|
| pg | 8.22.0 | MIT | [LICENSE](packages/pg/8.22.0/LICENSE), [README.md](packages/pg/8.22.0/README.md) |
| pg-cloudflare | 1.4.0 | MIT | [LICENSE](packages/pg-cloudflare/1.4.0/LICENSE), [README.md](packages/pg-cloudflare/1.4.0/README.md) |
| pg-connection-string | 2.14.0 | MIT | [LICENSE](packages/pg-connection-string/2.14.0/LICENSE), [README.md](packages/pg-connection-string/2.14.0/README.md) |
| pg-int8 | 1.0.1 | ISC | [LICENSE](packages/pg-int8/1.0.1/LICENSE), [README.md](packages/pg-int8/1.0.1/README.md) |
| pg-pool | 3.14.0 | MIT | [LICENSE](packages/pg-pool/3.14.0/LICENSE), [README.md](packages/pg-pool/3.14.0/README.md) |
| pg-protocol | 1.15.0 | MIT | [LICENSE](packages/pg-protocol/1.15.0/LICENSE), [README.md](packages/pg-protocol/1.15.0/README.md) |
| pg-types | 2.2.0 | MIT | [README.md](packages/pg-types/2.2.0/README.md) |
| pgpass | 1.0.5 | MIT | [README.md](packages/pgpass/1.0.5/README.md) |
| postgres-array | 2.0.0 | MIT | [license](packages/postgres-array/2.0.0/license), [readme.md](packages/postgres-array/2.0.0/readme.md) |
| postgres-bytea | 1.0.1 | MIT | [license](packages/postgres-bytea/1.0.1/license), [readme.md](packages/postgres-bytea/1.0.1/readme.md) |
| postgres-date | 1.0.7 | MIT | [license](packages/postgres-date/1.0.7/license), [readme.md](packages/postgres-date/1.0.7/readme.md) |
| postgres-interval | 1.2.0 | MIT | [license](packages/postgres-interval/1.2.0/license), [readme.md](packages/postgres-interval/1.2.0/readme.md) |
| split2 | 4.2.0 | ISC | [LICENSE](packages/split2/4.2.0/LICENSE), [README.md](packages/split2/4.2.0/README.md) |
| xtend | 4.0.2 | MIT | [LICENSE](packages/xtend/4.0.2/LICENSE), [README.md](packages/xtend/4.0.2/README.md) |

The PostgreSQL 9.2.4 port attribution in [pg/lib/utils.js](packages/pg/8.22.0/lib/utils.js) is retained with the exact upstream [PostgreSQL COPYRIGHT](notices/postgresql/9.2.4/COPYRIGHT). This supplement comes from PostgreSQL tag REL9_2_4, commit 73c122769ca1f49c451e315d476c80fdcf9f20cc. The pg MIT notice remains alongside it. The original pg-connection-string copyright/MIT header and split2 inline ISC notice are unchanged. The pg-types and pgpass README files contain their original MIT notices.

The [empty compile input](compile-inputs/server-only/empty.js) contains no implementation. Its preservation establishes neither a new server-only license grant nor closure of any separate package-license question.
