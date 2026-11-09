# Neon → RDS: gesicherte Migrationswerkzeuge

Dieses Verzeichnis sichert zwölf ausgewählte Originalprogramme der laufenden Datenbankmigration: Nachweisaufbereitung und -vergleich, Abschlussklassifizierung, Fingerprint-Adapter sowie die Owner01-Transport- und Mapping-Werkzeuge. Es ergänzt die gemeinsamen Betriebsquellen in diesem bestehenden Repository.

## Orientierung

| Verzeichnis | Inhalt |
| --- | --- |
| selected-proof/work04 | Ausgewählte Nachweise, Metadatenleser, Klassifizierung und Abschlussprotokoll |
| final-delta | Vergleich des letzten Datenstands und Adapter des ursprünglichen Fingerprint-Formats |
| owner01/atomic-transport02 | Umschlag, geschützte Zugangsdatenverwaltung, Operationen und Gastprogramm |
| original-fingerprint | Ursprünglicher Fingerprint-Quelltext |
| SOURCE_EXPORT.json | Original- und Exportprüfsummen, Dateigrößen, Herkunft und erforderliche Bindungskennungen |
| materialize_sources.py | Lokale Wiederherstellung und Prüfung der ursprünglichen Dateibytes |

Zusätzlich sind die [vier Original30-Vorbereitungsquellen](original30-grantee-preparation-revision02/README.md) unverändert gesichert: 52.167 Bytes für dreißig technische NOLOGIN-ACL-Rollen und die zugehörige Orchestrierung. Ihre [eigene AGPL-3.0-only-Freigabe von CRAYS AG](original30-grantee-preparation-revision02/LICENSING.md) gilt nur für diese vier Fassungen. Sie ändert weder die zwölf zuvor gesicherten Programme noch deren Lizenzgrenzen und belegt keine SQL-Ausführung, LOGIN-/Authentifizierungsparität, Freigabe angebundener Anwendungen oder Restore-Abnahme.

## Originale und öffentliche Vorlagen

Sechs Programme sind unverändert enthalten. Sechs weitere liegen als .py.in vor: feste Prüfsummen geschützter Nachweis-, Freigabe- oder anderer Betriebsbindungen wurden durch benannte Platzhalter ersetzt. Mindestens eine dieser Konstanten identifiziert eine private Nachweisbibliothek. Die übrigen noch nicht abschließend klassifizierten Konstanten bleiben vorsorglich ebenfalls außerhalb dieses öffentlichen Exports.

Die Algorithmen bleiben erhalten. Der öffentliche Export ist bei diesen sechs Dateien ausdrücklich **nicht bytegleich mit dem Original**. SOURCE_EXPORT.json führt für jede Datei sowohl den ursprünglichen als auch den exportierten SHA-256-Wert auf. Mit den sieben separat verwahrten Bindungswerten wurde die Wiederherstellung aller zwölf Originale ohne Ausführung der Programme bytegenau geprüft.

Geschützte Kataloge, Datenbankinhalte, Schema-Dumps, Rollen-Vorzustände, Zugangsdaten und private Nachweisbibliotheken sind nicht enthalten. Originaldateien und laufende Systeme wurden durch diese Sicherung nicht verändert.

## Wiederherstellung

Python 3 genügt für das Wiederherstellungswerkzeug. Die separat geschützte JSON-Datei hat die Form eines Objekts mit dem Feld bindings; darin stehen die sieben Kennungen aus SOURCE_EXPORT.json mit ihren ursprünglichen Werten. Sie darf weder in diesem Repository noch in einem anderen Git-Arbeitsverzeichnis abgelegt werden. Ihre Dateirechte müssen den Zugriff auf den Eigentümer beschränken.

    python3 materialize_sources.py --bindings /geschuetzter-ort/source-bindings.private.json --output /geschuetzter-ort/wiederhergestellte-quellen

Das Zielverzeichnis darf noch nicht existieren und muss außerhalb von Git liegen. Das Werkzeug prüft zuerst alle exportierten und rekonstruierten Dateien, schreibt anschließend mit geschützten Dateirechten und führt kein Migrationsprogramm aus. Die genannten Originalprogramme dürfen nicht als allgemeine Startanleitung verstanden werden: ihre absoluten Arbeitsverzeichnisse, privaten Eingaben und Freigaben gehören zu einer bestimmten historischen Migrationssituation.

## Voraussetzungen und Grenzen

Die Migrationsprogramme verwenden Python-Standardbibliothek und teilweise boto3/botocore; der Fingerprint-Quelltext und seine Abhängigkeiten sind anhand des Codes zu prüfen. Eine vollständig aufgelöste und gesicherte Abhängigkeitskette liegt hier noch nicht vor. Unter anderem fehlen referenzierte ältere Umschlag-Erzeuger, Projektionswerkzeuge und die gesondert zu prüfenden SQL-Operationsquellen. Private Schema-Dumps sind keine nachzureichenden öffentlichen Quelltexte.

Der Quellstand wurde statisch geprüft und die Rekonstruktion getestet. Kein Migrationsprogramm, Datenbankzugriff oder Cloud-Workflow wurde dabei gestartet. Der verwaltete RDS-Engine-Stand und ein temporäres PostgreSQL-Client-Image sind getrennte Laufzeitnachweise; sie belegen keinen aus diesem Verzeichnis gebauten Server.

## Lizenz und Herkunft

Die Herkunft ist dateiweise im Manifest dokumentiert. Diese Sicherung vergibt keine pauschale neue Lizenz und ersetzt keine vorhandenen Rechte. Für die übernommenen internen Programme sind ursprüngliche Urheberschaft, etwaige externe Vorlagen und eine ausdrückliche Weiterverwendungslizenz noch nicht vollständig belegt. Lizenztexte und Herkunftsnachweise zu den konkret verwendeten Abhängigkeiten bleiben ebenfalls nachzuführen. Damit ist weder eine vollständige rechtliche Freigabe noch die vollständige Wiederherstellbarkeit der gesamten Datenbankmigration behauptet.
