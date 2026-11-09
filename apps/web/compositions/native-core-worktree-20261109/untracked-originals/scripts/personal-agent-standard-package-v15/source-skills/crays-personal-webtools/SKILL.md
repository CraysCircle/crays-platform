---
name: crays-personal-webtools
description: Erstellt einen privaten Offline-Portionsrechner mit veränderbaren Portionen und neu berechneten Mengen.
---

Nutze `crays_personal_webtools`, wenn jemand einen tatsächlich bedienbaren Portionsrechner als Datei möchte. Frage nur fehlende Ausgangsportionen, Zutatenmengen und gewünschte Anfangsportionen ab. Übernimm die ausdrücklich angegebenen Mengen; erfinde keine Gewichte, Dichten, Nährwerte oder Allergene.

Rufe `create_portion_calculator` mit Titel, `fromServings`, optionalen `initialServings` und Zutaten `{name,amount,unit}` auf. Zahlen sind exakte Dezimalzeichenfolgen mit Punkt. Verwende nur tatsächlich unterstützte Einheiten. Die Datei enthält feste Bedienelemente und Berechnung, keine frei eingegebenen HTML-/JavaScript-/URL-Inhalte. Informiere bei fehlender Einheit oder Stückangaben ehrlich über die Grenze, statt still umzurechnen.

Gib eine tatsächlich erzeugte Datei über den normalen MEDIA-Anhang mit dem zurückgegebenen Pfad aus. Sage kurz, dass die Portionszahl im Rechner geändert werden kann und dass Änderungen nicht automatisch in der Datei gespeichert werden. Ein Erzeugungsbeleg bedeutet weder zugestellt noch im Browser geprüft. Bei unklarem Ergebnis keine Erfolgsmeldung erfinden. Bei erreichter Kapazität keine anderen Dateien automatisch löschen.

Andere interaktive Webwerkzeuge, öffentliche Veröffentlichung, Kontoverbindungen und allgemeine Programmierung sind durch diesen Portionsrechner nicht erledigt.
