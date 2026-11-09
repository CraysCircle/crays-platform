export type CommunityLocale = "en" | "de" | "es" | "ca" | "fr" | "pt" | "it";
export type CommunityBlock = { kicker: string; title: string; body: string };
export type CommunityCopy = {
  meta: { title: string; description: string };
  hero: { eyebrow: string; title: string; body: string; primary: string; secondary: string; strap: string };
  modes: CommunityBlock[];
  layer: { eyebrow: string; title: string; body: string; features: CommunityBlock[] };
  rhythm: { eyebrow: string; title: string; body: string; stages: CommunityBlock[] };
  community: { eyebrow: string; title: string; body: string; modes: CommunityBlock[] };
  hosted: { eyebrow: string; title: string; body: string; features: CommunityBlock[] };
  global: { eyebrow: string; title: string; body: string; features: CommunityBlock[] };
  closing: { eyebrow: string; title: string; body: string; primary: string; secondary: string };
  blocked: string; blockedDetail: string; credits: string;
};

const en: CommunityCopy = {
  meta: { title: "Community Life | CRAYS Club", description: "CRAYS Club Community Life connects work, living, culture and global citizenship inside real-world club spaces." },
  hero: {
    eyebrow: "Community Life",
    title: "A real-world circle for people who build, move and belong.",
    body: "CRAYS Club Community Life turns clubs, homes, workspaces, dinners, events and digital access into one daily rhythm: focused when you need it, social when it matters, global without losing the local feeling.",
    primary: "Become a Member", secondary: "Explore the rhythm",
    strap: "Work. Live. Play. Belong. One social layer that makes a city easier to enter and harder to leave."
  },
  modes: [
    { kicker: "01", title: "Work", body: "Focus, meetings, builder energy and useful introductions." },
    { kicker: "02", title: "Live", body: "Comfort, service, routines and places that feel less temporary." },
    { kicker: "03", title: "Play", body: "Dinners, wellness, music, creator moments and hosted culture." },
    { kicker: "04", title: "Belong", body: "Local trust, global access and a community that remembers you." }
  ],
  layer: {
    eyebrow: "The community layer", title: "A CRAYS Club is built for the whole day, not for one isolated use case.",
    body: "Community Life connects the practical and emotional sides of global living. A member should be able to arrive in a city, find a productive base, meet the right people, join a hosted moment and feel part of a local circle before the week is over.",
    features: [
      { kicker: "Useful fast", title: "Workspace and orientation", body: "Workspace, contacts, services, local orientation and trusted access." },
      { kicker: "Hosted by design", title: "A human face", body: "Dinners, talks, sports, wellness and introductions with a human face." },
      { kicker: "Digital continuity", title: "Carry context across places", body: "Profile, bookings, preferences, membership and invitations carry across places." },
      { kicker: "Local responsibility", title: "Add value locally", body: "Global citizens should add value to the neighborhoods they enter." }
    ]
  },
  rhythm: {
    eyebrow: "One connected rhythm", title: "The room changes through the day, but the CRAYS Club feeling stays consistent.",
    body: "Morning focus, afternoon connection and evening belonging should not feel like separate products. The same identity, service logic and community layer connects each moment.",
    stages: [
      { kicker: "Morning", title: "Focus", body: "Deep work, calls, coffee, quiet zones and practical support." },
      { kicker: "Afternoon", title: "Connect", body: "Meetings, introductions, local context, brand partners and project energy." },
      { kicker: "Evening", title: "Belong", body: "Dinners, music, wellness, hosted formats and shared memories." }
    ]
  },
  community: {
    eyebrow: "Community modes", title: "Four modes make the experience easy to understand and rich enough to return to.",
    body: "The strongest community pages do not explain endlessly. They show the daily logic clearly. CRAYS Club can speak to founders, travelers, creators, villa guests and local members through the same four-mode language.",
    modes: [
      { kicker: "Work", title: "Create and collaborate", body: "Focused rooms, desks, teams, calls and project days." },
      { kicker: "Live", title: "Stay with rhythm", body: "Homes, lounges, service and routines for longer movement." },
      { kicker: "Play", title: "Culture gives memory", body: "Events, dinners, health, music, creators and local rituals." },
      { kicker: "Global Citizen", title: "Access with responsibility", body: "Freedom, democracy, sustainability and respect for real places." }
    ]
  },
  hosted: {
    eyebrow: "Hosted culture", title: "People return when the room has a social reason to exist.",
    body: "Community Life is not decoration around real estate. It is the demand layer. Dinners, talks, wellness, creator formats, member nights and local rituals make people show up, meet and come back.",
    features: [
      { kicker: "Curated introductions", title: "Useful and warm connections", body: "Hosts turn strangers into useful, warm and relevant connections." },
      { kicker: "Repeat formats", title: "Reliable rituals", body: "Weekly and monthly rituals make the community predictable without feeling stale." },
      { kicker: "Creator energy", title: "Attention and culture", body: "Artists, founders and media people bring attention and culture into the room." },
      { kicker: "Partner value", title: "Live inside real moments", body: "Brands live inside real moments instead of only buying attention online." }
    ]
  },
  global: {
    eyebrow: "Global citizen", title: "Global access should create better local behavior.",
    body: "CRAYS Club keeps values inside the experience: freedom, democratic culture, respect, sustainability and community standards. Belonging is not only a feeling. It is also how members behave inside the places they enter.",
    features: [
      { kicker: "Cognitive", title: "Understand", body: "Understand cities, systems and the people behind them." },
      { kicker: "Social", title: "Meet", body: "Meet across cultures with curiosity, respect and presence." },
      { kicker: "Practical", title: "Act", body: "Turn values into events, local projects and shared standards." }
    ]
  },
  closing: {
    eyebrow: "Community Life", title: "CRAYS Club is not a place people pass through. It is a circle people return to.",
    body: "The community layer is where work, living, culture and global belonging become one daily experience. Palma de Mallorca starts the physical version, and CRAYS Club carries the feeling into every next city.",
    primary: "Become a Member", secondary: "Contact CRAYS Club"
  },
  blocked: "Media held back", blockedDetail: "Unproven people, event or place imagery remains hidden until source, context and publication rights are verified.", credits: "Media credits and rights notes"
};

const de: CommunityCopy = {
  meta: { title: "Community Life | CRAYS Club", description: "CRAYS Club Community Life verbindet Arbeit, Wohnen, Kultur und globale Verantwortung in realen Clubräumen." },
  hero: { eyebrow: "Community Life", title: "Ein realer Kreis für Menschen, die bauen, sich bewegen und dazugehören.", body: "CRAYS Club Community Life verbindet Clubs, Zuhause, Workspaces, Dinner, Events und digitalen Zugang in einem Tagesrhythmus: fokussiert, wenn nötig, sozial, wenn es zählt, global ohne das lokale Gefühl zu verlieren.", primary: "Mitglied werden", secondary: "Rhythmus entdecken", strap: "Arbeiten. Leben. Spielen. Dazugehören. Eine soziale Ebene, die eine Stadt leichter zugänglich und schwerer zu verlassen macht." },
  modes: [
    { kicker: "01", title: "Arbeiten", body: "Fokus, Meetings, Builder-Energie und nützliche Begegnungen." },
    { kicker: "02", title: "Leben", body: "Komfort, Service, Routinen und Orte, die weniger vorübergehend wirken." },
    { kicker: "03", title: "Spielen", body: "Dinner, Wellness, Musik, Creator-Momente und gehostete Kultur." },
    { kicker: "04", title: "Dazugehören", body: "Lokales Vertrauen, globaler Zugang und eine Community, die sich erinnert." }
  ],
  layer: { eyebrow: "Die Community-Ebene", title: "Ein CRAYS Club ist für den ganzen Tag gebaut, nicht für einen isolierten Use Case.", body: "Community Life verbindet praktische und emotionale Seiten globalen Lebens. Mitglieder sollen ankommen, eine produktive Basis finden, passende Menschen treffen, einen gehosteten Moment erleben und noch in derselben Woche Teil eines lokalen Kreises werden.", features: [
    { kicker: "Schnell nützlich", title: "Workspace und Orientierung", body: "Workspace, Kontakte, Services, lokale Orientierung und vertrauensvoller Zugang." },
    { kicker: "Bewusst gehostet", title: "Ein menschliches Gesicht", body: "Dinner, Talks, Sport, Wellness und Begegnungen mit menschlichem Gesicht." },
    { kicker: "Digitale Kontinuität", title: "Kontext reist mit", body: "Profil, Buchungen, Präferenzen, Mitgliedschaft und Einladungen reisen zwischen Orten." },
    { kicker: "Lokale Verantwortung", title: "Lokal Wert schaffen", body: "Globale Bürger sollen den Vierteln, die sie betreten, Wert geben." }
  ] },
  rhythm: { eyebrow: "Ein verbundener Rhythmus", title: "Der Raum verändert sich im Tagesverlauf, das CRAYS Club Gefühl bleibt.", body: "Morgenfokus, Nachmittagsverbindung und Abendzugehörigkeit sind keine getrennten Produkte. Identität, Servicelogik und Community-Ebene verbinden jeden Moment.", stages: [
    { kicker: "Morgen", title: "Fokus", body: "Deep Work, Calls, Kaffee, ruhige Zonen und praktische Hilfe." },
    { kicker: "Nachmittag", title: "Verbinden", body: "Meetings, Begegnungen, lokaler Kontext, Brand Partner und Projektenergie." },
    { kicker: "Abend", title: "Dazugehören", body: "Dinner, Musik, Wellness, gehostete Formate und gemeinsame Erinnerungen." }
  ] },
  community: { eyebrow: "Community Modes", title: "Vier Modi machen das Erlebnis verständlich und reich genug, um zurückzukehren.", body: "Starke Community-Seiten erklären nicht endlos, sondern zeigen die Tageslogik. CRAYS Club spricht mit derselben Vier-Modi-Sprache zu Gründern, Reisenden, Kreativen, Villengästen und lokalen Mitgliedern.", modes: [
    { kicker: "Work", title: "Gestalten und kooperieren", body: "Fokusräume, Desks, Teams, Calls und Projekttage." },
    { kicker: "Live", title: "Mit Rhythmus wohnen", body: "Zuhause, Lounges, Service und Routinen für längere Bewegung." },
    { kicker: "Play", title: "Kultur schafft Erinnerung", body: "Events, Dinner, Gesundheit, Musik, Kreative und lokale Rituale." },
    { kicker: "Global Citizen", title: "Zugang mit Verantwortung", body: "Freiheit, Demokratie, Nachhaltigkeit und Respekt für reale Orte." }
  ] },
  hosted: { eyebrow: "Gehostete Kultur", title: "Menschen kehren zurück, wenn der Raum einen sozialen Grund hat.", body: "Community Life ist keine Dekoration um Immobilien. Es ist die Nachfrageschicht. Dinner, Talks, Wellness, Creator-Formate, Member Nights und lokale Rituale bringen Menschen zusammen und zurück.", features: [
    { kicker: "Kuratierte Begegnungen", title: "Nützlich und warm", body: "Hosts machen aus Fremden nützliche, warme und relevante Verbindungen." },
    { kicker: "Wiederkehrende Formate", title: "Verlässliche Rituale", body: "Wöchentliche und monatliche Rituale sind vorhersehbar, ohne alt zu wirken." },
    { kicker: "Creator-Energie", title: "Aufmerksamkeit und Kultur", body: "Künstler, Gründer und Medienmenschen bringen Aufmerksamkeit und Kultur in den Raum." },
    { kicker: "Partnerwert", title: "In realen Momenten leben", body: "Brands leben in realen Momenten statt nur online Aufmerksamkeit zu kaufen." }
  ] },
  global: { eyebrow: "Global Citizen", title: "Globaler Zugang soll besseres lokales Verhalten schaffen.", body: "CRAYS Club hält Werte im Erlebnis: Freiheit, demokratische Kultur, Respekt, Nachhaltigkeit und Community-Standards. Zugehörigkeit ist auch das Verhalten der Mitglieder in den Orten, die sie betreten.", features: [
    { kicker: "Kognitiv", title: "Verstehen", body: "Städte, Systeme und die Menschen dahinter verstehen." },
    { kicker: "Sozial", title: "Begegnen", body: "Kulturübergreifend mit Neugier, Respekt und Präsenz begegnen." },
    { kicker: "Praktisch", title: "Handeln", body: "Werte in Events, lokale Projekte und gemeinsame Standards übersetzen." }
  ] },
  closing: { eyebrow: "Community Life", title: "CRAYS Club ist kein Ort zum Durchreisen. Es ist ein Kreis, zu dem Menschen zurückkehren.", body: "In der Community-Ebene werden Arbeit, Wohnen, Kultur und globale Zugehörigkeit zu einem Tageserlebnis. Palma de Mallorca startet die physische Version, und CRAYS Club trägt das Gefühl in jede nächste Stadt.", primary: "Mitglied werden", secondary: "CRAYS Club kontaktieren" },
  blocked: "Medium zurückgehalten", blockedDetail: "Unbelegte Personen-, Event- oder Ortsbilder bleiben bis zur Prüfung von Quelle, Kontext und Rechten verborgen.", credits: "Mediennachweise und Rechtenotizen"
};

const es: CommunityCopy = {
  meta: { title: "Community Life | CRAYS Club", description: "CRAYS Club Community Life conecta trabajo, vida, cultura y ciudadanía global en espacios reales de club." },
  hero: { eyebrow: "Community Life", title: "Un círculo real para personas que construyen, se mueven y pertenecen.", body: "CRAYS Club Community Life convierte clubes, hogares, espacios de trabajo, cenas, eventos y acceso digital en un ritmo diario: concentrado cuando lo necesitas, social cuando importa y global sin perder la sensación local.", primary: "Hazte miembro", secondary: "Explora el ritmo", strap: "Trabaja. Vive. Juega. Pertenece. Una capa social que hace una ciudad más fácil de conocer y más difícil de dejar." },
  modes: [
    { kicker: "01", title: "Trabajar", body: "Concentración, reuniones, energía builder y presentaciones útiles." },
    { kicker: "02", title: "Vivir", body: "Comodidad, servicio, rutinas y lugares que se sienten menos temporales." },
    { kicker: "03", title: "Jugar", body: "Cenas, bienestar, música, momentos creator y cultura anfitriona." },
    { kicker: "04", title: "Pertenecer", body: "Confianza local, acceso global y una comunidad que te recuerda." }
  ],
  layer: { eyebrow: "La capa de comunidad", title: "CRAYS Club está pensado para todo el día, no para un solo caso de uso.", body: "Community Life conecta los lados práctico y emocional de la vida global. Un miembro debe poder llegar a una ciudad, encontrar una base productiva, conocer a las personas adecuadas, participar en un momento guiado y sentirse parte de un círculo local antes de terminar la semana.", features: [
    { kicker: "Útil desde el principio", title: "Workspace y orientación", body: "Espacio de trabajo, contactos, servicios, orientación local y acceso de confianza." },
    { kicker: "Guiado por diseño", title: "Un rostro humano", body: "Cenas, charlas, deporte, bienestar y presentaciones con un rostro humano." },
    { kicker: "Continuidad digital", title: "Lleva el contexto contigo", body: "Perfil, reservas, preferencias, membresía e invitaciones viajan entre lugares." },
    { kicker: "Responsabilidad local", title: "Aporta valor local", body: "Los ciudadanos globales deben aportar valor a los barrios que visitan." }
  ] },
  rhythm: { eyebrow: "Un ritmo conectado", title: "La sala cambia durante el día, pero la sensación CRAYS Club se mantiene.", body: "La concentración de la mañana, la conexión de la tarde y la pertenencia de la noche no deben sentirse como productos separados. La misma identidad, lógica de servicio y capa de comunidad conecta cada momento.", stages: [
    { kicker: "Mañana", title: "Concentrarse", body: "Trabajo profundo, llamadas, café, zonas tranquilas y apoyo práctico." },
    { kicker: "Tarde", title: "Conectar", body: "Reuniones, presentaciones, contexto local, marcas colaboradoras y energía de proyecto." },
    { kicker: "Noche", title: "Pertenecer", body: "Cenas, música, bienestar, formatos guiados y recuerdos compartidos." }
  ] },
  community: { eyebrow: "Modos de comunidad", title: "Cuatro modos hacen la experiencia fácil de entender y suficientemente rica para volver.", body: "Las mejores páginas de comunidad no explican sin fin. Muestran con claridad la lógica diaria. CRAYS Club puede hablar a founders, viajeros, creators, huéspedes de villas y miembros locales mediante el mismo lenguaje de cuatro modos.", modes: [
    { kicker: "Work", title: "Crear y colaborar", body: "Salas de concentración, escritorios, equipos, llamadas y jornadas de proyecto." },
    { kicker: "Live", title: "Vivir con ritmo", body: "Hogares, lounges, servicio y rutinas para movimientos más largos." },
    { kicker: "Play", title: "La cultura crea memoria", body: "Eventos, cenas, salud, música, creators y rituales locales." },
    { kicker: "Global Citizen", title: "Acceso con responsabilidad", body: "Libertad, democracia, sostenibilidad y respeto por lugares reales." }
  ] },
  hosted: { eyebrow: "Cultura anfitriona", title: "Las personas vuelven cuando la sala tiene una razón social para existir.", body: "Community Life no es decoración alrededor del sector inmobiliario. Es la capa de demanda. Cenas, charlas, bienestar, formatos creator, noches de miembros y rituales locales hacen que las personas aparezcan, se conozcan y vuelvan.", features: [
    { kicker: "Presentaciones curadas", title: "Conexiones útiles y cercanas", body: "Los hosts convierten desconocidos en conexiones útiles, cercanas y relevantes." },
    { kicker: "Formatos recurrentes", title: "Rituales fiables", body: "Los rituales semanales y mensuales hacen la comunidad predecible sin volverla monótona." },
    { kicker: "Energía creator", title: "Atención y cultura", body: "Artistas, founders y personas de medios llevan atención y cultura a la sala." },
    { kicker: "Valor para marcas", title: "Vivir dentro de momentos reales", body: "Las marcas viven dentro de momentos reales en lugar de comprar solo atención online." }
  ] },
  global: { eyebrow: "Ciudadanía global", title: "El acceso global debe crear un mejor comportamiento local.", body: "CRAYS Club mantiene los valores dentro de la experiencia: libertad, cultura democrática, respeto, sostenibilidad y estándares de comunidad. Pertenecer no es solo una sensación. También es cómo se comportan los miembros en los lugares a los que llegan.", features: [
    { kicker: "Cognitivo", title: "Comprender", body: "Comprender ciudades, sistemas y las personas que hay detrás." },
    { kicker: "Social", title: "Conocer", body: "Encontrarse entre culturas con curiosidad, respeto y presencia." },
    { kicker: "Práctico", title: "Actuar", body: "Convertir valores en eventos, proyectos locales y estándares compartidos." }
  ] },
  closing: { eyebrow: "Community Life", title: "CRAYS Club no es un lugar de paso. Es un círculo al que las personas vuelven.", body: "La capa de comunidad es donde trabajo, vida, cultura y pertenencia global se convierten en una experiencia diaria. Palma de Mallorca inicia la versión física, y CRAYS Club lleva la sensación a cada nueva ciudad.", primary: "Hazte miembro", secondary: "Contacta con CRAYS Club" },
  blocked: "Medio retenido", blockedDetail: "Las imágenes no verificadas de personas, eventos o lugares permanecen ocultas hasta confirmar fuente, contexto y derechos de publicación.", credits: "Créditos y notas de derechos"
};

const ca: CommunityCopy = {
  meta: { title: "Community Life | CRAYS Club", description: "CRAYS Club Community Life connecta treball, vida, cultura i ciutadania global en espais reals de club." },
  hero: { eyebrow: "Community Life", title: "Un cercle real per a persones que construeixen, es mouen i pertanyen.", body: "CRAYS Club Community Life converteix clubs, llars, espais de treball, sopars, esdeveniments i accés digital en un ritme diari: concentrat quan cal, social quan importa i global sense perdre la sensació local.", primary: "Fes-te membre", secondary: "Explora el ritme", strap: "Treballa. Viu. Juga. Pertany. Una capa social que fa una ciutat més fàcil d'entendre i més difícil de deixar." },
  modes: [
    { kicker: "01", title: "Treballar", body: "Concentració, reunions, energia builder i presentacions útils." },
    { kicker: "02", title: "Viure", body: "Comoditat, servei, rutines i llocs que se senten menys temporals." },
    { kicker: "03", title: "Jugar", body: "Sopars, benestar, música, moments creator i cultura amfitriona." },
    { kicker: "04", title: "Pertànyer", body: "Confiança local, accés global i una comunitat que et recorda." }
  ],
  layer: { eyebrow: "La capa de comunitat", title: "CRAYS Club està pensat per a tot el dia, no per a un sol cas d'ús.", body: "Community Life connecta les dimensions pràctica i emocional de la vida global. Un membre ha de poder arribar a una ciutat, trobar una base productiva, conèixer les persones adequades, participar en un moment guiat i sentir-se part d'un cercle local abans d'acabar la setmana.", features: [
    { kicker: "Útil de seguida", title: "Workspace i orientació", body: "Espai de treball, contactes, serveis, orientació local i accés de confiança." },
    { kicker: "Guiat per disseny", title: "Una cara humana", body: "Sopars, xerrades, esport, benestar i presentacions amb una cara humana." },
    { kicker: "Continuïtat digital", title: "Porta el context entre llocs", body: "Perfil, reserves, preferències, membresia i invitacions viatgen entre llocs." },
    { kicker: "Responsabilitat local", title: "Aporta valor local", body: "Els ciutadans globals han d'aportar valor als barris on arriben." }
  ] },
  rhythm: { eyebrow: "Un ritme connectat", title: "La sala canvia durant el dia, però la sensació CRAYS Club es manté.", body: "La concentració del matí, la connexió de la tarda i la pertinença del vespre no s'han de sentir com productes separats. La mateixa identitat, lògica de servei i capa de comunitat connecta cada moment.", stages: [
    { kicker: "Matí", title: "Concentrar-se", body: "Treball profund, trucades, cafè, zones tranquil·les i suport pràctic." },
    { kicker: "Tarda", title: "Connectar", body: "Reunions, presentacions, context local, marques col·laboradores i energia de projecte." },
    { kicker: "Vespre", title: "Pertànyer", body: "Sopars, música, benestar, formats guiats i records compartits." }
  ] },
  community: { eyebrow: "Modes de comunitat", title: "Quatre modes fan l'experiència fàcil d'entendre i prou rica per tornar-hi.", body: "Les millors pàgines de comunitat no expliquen sense fi. Mostren clarament la lògica diària. CRAYS Club pot parlar a founders, viatgers, creators, hostes de vil·les i membres locals amb el mateix llenguatge de quatre modes.", modes: [
    { kicker: "Work", title: "Crear i col·laborar", body: "Sales de concentració, escriptoris, equips, trucades i jornades de projecte." },
    { kicker: "Live", title: "Viure amb ritme", body: "Llars, lounges, servei i rutines per a moviments més llargs." },
    { kicker: "Play", title: "La cultura crea memòria", body: "Esdeveniments, sopars, salut, música, creators i rituals locals." },
    { kicker: "Global Citizen", title: "Accés amb responsabilitat", body: "Llibertat, democràcia, sostenibilitat i respecte pels llocs reals." }
  ] },
  hosted: { eyebrow: "Cultura amfitriona", title: "La gent torna quan la sala té una raó social per existir.", body: "Community Life no és decoració al voltant del sector immobiliari. És la capa de demanda. Sopars, xerrades, benestar, formats creator, nits de membres i rituals locals fan que la gent vingui, es conegui i torni.", features: [
    { kicker: "Presentacions curades", title: "Connexions útils i properes", body: "Els hosts converteixen desconeguts en connexions útils, properes i rellevants." },
    { kicker: "Formats recurrents", title: "Rituals fiables", body: "Els rituals setmanals i mensuals fan la comunitat previsible sense fer-la monòtona." },
    { kicker: "Energia creator", title: "Atenció i cultura", body: "Artistes, founders i persones de mitjans porten atenció i cultura a la sala." },
    { kicker: "Valor per a marques", title: "Viure dins de moments reals", body: "Les marques viuen dins de moments reals en lloc de comprar només atenció en línia." }
  ] },
  global: { eyebrow: "Ciutadania global", title: "L'accés global ha de crear un millor comportament local.", body: "CRAYS Club manté els valors dins de l'experiència: llibertat, cultura democràtica, respecte, sostenibilitat i estàndards de comunitat. Pertànyer no és només una sensació. També és com es comporten els membres als llocs on arriben.", features: [
    { kicker: "Cognitiu", title: "Entendre", body: "Entendre ciutats, sistemes i les persones que hi ha al darrere." },
    { kicker: "Social", title: "Conèixer", body: "Trobar-se entre cultures amb curiositat, respecte i presència." },
    { kicker: "Pràctic", title: "Actuar", body: "Convertir valors en esdeveniments, projectes locals i estàndards compartits." }
  ] },
  closing: { eyebrow: "Community Life", title: "CRAYS Club no és un lloc de pas. És un cercle al qual la gent torna.", body: "La capa de comunitat és on treball, vida, cultura i pertinença global es converteixen en una experiència diària. Palma de Mallorca inicia la versió física, i CRAYS Club porta la sensació a cada ciutat següent.", primary: "Fes-te membre", secondary: "Contacta amb CRAYS Club" },
  blocked: "Mitjà retingut", blockedDetail: "Les imatges no verificades de persones, esdeveniments o llocs resten ocultes fins a confirmar font, context i drets de publicació.", credits: "Crèdits i notes de drets"
};

const fr: CommunityCopy = {
  meta: { title: "Community Life | CRAYS Club", description: "CRAYS Club Community Life relie travail, vie, culture et citoyenneté mondiale dans de vrais espaces de club." },
  hero: { eyebrow: "Community Life", title: "Un cercle réel pour celles et ceux qui construisent, bougent et appartiennent.", body: "CRAYS Club Community Life transforme clubs, logements, espaces de travail, dîners, événements et accès numérique en un rythme quotidien: concentré quand il le faut, social quand cela compte, mondial sans perdre le sentiment local.", primary: "Devenir membre", secondary: "Explorer le rythme", strap: "Travailler. Vivre. Jouer. Appartenir. Une couche sociale qui rend une ville plus facile à rejoindre et plus difficile à quitter." },
  modes: [
    { kicker: "01", title: "Travailler", body: "Concentration, réunions, énergie builder et introductions utiles." },
    { kicker: "02", title: "Vivre", body: "Confort, service, routines et lieux qui paraissent moins temporaires." },
    { kicker: "03", title: "Jouer", body: "Dîners, bien-être, musique, moments creator et culture accueillie." },
    { kicker: "04", title: "Appartenir", body: "Confiance locale, accès mondial et communauté qui se souvient de vous." }
  ],
  layer: { eyebrow: "La couche communautaire", title: "CRAYS Club est conçu pour toute la journée, pas pour un usage isolé.", body: "Community Life relie les dimensions pratiques et émotionnelles de la vie mondiale. Un membre doit pouvoir arriver dans une ville, trouver une base productive, rencontrer les bonnes personnes, rejoindre un moment animé et se sentir membre d'un cercle local avant la fin de la semaine.", features: [
    { kicker: "Utile rapidement", title: "Workspace et orientation", body: "Espace de travail, contacts, services, orientation locale et accès de confiance." },
    { kicker: "Accueilli par conception", title: "Un visage humain", body: "Dîners, discussions, sport, bien-être et introductions avec un visage humain." },
    { kicker: "Continuité numérique", title: "Emporter le contexte", body: "Profil, réservations, préférences, adhésion et invitations voyagent entre les lieux." },
    { kicker: "Responsabilité locale", title: "Créer de la valeur locale", body: "Les citoyens du monde doivent apporter de la valeur aux quartiers qu'ils rejoignent." }
  ] },
  rhythm: { eyebrow: "Un rythme connecté", title: "La salle change au fil de la journée, mais le sentiment CRAYS Club reste cohérent.", body: "La concentration du matin, la connexion de l'après-midi et l'appartenance du soir ne doivent pas sembler être des produits distincts. La même identité, la même logique de service et la même couche communautaire relient chaque moment.", stages: [
    { kicker: "Matin", title: "Se concentrer", body: "Travail approfondi, appels, café, zones calmes et soutien pratique." },
    { kicker: "Après-midi", title: "Se connecter", body: "Réunions, introductions, contexte local, marques associées et énergie de projet." },
    { kicker: "Soir", title: "Appartenir", body: "Dîners, musique, bien-être, formats animés et souvenirs partagés." }
  ] },
  community: { eyebrow: "Modes communautaires", title: "Quatre modes rendent l'expérience facile à comprendre et assez riche pour y revenir.", body: "Les meilleures pages communautaires n'expliquent pas sans fin. Elles montrent clairement la logique quotidienne. CRAYS Club peut parler aux founders, voyageurs, creators, hôtes de villas et membres locaux avec le même langage en quatre modes.", modes: [
    { kicker: "Work", title: "Créer et collaborer", body: "Salles de concentration, bureaux, équipes, appels et journées de projet." },
    { kicker: "Live", title: "Vivre avec un rythme", body: "Logements, salons, services et routines pour des mouvements plus longs." },
    { kicker: "Play", title: "La culture crée la mémoire", body: "Événements, dîners, santé, musique, creators et rituels locaux." },
    { kicker: "Global Citizen", title: "Accès responsable", body: "Liberté, démocratie, durabilité et respect des lieux réels." }
  ] },
  hosted: { eyebrow: "Culture accueillie", title: "Les personnes reviennent quand la salle a une raison sociale d'exister.", body: "Community Life n'est pas une décoration autour de l'immobilier. C'est la couche de demande. Dîners, discussions, bien-être, formats creator, soirées de membres et rituels locaux font venir, rencontrer et revenir les personnes.", features: [
    { kicker: "Introductions choisies", title: "Connexions utiles et chaleureuses", body: "Les hosts transforment des inconnus en connexions utiles, chaleureuses et pertinentes." },
    { kicker: "Formats récurrents", title: "Rituels fiables", body: "Les rituels hebdomadaires et mensuels rendent la communauté prévisible sans la rendre figée." },
    { kicker: "Énergie creator", title: "Attention et culture", body: "Artistes, founders et professionnels des médias apportent attention et culture dans la salle." },
    { kicker: "Valeur pour les marques", title: "Vivre dans des moments réels", body: "Les marques vivent dans des moments réels plutôt que d'acheter seulement de l'attention en ligne." }
  ] },
  global: { eyebrow: "Citoyenneté mondiale", title: "L'accès mondial doit produire de meilleurs comportements locaux.", body: "CRAYS Club garde les valeurs au coeur de l'expérience: liberté, culture démocratique, respect, durabilité et normes communautaires. Appartenir n'est pas seulement un sentiment. C'est aussi la manière dont les membres se comportent dans les lieux qu'ils rejoignent.", features: [
    { kicker: "Cognitif", title: "Comprendre", body: "Comprendre les villes, les systèmes et les personnes qui les font vivre." },
    { kicker: "Social", title: "Rencontrer", body: "Se rencontrer entre cultures avec curiosité, respect et présence." },
    { kicker: "Pratique", title: "Agir", body: "Transformer les valeurs en événements, projets locaux et normes partagées." }
  ] },
  closing: { eyebrow: "Community Life", title: "CRAYS Club n'est pas un lieu de passage. C'est un cercle auquel les personnes reviennent.", body: "La couche communautaire est l'endroit où travail, vie, culture et appartenance mondiale deviennent une expérience quotidienne. Palma de Mallorca lance la version physique, et CRAYS Club transporte ce sentiment dans chaque prochaine ville.", primary: "Devenir membre", secondary: "Contacter CRAYS Club" },
  blocked: "Média retenu", blockedDetail: "Les images non vérifiées de personnes, d'événements ou de lieux restent masquées jusqu'à validation de la source, du contexte et des droits de publication.", credits: "Crédits médias et notes de droits"
};

const pt: CommunityCopy = {
  meta: { title: "Community Life | CRAYS Club", description: "CRAYS Club Community Life liga trabalho, vida, cultura e cidadania global em espaços reais de clube." },
  hero: { eyebrow: "Community Life", title: "Um círculo real para pessoas que constroem, se movem e pertencem.", body: "CRAYS Club Community Life transforma clubes, casas, espaços de trabalho, jantares, eventos e acesso digital num ritmo diário: focado quando precisa, social quando importa e global sem perder a sensação local.", primary: "Torne-se membro", secondary: "Explore o ritmo", strap: "Trabalhe. Viva. Jogue. Pertença. Uma camada social que torna uma cidade mais fácil de conhecer e mais difícil de deixar." },
  modes: [
    { kicker: "01", title: "Trabalhar", body: "Foco, reuniões, energia builder e apresentações úteis." },
    { kicker: "02", title: "Viver", body: "Conforto, serviço, rotinas e lugares que parecem menos temporários." },
    { kicker: "03", title: "Jogar", body: "Jantares, bem-estar, música, momentos creator e cultura com anfitrião." },
    { kicker: "04", title: "Pertencer", body: "Confiança local, acesso global e uma comunidade que se lembra de si." }
  ],
  layer: { eyebrow: "A camada de comunidade", title: "CRAYS Club foi criado para o dia inteiro, não para um caso de uso isolado.", body: "Community Life liga os lados prático e emocional da vida global. Um membro deve poder chegar a uma cidade, encontrar uma base produtiva, conhecer as pessoas certas, participar num momento orientado e sentir-se parte de um círculo local antes de a semana terminar.", features: [
    { kicker: "Útil rapidamente", title: "Workspace e orientação", body: "Espaço de trabalho, contactos, serviços, orientação local e acesso de confiança." },
    { kicker: "Recebido por design", title: "Um rosto humano", body: "Jantares, conversas, desporto, bem-estar e apresentações com um rosto humano." },
    { kicker: "Continuidade digital", title: "Leve o contexto entre lugares", body: "Perfil, reservas, preferências, membresia e convites acompanham os lugares." },
    { kicker: "Responsabilidade local", title: "Crie valor local", body: "Os cidadãos globais devem criar valor nos bairros onde entram." }
  ] },
  rhythm: { eyebrow: "Um ritmo ligado", title: "A sala muda ao longo do dia, mas a sensação CRAYS Club permanece.", body: "O foco da manhã, a ligação da tarde e a pertença da noite não devem parecer produtos separados. A mesma identidade, lógica de serviço e camada de comunidade liga cada momento.", stages: [
    { kicker: "Manhã", title: "Foco", body: "Trabalho profundo, chamadas, café, zonas silenciosas e apoio prático." },
    { kicker: "Tarde", title: "Conectar", body: "Reuniões, apresentações, contexto local, marcas associadas e energia de projeto." },
    { kicker: "Noite", title: "Pertencer", body: "Jantares, música, bem-estar, formatos orientados e memórias partilhadas." }
  ] },
  community: { eyebrow: "Modos de comunidade", title: "Quatro modos tornam a experiência fácil de entender e suficientemente rica para regressar.", body: "As melhores páginas de comunidade não explicam sem fim. Mostram claramente a lógica diária. CRAYS Club pode falar com founders, viajantes, creators, hóspedes de villas e membros locais através da mesma linguagem de quatro modos.", modes: [
    { kicker: "Work", title: "Criar e colaborar", body: "Salas de foco, secretárias, equipas, chamadas e dias de projeto." },
    { kicker: "Live", title: "Viver com ritmo", body: "Casas, lounges, serviço e rotinas para movimentos mais longos." },
    { kicker: "Play", title: "A cultura cria memória", body: "Eventos, jantares, saúde, música, creators e rituais locais." },
    { kicker: "Global Citizen", title: "Acesso com responsabilidade", body: "Liberdade, democracia, sustentabilidade e respeito por lugares reais." }
  ] },
  hosted: { eyebrow: "Cultura com anfitrião", title: "As pessoas regressam quando a sala tem uma razão social para existir.", body: "Community Life não é decoração em torno de imobiliário. É a camada de procura. Jantares, conversas, bem-estar, formatos creator, noites de membros e rituais locais fazem as pessoas aparecer, conhecer-se e voltar.", features: [
    { kicker: "Apresentações curadas", title: "Ligações úteis e calorosas", body: "Os hosts transformam desconhecidos em ligações úteis, calorosas e relevantes." },
    { kicker: "Formatos recorrentes", title: "Rituais fiáveis", body: "Rituais semanais e mensais tornam a comunidade previsível sem a tornar repetitiva." },
    { kicker: "Energia creator", title: "Atenção e cultura", body: "Artistas, founders e pessoas dos media levam atenção e cultura para a sala." },
    { kicker: "Valor para marcas", title: "Viver em momentos reais", body: "As marcas vivem dentro de momentos reais em vez de apenas comprarem atenção online." }
  ] },
  global: { eyebrow: "Cidadania global", title: "O acesso global deve criar melhor comportamento local.", body: "CRAYS Club mantém os valores dentro da experiência: liberdade, cultura democrática, respeito, sustentabilidade e padrões de comunidade. Pertencer não é apenas um sentimento. É também a forma como os membros se comportam nos lugares onde entram.", features: [
    { kicker: "Cognitivo", title: "Compreender", body: "Compreender cidades, sistemas e as pessoas por trás deles." },
    { kicker: "Social", title: "Conhecer", body: "Encontrar-se entre culturas com curiosidade, respeito e presença." },
    { kicker: "Prático", title: "Agir", body: "Transformar valores em eventos, projetos locais e padrões partilhados." }
  ] },
  closing: { eyebrow: "Community Life", title: "CRAYS Club não é um lugar de passagem. É um círculo ao qual as pessoas regressam.", body: "A camada de comunidade é onde trabalho, vida, cultura e pertença global se tornam uma experiência diária. Palma de Mallorca inicia a versão física, e CRAYS Club leva a sensação para cada cidade seguinte.", primary: "Torne-se membro", secondary: "Contacte CRAYS Club" },
  blocked: "Media retido", blockedDetail: "Imagens não verificadas de pessoas, eventos ou lugares permanecem ocultas até confirmar fonte, contexto e direitos de publicação.", credits: "Créditos e notas de direitos"
};

const it: CommunityCopy = {
  meta: { title: "Community Life | CRAYS Club", description: "CRAYS Club Community Life collega lavoro, vita, cultura e cittadinanza globale in veri spazi di club." },
  hero: { eyebrow: "Community Life", title: "Un cerchio reale per chi costruisce, si muove e appartiene.", body: "CRAYS Club Community Life trasforma club, case, spazi di lavoro, cene, eventi e accesso digitale in un ritmo quotidiano: concentrato quando serve, sociale quando conta e globale senza perdere la sensazione locale.", primary: "Diventa membro", secondary: "Esplora il ritmo", strap: "Lavora. Vivi. Gioca. Appartieni. Un livello sociale che rende una città più facile da conoscere e più difficile da lasciare." },
  modes: [
    { kicker: "01", title: "Lavorare", body: "Concentrazione, riunioni, energia builder e presentazioni utili." },
    { kicker: "02", title: "Vivere", body: "Comfort, servizio, routine e luoghi che sembrano meno temporanei." },
    { kicker: "03", title: "Giocare", body: "Cene, benessere, musica, momenti creator e cultura ospitata." },
    { kicker: "04", title: "Appartenere", body: "Fiducia locale, accesso globale e una community che si ricorda di te." }
  ],
  layer: { eyebrow: "Il livello community", title: "CRAYS Club è progettato per l'intera giornata, non per un singolo caso d'uso.", body: "Community Life collega gli aspetti pratici ed emotivi della vita globale. Un membro dovrebbe poter arrivare in una città, trovare una base produttiva, incontrare le persone giuste, partecipare a un momento guidato e sentirsi parte di un cerchio locale prima della fine della settimana.", features: [
    { kicker: "Subito utile", title: "Workspace e orientamento", body: "Spazio di lavoro, contatti, servizi, orientamento locale e accesso fidato." },
    { kicker: "Ospitato per scelta", title: "Un volto umano", body: "Cene, talk, sport, benessere e presentazioni con un volto umano." },
    { kicker: "Continuità digitale", title: "Porta il contesto tra luoghi", body: "Profilo, prenotazioni, preferenze, membership e inviti viaggiano tra i luoghi." },
    { kicker: "Responsabilità locale", title: "Aggiungi valore localmente", body: "I cittadini globali dovrebbero aggiungere valore ai quartieri in cui entrano." }
  ] },
  rhythm: { eyebrow: "Un ritmo connesso", title: "La stanza cambia durante la giornata, ma la sensazione CRAYS Club resta coerente.", body: "La concentrazione del mattino, la connessione del pomeriggio e l'appartenenza della sera non dovrebbero sembrare prodotti separati. La stessa identità, logica di servizio e livello community collega ogni momento.", stages: [
    { kicker: "Mattino", title: "Concentrarsi", body: "Lavoro profondo, chiamate, caffè, zone tranquille e supporto pratico." },
    { kicker: "Pomeriggio", title: "Connettersi", body: "Riunioni, presentazioni, contesto locale, brand associati ed energia di progetto." },
    { kicker: "Sera", title: "Appartenere", body: "Cene, musica, benessere, formati guidati e ricordi condivisi." }
  ] },
  community: { eyebrow: "Modalità community", title: "Quattro modalità rendono l'esperienza facile da capire e abbastanza ricca da tornarci.", body: "Le migliori pagine community non spiegano all'infinito. Mostrano chiaramente la logica quotidiana. CRAYS Club può parlare a founders, viaggiatori, creators, ospiti di ville e membri locali con lo stesso linguaggio in quattro modalità.", modes: [
    { kicker: "Work", title: "Creare e collaborare", body: "Sale per concentrarsi, scrivanie, team, chiamate e giornate di progetto." },
    { kicker: "Live", title: "Vivere con ritmo", body: "Case, lounge, servizio e routine per movimenti più lunghi." },
    { kicker: "Play", title: "La cultura crea memoria", body: "Eventi, cene, salute, musica, creators e rituali locali." },
    { kicker: "Global Citizen", title: "Accesso con responsabilità", body: "Libertà, democrazia, sostenibilità e rispetto per luoghi reali." }
  ] },
  hosted: { eyebrow: "Cultura ospitata", title: "Le persone tornano quando la stanza ha una ragione sociale per esistere.", body: "Community Life non è una decorazione intorno al settore immobiliare. È il livello della domanda. Cene, talk, benessere, formati creator, serate per membri e rituali locali fanno arrivare, incontrare e tornare le persone.", features: [
    { kicker: "Presentazioni curate", title: "Connessioni utili e calorose", body: "Gli host trasformano sconosciuti in connessioni utili, calorose e rilevanti." },
    { kicker: "Formati ricorrenti", title: "Rituali affidabili", body: "I rituali settimanali e mensili rendono la community prevedibile senza renderla stanca." },
    { kicker: "Energia creator", title: "Attenzione e cultura", body: "Artisti, founders e persone dei media portano attenzione e cultura nella stanza." },
    { kicker: "Valore per i brand", title: "Vivere dentro momenti reali", body: "I brand vivono dentro momenti reali invece di acquistare solo attenzione online." }
  ] },
  global: { eyebrow: "Cittadinanza globale", title: "L'accesso globale dovrebbe creare un comportamento locale migliore.", body: "CRAYS Club mantiene i valori dentro l'esperienza: libertà, cultura democratica, rispetto, sostenibilità e standard della community. Appartenere non è solo una sensazione. È anche il modo in cui i membri si comportano nei luoghi in cui entrano.", features: [
    { kicker: "Cognitivo", title: "Comprendere", body: "Comprendere città, sistemi e le persone che li rendono vivi." },
    { kicker: "Sociale", title: "Incontrare", body: "Incontrarsi tra culture con curiosità, rispetto e presenza." },
    { kicker: "Pratico", title: "Agire", body: "Trasformare i valori in eventi, progetti locali e standard condivisi." }
  ] },
  closing: { eyebrow: "Community Life", title: "CRAYS Club non è un luogo di passaggio. È un cerchio a cui le persone tornano.", body: "Il livello community è dove lavoro, vita, cultura e appartenenza globale diventano un'esperienza quotidiana. Palma de Mallorca avvia la versione fisica, e CRAYS Club porta la sensazione in ogni città successiva.", primary: "Diventa membro", secondary: "Contatta CRAYS Club" },
  blocked: "Media trattenuto", blockedDetail: "Le immagini non verificate di persone, eventi o luoghi restano nascoste finché fonte, contesto e diritti di pubblicazione non sono confermati.", credits: "Crediti media e note sui diritti"
};

export const communityCopy: Record<CommunityLocale, CommunityCopy> = { en, de, es, ca, fr, pt, it };
