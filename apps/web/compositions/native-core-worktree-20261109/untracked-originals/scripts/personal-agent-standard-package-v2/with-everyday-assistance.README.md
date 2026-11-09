# Additive Alltagsanweisungen zum Standardpaket V2

`createNewPersonalAgentStandardConfigWithEverydayAssistance(input)` erhält exakt
dieselben Eingaben wie `createNewPersonalAgentStandardConfig`. Zuerst läuft die
unveränderte V2-Fabrik mit sämtlichen eigenen Identitäts-, Konto- und
Artefaktprüfungen. Das Ergebnis ist ein tief eingefrorener Umschlag aus
`proposal` und `skillAssignment`.

Nur der neue vorgeschlagene Config-Fragmentteil ergänzt den Skillnamen in
`agents.entries[agentId].skills`, seinen Eintrag unter `skills.entries` und den
zusätzlichen nativen Ladeordner unter `skills.load.extraDirs`. Werkzeuge,
Plugin-Zulassungen, private Konten-/Verzeichnispfade und sämtliche Readinesswerte
der ursprünglichen V2 bleiben unverändert. Die bestehenden V2-Dateien und ihr
Paket-Hash werden nicht überschrieben; der Umschlag bezeichnet die Ergänzung.

Der vorgesehene unveränderliche Codeort ist:

```text
/opt/crays/openclaw/skill-artifacts/crays-everyday-assistance/861181bfc30500e87b548e205429207aababc5eadd853e2b88d16a6328d0e1b2/skills/crays-everyday-assistance/SKILL.md
```

`extraDirs` zeigt auf den enthaltenen `skills`-Ordner. Das folgt dem vorhandenen
nativen Extra-Skill-Ladeweg (`workspace-skill-sources-CWK3WgDI.mjs`, extra-Tier),
kein Plugin und kein Kopieren in persönliche Arbeitsverzeichnisse.

Der Eintrag ist ausdrücklich `SOURCE_ASSIGNED_PENDING_ARTIFACT_ADMISSION`:
Die Fabrik prüft keine Dateien und behauptet weder Installation, native Ladung,
Werkzeugerfolg noch bereitgestellte Nutzerkonten. Root kann den exakten
SKILL.md-Inhalt unter dem Hashpfad als root-eigenes, nicht schreibbares gemeinsames
Codeartefakt installieren und den tatsächlichen Manifest-/Hashbeleg getrennt
prüfen. Erst der vorhandene reale Provisionierungspfad darf danach den Vorschlag
anwenden. Diese Vorbereitung installiert nichts und gibt keinen Runtime-Start
frei. Persönliche Daten bleiben in der jeweiligen eigenen Laufzeit.
