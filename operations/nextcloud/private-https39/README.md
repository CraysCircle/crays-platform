# Nextcloud collaboration private HTTPS39 source

These two unchanged original source files describe the narrowly scoped HTTPS addition for the existing private collaboration ingress. They are operating source, separate from Nextcloud application code and the already existing HTTP routes.

| File | Responsibility |
| --- | --- |
| [collab-https.append.exact](collab-https.append.exact) | The exact additional site block for collab-test.crays.pro, bound to 172.26.0.1 and reusing the existing internal CA. It routes Whiteboard, Talk, Office and the remaining collaboration requests to the existing private upstreams. |
| [apply_existing_private_collab_https39.candidate.py](apply_existing_private_collab_https39.candidate.py) | Original reviewed-candidate controller with exact source/configuration pins, root-instance and process-generation fences, an existing-inode compare-and-swap, same-container stop/start and a separately requested rollback phase. |

The [source capture](source-capture.json) records exact original bytes, SHA-256, original modes and the controller's three qualified-source dependencies. The two original files retain their bytes and original read-only capture modes. Git stores these as non-executable source files.

## Required surrounding source and protected inputs

The controller references the qualified reopen23 controller, physical-container helper and ingress program by exact SHA-256. Their bodies are not included by this two-file capture and must not be assumed available from these two files alone. Its full frozen Caddy preimage/candidate and Root's execution review are separately protected operating inputs; they are deliberately not published here. The controller verifies that the candidate is exactly the frozen preimage plus the published append.

The original source requires explicit execution approval, phase and same-container approval, verifies the current generation, preserves the existing disabled admin API, and reuses the existing internal CA. It is not a generic installation command. Source publication grants no permission to execute either apply or rollback.

## Scope and verification

The source intent is to add only this private HTTPS route while retaining original HTTP routing and other site/identity boundaries. This capture parsed the Python AST, checked both exact source hashes and independently reviewed the two bodies for credentials, private keys and user data. Approved technical private addresses and hostname remain unchanged.

No controller, Caddy command, container, browser or product operation was executed by this capture. The code's checks and stated preservation intent are not a claim that an application or rollback has happened. Native browser/customer acceptance remains separate, and no full dependency/recovery or blanket license/rights conclusion is made.

See the [Nextcloud integration guide](../../../docs/services/nextcloud.md) for application responsibilities. Original component terms and notices remain applicable; no new blanket license is assigned by publication.
