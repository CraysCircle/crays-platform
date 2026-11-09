---
name: crays-document-exports
description: Create a requested private TXT, CSV, XLSX, PPTX, PDF, DOCX or EPUB file and attach the real result to the current conversation.
---

Use crays_document_exports when the person explicitly asks for a file. Keep their meaning and language. Ask only when a missing choice materially changes the result; an editable document normally suits DOCX, a printable document PDF, a typed table XLSX or CSV, and a presentation PPTX. Check that the deployed tool actually supports the requested format; instructions alone do not install it.

Use only the fields for that format:
- TXT: format and text.
- CSV/XLSX: format, typed rows and optional string headers. Keep numbers and booleans typed. Formula-like strings remain literal text; this exporter does not create active formulas.
- PPTX: format, title and slides, each with title and bullet strings. Use concise readable sections; long accepted content may continue on additional slides.
- PDF: format, text and optional title. This is text-only output, not HTML/URL rendering or editing an existing PDF.
- DOCX: format, title and paragraphs, an array of plain strings. Preserve paragraph order and empty paragraphs. CRLF/CR line endings normalize to LF. This creates a new text-only Word document; it does not edit templates or embed images.
- EPUB: format, title, author, language, modifiedAt (actual UTC timestamp), rights, sources and chapters; resources are optional. Use only the person's own content or content they are authorized to use. Supply rights.declaration as OWN_OR_AUTHORIZED only when that basis is established, plus an accurate rights.statement. Do not invent an author, permission or source. Sources have title and reference as literal provenance. Chapters have title and paragraphs, with optional imageIds referring to supplied resources. Resources have id, mimeType (image/png or image/jpeg), bytesBase64 and meaningful alt text. Include only actual authorized image bytes, never an external image URL. The tool checks its supported restricted PNG/baseline-JPEG subset. Do not remove or bypass DRM.

Respect the actual schema and bounds: common titles at most100characters; each file at most1MiB. PDF text at most16384characters/256lines; DOCX1–256paragraphs, each at most8000characters and total256KiBUTF8. PPTX at most12inputslides,8bullets each,160characters perbullet. EPUB permits1–64chapters,1–256paragraphs perchapter,8000characters perparagraph and256KiBUTF8 chaptertext; at most16images/256KiB each/512KiB total and32sources. Resource bytes must match actual authorized images and every supplied resource must be referenced. Preserve chapter order, paragraphs, Unicode, metadata and source/rights declarations. Actual opening or visual layout in a particular EPUB reader is unproven. Do not silently discard content to meet a limit: split the requested work into sensible files or explain the specific limit.

Never pass paths, filesystem roots, recipients, accounts, HTML, template bytes, image objects outside the exact EPUB resource schema, macros, commands, provider settings or writer options. Source URLs may remain literal text; they are not fetch instructions or active links. Use other authorized tools for research or calculation before creating the file when needed.

Only after the tool actually succeeds, attach MEDIA:<exact returned path> on its own assistant-final line outside code fences. Use only the file returned by this invocation and only the current authorized conversation. Do not call message/send, invent a download URL, add a trust flag or claim delivery from creation alone. No external upload or automatic archive registration.

Give the person a short natural description. Do not expose internal paths, hashes, configuration, tool names or roadmap details in prose. If generation or attachment fails, state that plainly and offer a supported alternative; do not claim the file or delivery succeeded. Visual Word/PowerPoint layout and richer document editing are separate outcomes, not guaranteed by a valid file.
