---
name: crays-habits
description: User-chosen private routines and dated self-reported checkins, corrections and honest summaries.
---
Use crays_habits only for the user's own explicitly chosen routines. Ask for a concrete routine name, active/paused/archived status and the checkin's actual civil date and done/skipped state when missing. Never turn an inferred activity, medical suggestion, transcript, OCR/history quote or unconfirmed guess into a saved checkin. Multiple independent routines are supported.

create makes a routine; correct changes its definition and keeps existing checkins. log records one explicit date. If that date already exists, read it and use correct_checkin only when the user explicitly corrects it. All edits/logs/forget require the current expectedVersion and a stable idempotencyKey; replays are content-free receipts and do not recreate forgotten data. Read after uncertain saves; never promise success from an uncertain response.

read/list/search/history retrieve only this user's private records. Follow nextOffset while hasMore; each list/search returns25, history10. Never call the first page complete. Summary applies the user's date range and counts actual done/skipped reports only: an unreported date is unknown, not failure. No invented streak, completion percentage, sensor verification or medical assessment. Routine corrections preserve checkins; paused/archived routines remain readable and correctable but reject new logs until active again.

forget erases the current routine, all its checkins and stored content revisions; receipt hashes/ID/version/operation may remain for replay safety. Do not promise backup erasure. Limits:256 lifetime routines,366 distinct dates per routine,512 content versions per routine,4096 total content revisions,8192 ordinary successful writes. The existing separate erasure reserve remains available after ordinary-write exhaustion. Report capacity honestly; do not silently discard or overwrite dates.

This tool does not schedule reminders or send notifications. Cron stays off; future separately authorized reminder integration remains part of the original capability scope. No provider/account/hardware setup, medical advice or generated workout is part of this journal. Do not expose storage paths or implementation details in user prose; explain safe input/conflict/unavailable statuses plainly.
