---
name: crays-pantry
description: Eigene Vorräte und Chargen mit Mengen, Verbrauch und bekannten Ablaufdaten führen.
---

Nutze crays_pantry für ausdrücklich mitgeteilte Vorräte dieser Person. Frage nur nach fehlenden nötigen Angaben: welches Produkt, welche Menge und Einheit, und bei mehreren passenden Chargen welche Packung gemeint ist. Ablaufdatum ist optional und bleibt bei fehlender Angabe unbekannt. Verwechsle ein Datum auf der Packung nicht mit überprüfter Frische oder Lebensmittelsicherheit.

Produkte können gleich heißen. Suche zuerst und wähle anhand des tatsächlichen Ergebnisses die eindeutige Produkt- und Chargen-ID. Neue Packungen werden eigene Chargen; ein Verbrauch ändert nur die gewählte Charge. Ein Bestand ist ausschließlich der Saldo der hier erfassten Angaben. Ohne gemeldeten Verbrauch keine vollständige aktuelle Bestandskenntnis behaupten.

Mengen exakt umrechnen: g und kg gehören zusammen, ml und l gehören zusammen; Stück bleibt Stück. Niemals Gramm und Milliliter über eine vermutete Dichte umrechnen. Intern nutzt quantity.minorUnits tausendstel der angegebenen g/kg/ml/l-Einheit; pcs nutzt ganze Stück. Beispiele: 1kg = minorUnits1000 mit unit kg; 250g = minorUnits250000 mit unit g; 2Stück = minorUnits2 mit unit pcs. Diese Werkzeugdarstellung bleibt intern. Ungenaue oder nicht passende Einheiten freundlich klären.

Für Käufe oder einen neu gemeldeten Vorrat eine Charge anlegen; für Teilverbrauch consume nutzen. Bei ausdrücklich korrigiertem Zählstand correct_batch verwenden, auch für null. Ein rechnerisch negativer Bestand ist ein Fehler, keine Aufforderung eine andere Charge automatisch aufzubrauchen. Abgelehnte Änderungen nicht als gespeichert melden.

Nach einer bestätigten Änderung die tatsächlich zurückgegebene Menge nennen. Einen wiederholten Auftrag mit demselben Vorgangsschlüssel erneut prüfen, nicht doppelt abbuchen. Nach unklarem Speicherausgang erst den realen Bestand lesen. Aktuelle Versionen und interne IDs aus Werkzeugergebnissen verwenden, technische Schlüssel nicht als Nutzeranforderung darstellen.

Eine Ablaufübersicht zeigt bekannte fällige Chargen und unbekannte Datumsfelder getrennt. Daraus weder automatische Entsorgung noch gesundheitliche Empfehlungen ableiten. Vor Vergessen klären, ob die einzelne Packung oder das Produkt samt allen Chargen gemeint ist. Keine Bestellungen, Kontoanbindungen, automatischen Verbrauchsbuchungen oder ungefragten Löschungen. Bei Kapazitäts- oder Berechtigungsfehlern den tatsächlichen Ausfall knapp erklären; keine internen Pfade oder technischen Schutzdetails ausgeben.
