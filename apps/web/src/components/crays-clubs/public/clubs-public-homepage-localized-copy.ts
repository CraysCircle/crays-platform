import type { CraysPublicLocale } from "./clubs-public-locale-contract";

export type LocalizedHomepageLocale = Exclude<CraysPublicLocale, "en">;

type LocalizedHomepageExtras = {
  heroMosaic: string;
  flipImage: string;
  openingAria: string;
  openingCopy: string;
  countdown: readonly [string, string, string, string];
  introImageAlt: string;
  stayHeading: string;
  community: {
    titleTop: string;
    titleBottom: string;
    body: string;
    body2: string;
    apply: string;
    golf: string;
    socialLiving: string;
    nostr: string;
    conference: string;
    longevity: string;
    sport: string;
    jobs: string;
  };
  lifestyleIntro: string;
  lifestyleAria: string;
  lifestyleOffers: readonly [
    readonly [string, string],
    readonly [string, string],
    readonly [string, string],
    readonly [string, string],
    readonly [string, string],
  ];
  ambassadorImageAlt: string;
  ambassadorKicker: string;
  ambassadorBody: string;
  directApplication: string;
  gym: {
    eyebrow: string;
    title: string;
    body: string;
    belief: string;
    action: string;
    extras: readonly [
      readonly [string, string],
      readonly [string, string],
      readonly [string, string],
    ];
  };
  workIntro: string;
  familyAction: string;
  hostBodies: readonly [string, string, string, string];
  schoolAriaOpen: string;
};

export const localizedHomepageExtras: Record<LocalizedHomepageLocale, LocalizedHomepageExtras> = {
  de: {
    heroMosaic: "Leben in und um die CRAYS-Community", flipImage: "Bild wechseln",
    openingAria: "Eröffnungsdatum des CRAYS Club Forest City", openingCopy: "DER COUNTDOWN LÄUFT — CRAYS CLUB FOREST CITY",
    countdown: ["TAGE", "STD.", "MIN.", "SEK."], introImageAlt: "Küste, Hotels und Hochhäuser von Forest City am Meer", stayHeading: "IN FOREST CITY",
    community: { titleTop: "Du passt", titleBottom: "zu uns", body: "Soho House ist von gestern — Crays ist der moderne reale Kreis für Unternehmer, Gründer, Kreative, Cypherpunks und Nomaden, die gestalten, sich bewegen und dazugehören.", body2: "Crays Club ist eine private Mitglieder-Community für internationale Unternehmer, Führungskräfte und Remote Professionals – Menschen, die es ernst meinen mit dem Aufbau von Unternehmen und bedeutungsvollen Verbindungen.", apply: "Jetzt bewerben", golf: "Golf", socialLiving: "Gemeinsam wohnen", nostr: "Nostr, Bitcoin & Technologie", conference: "Konferenz & Veranstaltung", longevity: "Mentale Stärke & Langlebigkeit", sport: "Sport & Gesundheit", jobs: "Jobs & Lernen" },
    lifestyleIntro: "Crays ist für Menschen, die nicht nur erfolgreich sein wollen – sie wollen, dass ihr Erfolg etwas bedeutet. Wenn du einen Crays Space betrittst, weißt du sofort: Das sind deine Menschen, und hier gehörst du hin.",
    lifestyleAria: "Angebote zum Lebensstil im CRAYS Club",
    lifestyleOffers: [["Mitglieder treffen sich nach der Arbeit","GUTE MENSCHEN. GUTE ZEITEN."],["Ein Mitglied arbeitet remote in einem gemeinsamen Clubraum","ÜBERALL ARBEITEN. HIER DAZUGEHÖREN."],["Gründer und Kreative tauschen Ideen aus","KREIS FÜR GRÜNDER & KREATIVE"],["Internationale Mitglieder vernetzen sich in der Stadt","LOKALE VERBINDUNG. GLOBALES DENKEN."],["Ein Mitglied tankt bei Bewegung und Wohlbefinden neue Energie","BEWEGEN. ERHOLEN. WIEDERHOLEN."]],
    ambassadorImageAlt: "Treffen der CRAYS-Community bei Sonnenuntergang am Meer", ambassadorKicker: "Du bist dabei, wenn du dabei bist",
    ambassadorBody: "Crays ist eine Community auf Einladung. Ambassadors sind Gründer, Alumni, Kreative, Investoren, Unternehmer, Unternehmen oder Community-Leader, die Menschen vorqualifizieren und empfehlen können, wenn diese Wert, Energie, Fähigkeiten, Ideen oder bedeutende Verbindungen in die Gemeinschaft einbringen. Es geht nicht um Status oder Followerzahlen, sondern darum, was du zum Kreis beiträgst.", directApplication: "Direkt bewerben",
    gym: { eyebrow: "Crays Gym & Wohlbefinden", title: "Stärker leben mit Crays Gym", body: "Ernährung, Fitness und private Gesundheitseinblicke greifen ineinander, damit mehr Stärke zum Alltag gehört.", belief: "Wir glauben, dass die beste Arbeit von Menschen entsteht, die sich wohlfühlen, klar denken und von der richtigen Gemeinschaft umgeben sind.", action: "Crays Gym entdecken", extras: [["Übungsbibliothek","Entdecke geprüfte Übungen mit klaren Anleitungen, Sicherheitshinweisen und nachvollziehbarer Herkunft."],["Trainingspläne","Gestalte deine Woche mit Trainingsplänen, Kalender und Fortschrittsansichten."],["Wearable-Analyse","Prüfe Aktivitäts- und Wohlbefindensdaten kompatibler Wearables in deiner privaten Crays-Gesundheitsansicht."]] },
    workIntro: "Deshalb baut Crays auf drei Dingen auf: zielgerichteter Arbeit, echten menschlichen Verbindungen und einem Lebensstil, der dein mentales, emotionales und körperliches Wohlbefinden unterstützt – nicht als Nebensache, sondern als Grundlage.",
    familyAction: "Crays Familien entdecken", hostBodies: ["Inspirieren, verbinden und feiern.","Gemeinsam fokussieren, entwickeln und Ergebnisse liefern.","Als Team leben, arbeiten und wachsen.","Forest City zu eurem Zuhause machen."], schoolAriaOpen: "Öffnen",
  },
  es: {
    heroMosaic: "Vida en torno a la comunidad CRAYS", flipImage: "Cambiar imagen",
    openingAria: "Fecha de apertura de CRAYS Club Forest City", openingCopy: "EMPIEZA LA CUENTA ATRÁS — CRAYS CLUB FOREST CITY",
    countdown: ["DÍAS", "H", "MIN", "SEG"], introImageAlt: "Costa, hoteles y torres de Forest City junto al mar", stayHeading: "VIVE FOREST CITY",
    community: { titleTop: "Eres parte", titleBottom: "si encajas", body: "Soho House es cosa del pasado; Crays es el círculo presencial de última generación para emprendedores, fundadores, creadores, cypherpunks y nómadas que construyen, se mueven y pertenecen.", body2: "Crays Club es una comunidad privada de miembros para emprendedores globales, ejecutivos y profesionales que trabajan a distancia: personas comprometidas con crear empresas y conexiones significativas.", apply: "Solicitar ahora", golf: "Golf", socialLiving: "Vida compartida", nostr: "Nostr, Bitcoin y tecnología", conference: "Conferencias y eventos", longevity: "Mentalidad y longevidad", sport: "Deporte y salud", jobs: "Empleo y aprendizaje" },
    lifestyleIntro: "Crays es para quienes no solo quieren tener éxito, sino que quieren que su éxito signifique algo. Cuando entras en un espacio Crays, lo sabes de inmediato: esta es tu gente y aquí perteneces.",
    lifestyleAria: "Propuestas de estilo de vida de CRAYS Club",
    lifestyleOffers: [["Miembros reunidos después del trabajo","BUENA GENTE. BUENOS MOMENTOS."],["Un miembro trabaja a distancia en un espacio compartido del club","TRABAJA DESDE CUALQUIER LUGAR. PERTENECE AQUÍ."],["Fundadores y creadores intercambian ideas","CÍRCULO DE FUNDADORES Y CREADORES"],["Miembros internacionales conectan en la ciudad","CONEXIÓN LOCAL. MENTALIDAD GLOBAL."],["Un miembro recupera energía con movimiento y bienestar","MUÉVETE. RECÁRGATE. REPITE."]],
    ambassadorImageAlt: "Encuentro de la comunidad CRAYS junto al mar al atardecer", ambassadorKicker: "Estás dentro si estás dentro",
    ambassadorBody: "Crays funciona por invitación. Los embajadores son fundadores, antiguos alumnos, creadores, inversores, emprendedores, empresas o líderes de comunidad que pueden evaluar y recomendar a personas que aporten valor, energía, habilidades, ideas o conexiones significativas. No se trata del estatus ni del número de seguidores, sino de lo que aportas al círculo.", directApplication: "Solicitar directamente",
    gym: { eyebrow: "Crays Gym y bienestar", title: "Vive con más fuerza gracias a Crays Gym", body: "Alimentación, fitness e información privada de salud se unen para que sentirse mejor forme parte de cada día.", belief: "Creemos que el mejor trabajo nace de personas que se sienten bien, piensan con claridad y están rodeadas de la comunidad adecuada.", action: "Descubrir Crays Gym", extras: [["Biblioteca de ejercicios","Explora ejercicios supervisados con instrucciones claras, indicaciones de seguridad y procedencia verificable."],["Planes de entrenamiento","Organiza tu semana con planes, calendario y vistas de progreso."],["Análisis de dispositivos","Revisa los datos de actividad y bienestar de dispositivos compatibles en tu área privada de salud Crays."]] },
    workIntro: "Por eso Crays se basa en tres pilares: trabajo con propósito, conexiones humanas auténticas y un estilo de vida que favorece tu bienestar mental, emocional y físico; no como algo secundario, sino como la base.",
    familyAction: "Descubrir Crays Familias", hostBodies: ["Inspirar, conectar y celebrar.","Concentrarse, crear y entregar juntos.","Vivir, trabajar y crecer como equipo.","Hacer de Forest City vuestra base."], schoolAriaOpen: "Abrir",
  },
  ca: {
    heroMosaic: "Vida al voltant de la comunitat CRAYS", flipImage: "Canvia la imatge",
    openingAria: "Data d'obertura de CRAYS Club Forest City", openingCopy: "COMENÇA EL COMPTE ENRERE — CRAYS CLUB FOREST CITY",
    countdown: ["DIES", "H", "MIN", "SEG"], introImageAlt: "Costa, hotels i torres de Forest City vora el mar", stayHeading: "VIU FOREST CITY",
    community: { titleTop: "Hi ets", titleBottom: "si hi ets", body: "Soho House és cosa del passat; Crays és el cercle presencial d'última generació per a emprenedors, fundadors, creadors, cypherpunks i nòmades que construeixen, es mouen i pertanyen.", body2: "Crays Club és una comunitat privada de membres per a emprenedors globals, executius i professionals que treballen en remot: persones compromeses amb la creació d’empreses i de connexions significatives.", apply: "Sol·licita-ho ara", golf: "Golf", socialLiving: "Vida compartida", nostr: "Nostr, Bitcoin i tecnologia", conference: "Conferències i esdeveniments", longevity: "Mentalitat i longevitat", sport: "Esport i salut", jobs: "Feina i aprenentatge" },
    lifestyleIntro: "Crays és per a persones que no només volen tenir èxit, sinó que volen que el seu èxit tingui sentit. Quan entres en un espai Crays, ho saps de seguida: aquesta és la teva gent i aquí és on pertanys.",
    lifestyleAria: "Propostes d'estil de vida de CRAYS Club",
    lifestyleOffers: [["Membres reunits després de la feina","BONA GENT. BONS MOMENTS."],["Un membre treballa a distància en un espai compartit del club","TREBALLA DES DE QUALSEVOL LLOC. PERTANY AQUÍ."],["Fundadors i creadors intercanvien idees","CERCLE DE FUNDADORS I CREADORS"],["Membres internacionals connecten a la ciutat","CONNEXIÓ LOCAL. MENTALITAT GLOBAL."],["Un membre recupera energia amb moviment i benestar","MOU-TE. RECUPERA'T. REPETEIX."]],
    ambassadorImageAlt: "Trobada de la comunitat CRAYS vora el mar al capvespre", ambassadorKicker: "Hi ets si hi ets",
    ambassadorBody: "Crays funciona per invitació. Els ambaixadors són fundadors, antics alumnes, creadors, inversors, emprenedors, empreses o líders de comunitat que poden avaluar i recomanar persones que aportin valor, energia, habilitats, idees o connexions significatives. No es tracta de l'estatus ni del nombre de seguidors, sinó del que aportes al cercle.", directApplication: "Sol·licita-ho directament",
    gym: { eyebrow: "Crays Gym i benestar", title: "Viu amb més força gràcies a Crays Gym", body: "Alimentació, fitness i informació privada de salut s'uneixen perquè sentir-se millor formi part de cada dia.", belief: "Creiem que la millor feina neix de persones que se senten bé, pensen amb claredat i estan envoltades de la comunitat adequada.", action: "Descobreix Crays Gym", extras: [["Biblioteca d'exercicis","Explora exercicis supervisats amb instruccions clares, indicacions de seguretat i procedència verificable."],["Plans d'entrenament","Organitza la setmana amb plans, calendari i vistes de progrés."],["Anàlisi de dispositius","Revisa les dades d'activitat i benestar de dispositius compatibles a la teva àrea privada de salut Crays."]] },
    workIntro: "Per això Crays es basa en tres pilars: feina amb propòsit, connexions humanes autèntiques i un estil de vida que afavoreix el teu benestar mental, emocional i físic; no com un afegit, sinó com la base.",
    familyAction: "Descobreix Crays Famílies", hostBodies: ["Inspirar, connectar i celebrar.","Concentrar-se, crear i lliurar plegats.","Viure, treballar i créixer com a equip.","Fer de Forest City la vostra base."], schoolAriaOpen: "Obre",
  },
  fr: {
    heroMosaic: "La vie autour de la communauté CRAYS", flipImage: "Changer l'image",
    openingAria: "Date d'ouverture du CRAYS Club Forest City", openingCopy: "LE COMPTE À REBOURS EST LANCÉ — CRAYS CLUB FOREST CITY",
    countdown: ["JOURS", "H", "MIN", "SEC"], introImageAlt: "Littoral, hôtels et tours de Forest City au bord de la mer", stayHeading: "VIVRE FOREST CITY",
    community: { titleTop: "Avec nous", titleBottom: "si ça colle", body: "Soho House appartient au passé : Crays est le cercle physique nouvelle génération pour entrepreneurs, fondateurs, créateurs, cypherpunks et nomades qui construisent, se déplacent et trouvent leur place.", body2: "Crays Club est une communauté privée réservée aux entrepreneurs internationaux, aux dirigeants et aux professionnels travaillant à distance — des personnes déterminées à développer des entreprises et des relations qui comptent.", apply: "Postuler maintenant", golf: "Golf", socialLiving: "Vie partagée", nostr: "Nostr, Bitcoin et technologie", conference: "Conférences et événements", longevity: "État d'esprit et longévité", sport: "Sport et santé", jobs: "Emploi et apprentissage" },
    lifestyleIntro: "Crays s’adresse à celles et ceux qui ne veulent pas seulement réussir, mais donner du sens à leur réussite. Lorsque vous entrez dans un espace Crays, vous le savez immédiatement : ce sont les vôtres, et vous êtes à votre place.",
    lifestyleAria: "Expériences d'art de vivre proposées par CRAYS Club",
    lifestyleOffers: [["Des membres se retrouvent après le travail","DE BELLES RENCONTRES. DE BONS MOMENTS."],["Un membre travaille à distance dans un espace partagé du club","TRAVAILLEZ PARTOUT. APPARTENEZ ICI."],["Des fondateurs et créateurs échangent leurs idées","CERCLE DES FONDATEURS ET CRÉATEURS"],["Des membres internationaux se rencontrent en ville","ANCRAGE LOCAL. ESPRIT MONDIAL."],["Un membre se ressource par le mouvement et le bien-être","BOUGER. SE RESSOURCER. RECOMMENCER."]],
    ambassadorImageAlt: "Rencontre de la communauté CRAYS au bord de la mer au coucher du soleil", ambassadorKicker: "Vous en êtes si vous en êtes",
    ambassadorBody: "Crays fonctionne sur invitation. Les ambassadeurs sont des fondateurs, anciens membres, créateurs, investisseurs, entrepreneurs, entreprises ou responsables de communauté qui peuvent évaluer et recommander des personnes apportant valeur, énergie, compétences, idées ou relations utiles. Il ne s'agit ni de statut ni du nombre d'abonnés, mais de ce que vous apportez au cercle.", directApplication: "Postuler directement",
    gym: { eyebrow: "Crays Gym et bien-être", title: "Vivez plus fort avec Crays Gym", body: "Alimentation, activité physique et données de santé privées se rejoignent pour que se sentir plus fort fasse partie du quotidien.", belief: "Nous pensons que le meilleur travail naît de personnes qui se sentent bien, pensent clairement et sont entourées de la bonne communauté.", action: "Découvrir Crays Gym", extras: [["Bibliothèque d'exercices","Explorez des exercices encadrés avec des instructions claires, des conseils de sécurité et une provenance vérifiable."],["Programmes d'entraînement","Organisez votre semaine avec des programmes, un calendrier et le suivi de vos progrès."],["Analyse des objets connectés","Consultez les données d'activité et de bien-être d'appareils compatibles dans votre espace santé privé Crays."]] },
    workIntro: "C’est pourquoi Crays repose sur trois piliers : un travail porteur de sens, de véritables liens humains et un mode de vie qui soutient votre bien-être mental, émotionnel et physique — non comme un supplément, mais comme un fondement.",
    familyAction: "Découvrir Crays Familles", hostBodies: ["Inspirer, créer du lien et célébrer.","Se concentrer, construire et livrer ensemble.","Vivre, travailler et grandir en équipe.","Faire de Forest City votre base."], schoolAriaOpen: "Ouvrir",
  },
  pt: {
    heroMosaic: "Vida em torno da comunidade CRAYS", flipImage: "Mudar imagem",
    openingAria: "Data de abertura do CRAYS Club Forest City", openingCopy: "COMEÇOU A CONTAGEM DECRESCENTE — CRAYS CLUB FOREST CITY",
    countdown: ["DIAS", "H", "MIN", "SEG"], introImageAlt: "Costa, hotéis e torres de Forest City junto ao mar", stayHeading: "VIVA FOREST CITY",
    community: { titleTop: "Faz parte", titleBottom: "se encaixa", body: "O Soho House pertence ao passado; a Crays é o círculo presencial de última geração para empreendedores, fundadores, criadores, cypherpunks e nómadas que constroem, se movem e pertencem.", body2: "O Crays Club é uma comunidade privada de membros para empreendedores globais, executivos e profissionais remotos — pessoas empenhadas em criar empresas e ligações com significado.", apply: "Candidatar-se agora", golf: "Golfe", socialLiving: "Vida partilhada", nostr: "Nostr, Bitcoin e tecnologia", conference: "Conferências e eventos", longevity: "Mentalidade e longevidade", sport: "Desporto e saúde", jobs: "Emprego e aprendizagem" },
    lifestyleIntro: "A Crays é para pessoas que não querem apenas ter sucesso — querem que o seu sucesso tenha significado. Quando entra num espaço Crays, percebe imediatamente: estas são as suas pessoas e este é o seu lugar.",
    lifestyleAria: "Experiências de estilo de vida do CRAYS Club",
    lifestyleOffers: [["Membros encontram-se depois do trabalho","BOAS PESSOAS. BONS MOMENTOS."],["Um membro trabalha remotamente num espaço partilhado do clube","TRABALHE EM QUALQUER LUGAR. PERTENÇA AQUI."],["Fundadores e criadores trocam ideias","CÍRCULO DE FUNDADORES E CRIADORES"],["Membros internacionais ligam-se na cidade","LIGAÇÃO LOCAL. MENTALIDADE GLOBAL."],["Um membro recupera energia com movimento e bem-estar","MEXER. RECUPERAR. REPETIR."]],
    ambassadorImageAlt: "Encontro da comunidade CRAYS junto ao mar ao pôr do sol", ambassadorKicker: "Está dentro se está dentro",
    ambassadorBody: "A Crays funciona por convite. Os embaixadores são fundadores, antigos membros, criadores, investidores, empreendedores, empresas ou líderes de comunidade que podem avaliar e recomendar pessoas que tragam valor, energia, competências, ideias ou ligações relevantes. Não se trata de estatuto nem de número de seguidores, mas do que cada pessoa traz ao círculo.", directApplication: "Candidatar-se diretamente",
    gym: { eyebrow: "Crays Gym e bem-estar", title: "Viva com mais força no Crays Gym", body: "Alimentação, fitness e informação privada de saúde juntam-se para que sentir-se mais forte faça parte do dia a dia.", belief: "Acreditamos que o melhor trabalho nasce de pessoas que se sentem bem, pensam com clareza e estão rodeadas pela comunidade certa.", action: "Descobrir Crays Gym", extras: [["Biblioteca de exercícios","Explore exercícios orientados com instruções claras, informação de segurança e origem verificável."],["Planos de treino","Organize a semana com planos de treino, calendário e vistas de progresso."],["Análise de dispositivos","Consulte dados de atividade e bem-estar de dispositivos compatíveis na sua área privada de saúde Crays."]] },
    workIntro: "É por isso que a Crays assenta em três pilares: trabalho com propósito, ligações humanas genuínas e um estilo de vida que apoia o seu bem-estar mental, emocional e físico — não como algo secundário, mas como base.",
    familyAction: "Descobrir Crays Famílias", hostBodies: ["Inspirar, ligar e celebrar.","Concentrar, construir e entregar em conjunto.","Viver, trabalhar e crescer como equipa.","Fazer de Forest City a vossa base."], schoolAriaOpen: "Abrir",
  },
  it: {
    heroMosaic: "La vita intorno alla comunità CRAYS", flipImage: "Cambia immagine",
    openingAria: "Data di apertura del CRAYS Club Forest City", openingCopy: "IL CONTO ALLA ROVESCIA È INIZIATO — CRAYS CLUB FOREST CITY",
    countdown: ["GIORNI", "ORE", "MIN", "SEC"], introImageAlt: "Costa, hotel e torri di Forest City sul mare", stayHeading: "VIVI FOREST CITY",
    community: { titleTop: "Ci sei", titleBottom: "se ci sei", body: "Soho House appartiene al passato: Crays è il circolo fisico di nuova generazione per imprenditori, founder, creator, cypherpunk e nomadi che costruiscono, si muovono e appartengono.", body2: "Crays Club è una community privata riservata a imprenditori internazionali, dirigenti e professionisti da remoto: persone seriamente impegnate a costruire imprese e relazioni significative.", apply: "Candidati ora", golf: "Golf", socialLiving: "Vita condivisa", nostr: "Nostr, Bitcoin e tecnologia", conference: "Conferenze ed eventi", longevity: "Mentalità e longevità", sport: "Sport e salute", jobs: "Lavoro e apprendimento" },
    lifestyleIntro: "Crays è per chi non vuole soltanto avere successo, ma desidera che il proprio successo abbia un significato. Quando entri in uno spazio Crays, lo capisci subito: queste sono le tue persone e questo è il tuo posto.",
    lifestyleAria: "Esperienze di stile di vita del CRAYS Club",
    lifestyleOffers: [["I membri si incontrano dopo il lavoro","BELLE PERSONE. BEI MOMENTI."],["Un membro lavora da remoto in uno spazio condiviso del club","LAVORA OVUNQUE. APPARTIENI QUI."],["Founder e creator si scambiano idee","CIRCOLO DI FOUNDER E CREATOR"],["Membri internazionali si incontrano in città","CONNESSIONE LOCALE. MENTALITÀ GLOBALE."],["Un membro recupera energia con movimento e benessere","MUOVITI. RICARICATI. RIPETI."]],
    ambassadorImageAlt: "Incontro della comunità CRAYS sul mare al tramonto", ambassadorKicker: "Ci sei se ci sei",
    ambassadorBody: "Crays funziona su invito. Gli ambassador sono founder, alumni, creator, investitori, imprenditori, aziende o leader di comunità che possono valutare e raccomandare persone capaci di portare valore, energia, competenze, idee o connessioni significative. Non conta lo status o il numero di follower, ma ciò che porti nel circolo.", directApplication: "Candidati direttamente",
    gym: { eyebrow: "Crays Gym e benessere", title: "Vivi più forte con Crays Gym", body: "Alimentazione, fitness e informazioni sanitarie private si uniscono affinché sentirsi più forti diventi parte della vita quotidiana.", belief: "Crediamo che il lavoro migliore nasca da persone che stanno bene, pensano con chiarezza e sono circondate dalla comunità giusta.", action: "Scopri Crays Gym", extras: [["Libreria degli esercizi","Esplora esercizi verificati con istruzioni chiare, indicazioni di sicurezza e provenienza documentata."],["Piani di allenamento","Organizza la settimana con piani, calendario e visualizzazioni dei progressi."],["Analisi dei dispositivi","Consulta i dati di attività e benessere dei dispositivi compatibili nella tua area salute privata Crays."]] },
    workIntro: "Ecco perché Crays si fonda su tre elementi: un lavoro guidato da uno scopo, autentiche relazioni umane e uno stile di vita che sostiene il tuo benessere mentale, emotivo e fisico — non come un elemento secondario, ma come base.",
    familyAction: "Scopri Crays Famiglie", hostBodies: ["Ispirare, connettere e celebrare.","Concentrarsi, costruire e consegnare insieme.","Vivere, lavorare e crescere come team.","Fare di Forest City la vostra base."], schoolAriaOpen: "Apri",
  },
};
