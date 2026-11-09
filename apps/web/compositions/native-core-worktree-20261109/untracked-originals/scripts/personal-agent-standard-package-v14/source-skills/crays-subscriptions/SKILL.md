---
name: crays-subscriptions
description: Eigene laufende Abos und ausdrücklich genannte Fristen privat überblicken.
---

Nutze crays_subscriptions für ausdrücklich selbst berichtete Abos. Frage nach Name, genauem Preis/Währung, Zahlungsintervall und nächstem bekannten Zahlungstag. Speichere Beträge als ganze kleinste Währungseinheiten: EUR/USD/GBP/CHF/CAD/AUD/NZD zwei Nachkommastellen, JPY keine, BHD drei. Rechne Währungen nicht zusammen. Kein Konto, Postfach, Bankzugang, Zahlungsauftrag oder Anbieterzugriff ist damit verbunden.

Unterscheide einen ausdrücklich gemeldeten nächsten Zahlungstag oder Kündigungstermin (upcoming) von errechneten Folgeterminen (schedule). Für Monat/Jahr verlangt die Tagesregel eine ausdrückliche Auswahl: day_of_month hält den ursprünglichen Tag fest und klemmt ihn in kurzen Monaten; month_end nimmt nach dem ersten gemeldeten Termin das jeweilige Monatsende. Bei Jahrestag 29.Februar wird in Nichtschaltjahren 28.Februar angesetzt, im nächsten Schaltjahr wieder29.Februar. Das sind Kalenderprojektionen, keine Bestätigung einer Abbuchung oder rechtlichen Frist. Erfinde keine Konditionen oder Fristen.

create/correct speichern die gemeldeten Daten; list/search/read/history zeigen aktuelle/alte Einträge. Änderungen und forget brauchen die aktuelle Version, Schreibaufrufe einen stabilen Idempotenzschlüssel. upcoming berücksichtigt alle aktiven Einträge und liefert paginierte ausdrücklich gemeldete Termine; schedule betrifft genau ein Abo, maximal366Tage und100Termine, hasMore beachten. Pausierte und gekündigte Abos bleiben sichtbar, werden aber nicht als aktiv abgerechnet. Keine automatischen Erinnerungen werden eingerichtet.

forget löscht den aktuellen Inhalt und die gespeicherten Revisionen. Behaupte keine Löschung von Sicherungen. Technische IDs/Versionen nur für Werkzeugaufrufe verwenden; in Nutzerantworten verständliche Namen, Daten und Beträge zeigen. Niemals Datenbanken, Dateipfade, Technologie, Zugangsdaten oder technische Fehler offenlegen. Kein Finanzrat, keine tatsächliche Kündigung und keine Zahlung.

Der Betrag totalForReturnedDatesMinorUnits ist ausschließlich die Summe der tatsächlich zurückgegebenen Projektionstermine. Bei hasMore=true ist er ausdrücklich eine Teilsumme und niemals als vollständige Monats-, Jahres- oder Gesamtbelastung darzustellen. Upcoming nennt nur gemeldete Termine; schedule berechnet davon getrennte mögliche Folgetermine.
