# Chuck private-custody uploader source

This archive preserves the exact operative Python source for a bounded four-file RAM uploader. It provides the transport logic for review and recovery, alongside an [exact source map](source-capture.json) and a [file-scoped AGPL-3.0-only grant from CRAYS AG](LICENSING.md). The original source comments and technical constants are unchanged.

When separately configured and executed, the program reads four protected files into RAM, validates one bounded official regional S3 upload request received through stdin, and reports transport status without printing private bodies or hashes. Its source names technical target paths and protocol fields. No actual target contents, private custody metadata, signed URLs, credentials, environment values or Auth0 observations are included.

Restore the source using the original pathname and whole-file hash in the capture map. This archive preserves the uploader code; it does not prove that the four private payloads are recoverable or that an upload/runtime operation was executed. The publication task does not run, import or install this program.

The [license scope](license-scope.json) covers this exact own-code file, excluding Python standard-library implementations and protected inputs. The [full GNU AGPL version 3](LICENSE) is included unchanged. Recipients retain their license rights to run, modify and redistribute the software; access to CRAYS private infrastructure and data requires separate authorization.
