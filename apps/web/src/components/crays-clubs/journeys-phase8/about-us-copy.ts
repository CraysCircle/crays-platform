export const aboutLocales = ["en", "de", "es", "ca", "fr", "pt", "it"] as const;
export type AboutLocale = (typeof aboutLocales)[number];

type Item = { title: string; body: string };
type AboutShellCopy = {
  skip: string; primaryNav: string; footerNav: string; menu: string; close: string;
  about: string; lifestyle: string; hospitality: string; community: string; families: string;
  membership: string; ambassadors: string; teams: string; events: string; conference: string;
  companies: string; brandService: string; contact: string; account: string; legal: string;
  association: string; associationNote: string; footerLine: string; siteNote: string;
};
export type AboutCopy = {
  localeName: string;
  metaTitle: string;
  metaDescription: string;
  shell: AboutShellCopy;
  hero: {
    eyebrow: string; title: string; body: string; primary: string; secondary: string;
    signals: readonly string[]; caption: string;
  };
  idea: { eyebrow: string; title: string; body: string; caption: string };
  beliefs: { eyebrow: string; title: string; items: readonly Item[] };
  vision: {
    eyebrow: string; title: string; body: string; statement: string;
    pillars: readonly Item[]; cityCaption: string; nomadCaption: string;
  };
  nomads: { eyebrow: string; title: string; body: string; items: readonly Item[] };
  remote: { eyebrow: string; title: string; body: string; items: readonly string[] };
  flow: { eyebrow: string; title: string; items: readonly Item[] };
  short: { eyebrow: string; title: string; body: string; cta: string };
  mediaAlt: { solo: string; conversation: string; group: string };
};

const item = (title: string, body: string): Item => ({ title, body });
const liveDescription = "Crays builds social living infrastructure for people who work remotely, move globally and still need a real-world community.";

const enShell: AboutShellCopy = {
  skip:"Skip to content", primaryNav:"Primary navigation", footerNav:"Footer navigation", menu:"Menu", close:"Close",
  about:"About Us", lifestyle:"Lifestyle", hospitality:"Hospitality", community:"Community Life", families:"Families",
  membership:"Become a Member", ambassadors:"Ambassadors", teams:"Teams", events:"Events", conference:"Conference",
  companies:"Portfolio Companies", brandService:"Brand as a Service", contact:"Contact", account:"Account", legal:"Legal",
  association:"CRAYS Association", associationNote:"Independent association", footerLine:"Living, working, travel and community in one recognizable system.", siteNote:"www.craysclub.com",
};

const english: AboutCopy = {
  localeName: "English",
  metaTitle: "About Us | CRAYS Club",
  metaDescription: liveDescription,
  shell: enShell,
  hero: {
    eyebrow:"About Us",
    title:"We build the real-world layer for people who move.",
    body:"Crays connects living, working, travel and community into one recognizable system for creators, founders, business travelers and global citizens who need freedom without losing structure.",
    primary:"Become a Member",
    secondary:"Explore the model",
    signals:["Place","People","Technology","Belonging"],
    caption:"One Crays layer\nhomes, lounges, workspaces, events and digital access.",
  },
  idea: {
    eyebrow:"The Idea",
    title:"Freedom only works when the basics are already handled.",
    body:"People want flexible lives, companies need better work models, and cities need places where mobile people can actually belong. Crays answers that with branded living spaces, work-ready environments, hosted community moments and digital access that connects the journey.",
    caption:"Real places first. Then the digital layer makes the journey easier to enter, repeat and recognize.",
  },
  beliefs: {
    eyebrow:"What We Believe",
    title:"Three shifts define the world Crays is built for.",
    items:[
      item("Living becomes a lifestyle brand","Homes, hotels, workspaces and communities should work together instead of feeling fragmented."),
      item("Digital nomads are no longer a niche","Location-independent work moved into the mainstream, and the infrastructure has to catch up."),
      item("Remote work changes real estate","Work is more flexible, but people still need places to focus, meet, recover and build trust."),
    ],
  },
  vision: {
    eyebrow:"Vision",
    title:"A global village made of real rooms, not just online networks.",
    body:"Crays is designed as a modern urban lifestyle layer: places to call home, spaces to work from, local hospitality, events, brand partners and digital access in one recognizable system.",
    statement:"The point is not to decorate buildings. The point is to make places useful as social, productive and emotional home bases for people who move.",
    pillars:[
      item("Place","Curated homes, lounges and club spaces."),
      item("People","Like-minded members, local hosts and business circles."),
      item("Technology","A mobile-first layer for discovery, access and community."),
      item("Brand","A shared identity across living, working and travel."),
    ],
    cityCaption:"City energy, hospitality and private community moments connected by one brand logic.",
    nomadCaption:"Digital nomads show where the broader market is moving: work, travel and life are no longer separate boxes.",
  },
  nomads: {
    eyebrow:"Digital Nomads",
    title:"The mobile workforce is the signal, not the exception.",
    body:"Digital nomads are people who combine remote work with travel for different reasons and timeframes. Some move for years; others move seasonally or between projects. What connects them is not chaos, but the need for reliable living, work settings and a community that can travel with them.",
    items:[
      item("Choose the office","Work from a lounge, a club, a city base or a coastal home."),
      item("Keep routines","Stay productive while changing location and context."),
      item("Meet real people","Turn travel into relationships, not just content."),
      item("Live with variety","New places can create new energy without losing stability."),
    ],
  },
  remote: {
    eyebrow:"Remote Working",
    title:"Remote work works best when people still have somewhere to arrive.",
    body:"Remote work removed the office as the only default. But it did not remove the need for focus, team connection, hospitality and healthy surroundings. Crays treats remote work as a lifestyle and operating model, not a temporary perk or a laptop-only trend.",
    items:[
      "Reliable work environments for individuals, teams and project stays.",
      "Living spaces that support productivity, recovery and daily routines.",
      "Community moments that help remote people reconnect in person.",
      "Flexible real estate logic for companies and property partners.",
    ],
  },
  flow: {
    eyebrow:"The Crays Flow",
    title:"Arrive, work, live and belong in one connected layer.",
    items:[
      item("Arrival","Members land in a city and already have a recognizable home base."),
      item("Work and live","Focused work, daily routines and recovery happen inside the same hosted lifestyle layer."),
      item("Belong","The network becomes real through dinners, events, introductions and daily rituals."),
    ],
  },
  short: {
    eyebrow:"The Short Version",
    title:"Crays is building places where global citizens can belong before they settle.",
    body:"Crays is the shared structure behind club spaces, living concepts, community moments and digital access. It turns mobility into a connected real-world experience instead of a series of disconnected stays.",
    cta:"Explore Team",
  },
  mediaAlt: {
    solo:"A person working with a laptop and phone in a shared cafe setting.",
    conversation:"Two colleagues in conversation with laptops in a cafe.",
    group:"A diverse group gathered around a table for a working session.",
  },
};

function liveLocale(config: AboutCopy): AboutCopy {
  return config;
}

const deShell: AboutShellCopy = {
  skip:"Zum Inhalt springen", primaryNav:"Hauptnavigation", footerNav:"Footer-Navigation", menu:"Menü", close:"Schließen",
  about:"Über uns", lifestyle:"Lifestyle", hospitality:"Hospitality", community:"Community Life", families:"Familien",
  membership:"Mitglied werden", ambassadors:"Ambassadors", teams:"Teams", events:"Events", conference:"Konferenz",
  companies:"Portfolio Companies", brandService:"Brand as a Service", contact:"Kontakt", account:"Konto", legal:"Rechtliches",
  association:"CRAYS Association", associationNote:"Unabhängiger Verband", footerLine:"Wohnen, Arbeiten, Reisen und Gemeinschaft in einem wiedererkennbaren System.", siteNote:"www.craysclub.com",
};
const esShell: AboutShellCopy = {
  skip:"Ir al contenido", primaryNav:"Navegación principal", footerNav:"Navegación del pie", menu:"Menú", close:"Cerrar",
  about:"Sobre nosotros", lifestyle:"Lifestyle", hospitality:"Hospitality", community:"Community Life", families:"Familias",
  membership:"Hazte miembro", ambassadors:"Ambassadors", teams:"Equipos", events:"Eventos", conference:"Conferencia",
  companies:"Portfolio Companies", brandService:"Brand as a Service", contact:"Contacto", account:"Cuenta", legal:"Legal",
  association:"CRAYS Association", associationNote:"Asociación independiente", footerLine:"Vivienda, trabajo, viajes y comunidad en un sistema reconocible.", siteNote:"www.craysclub.com",
};
const caShell: AboutShellCopy = {
  skip:"Ves al contingut", primaryNav:"Navegació principal", footerNav:"Navegació del peu", menu:"Menú", close:"Tanca",
  about:"Sobre nosaltres", lifestyle:"Lifestyle", hospitality:"Hospitality", community:"Community Life", families:"Famílies",
  membership:"Fes-te membre", ambassadors:"Ambassadors", teams:"Equips", events:"Esdeveniments", conference:"Conferència",
  companies:"Portfolio Companies", brandService:"Brand as a Service", contact:"Contacte", account:"Compte", legal:"Legal",
  association:"CRAYS Association", associationNote:"Associació independent", footerLine:"Habitatge, feina, viatges i comunitat en un sistema reconeixible.", siteNote:"www.craysclub.com",
};
const frShell: AboutShellCopy = {
  skip:"Aller au contenu", primaryNav:"Navigation principale", footerNav:"Navigation du pied de page", menu:"Menu", close:"Fermer",
  about:"À propos", lifestyle:"Lifestyle", hospitality:"Hospitality", community:"Community Life", families:"Familles",
  membership:"Devenir membre", ambassadors:"Ambassadors", teams:"Équipes", events:"Événements", conference:"Conférence",
  companies:"Portfolio Companies", brandService:"Brand as a Service", contact:"Contact", account:"Compte", legal:"Mentions légales",
  association:"CRAYS Association", associationNote:"Association indépendante", footerLine:"Habitat, travail, voyage et communauté dans un système reconnaissable.", siteNote:"www.craysclub.com",
};
const ptShell: AboutShellCopy = {
  skip:"Ir para o conteúdo", primaryNav:"Navegação principal", footerNav:"Navegação do rodapé", menu:"Menu", close:"Fechar",
  about:"Sobre nós", lifestyle:"Lifestyle", hospitality:"Hospitality", community:"Community Life", families:"Famílias",
  membership:"Torne-se membro", ambassadors:"Ambassadors", teams:"Equipas", events:"Eventos", conference:"Conferência",
  companies:"Portfolio Companies", brandService:"Brand as a Service", contact:"Contacto", account:"Conta", legal:"Ficha legal",
  association:"CRAYS Association", associationNote:"Associação independente", footerLine:"Habitação, trabalho, viagens e comunidade num sistema reconhecível.", siteNote:"www.craysclub.com",
};
const itShell: AboutShellCopy = {
  skip:"Vai al contenuto", primaryNav:"Navigazione principale", footerNav:"Navigazione a piè di pagina", menu:"Menu", close:"Chiudi",
  about:"Chi siamo", lifestyle:"Lifestyle", hospitality:"Hospitality", community:"Community Life", families:"Famiglie",
  membership:"Diventa membro", ambassadors:"Ambassadors", teams:"Team", events:"Eventi", conference:"Conferenza",
  companies:"Portfolio Companies", brandService:"Brand as a Service", contact:"Contatto", account:"Account", legal:"Note legali",
  association:"CRAYS Association", associationNote:"Associazione indipendente", footerLine:"Abitare, lavorare, viaggiare e comunità in un sistema riconoscibile.", siteNote:"www.craysclub.com",
};

export const aboutCopy: Record<AboutLocale, AboutCopy> = {
  en: english,
  de: liveLocale({
    localeName:"Deutsch", metaTitle:"Über uns | CRAYS Club", metaDescription:"Crays baut soziale Infrastruktur für Menschen, die ortsunabhängig arbeiten, weltweit unterwegs sind und dennoch eine echte Gemeinschaft brauchen.", shell:deShell,
    hero:{
      eyebrow:"Über uns", title:"Wir bauen die reale Ebene für Menschen in Bewegung.",
      body:"Crays verbindet Wohnen, Arbeiten, Reisen und Gemeinschaft zu einem klar erkennbaren System für Kreative, Gründer, Geschäftsreisende und Weltbürger, die Freiheit brauchen, ohne Struktur zu verlieren.",
      primary:"Mitglied werden", secondary:"Das Modell entdecken", signals:["Ort","Menschen","Technologie","Zugehörigkeit"],
      caption:"Eine Crays-Ebene\nWohnungen, Lounges, Arbeitsbereiche, Veranstaltungen und digitaler Zugang.",
    },
    idea:{ eyebrow:"Die Idee", title:"Freiheit funktioniert erst, wenn die Grundlagen geregelt sind.", body:"Menschen wünschen sich flexible Lebensmodelle, Unternehmen brauchen bessere Arbeitsmodelle und Städte benötigen Orte, an denen mobile Menschen wirklich dazugehören können. Crays antwortet darauf mit markengeprägten Wohnräumen, arbeitsbereiten Umgebungen, begleiteten Gemeinschaftsmomenten und digitalem Zugang, der die gesamte Reise verbindet.", caption:"Zuerst reale Orte. Die digitale Ebene macht den Zugang anschließend einfacher, wiederholbar und wiedererkennbar." },
    beliefs:{
      eyebrow:"Woran wir glauben", title:"Drei Veränderungen prägen die Welt, für die Crays gebaut ist.",
      items:[
        item("Wohnen wird zur Lifestyle-Marke","Wohnungen, Hotels, Arbeitsbereiche und Gemeinschaften sollten zusammenspielen, statt sich wie einzelne Teile anzufühlen."),
        item("Digitale Nomaden sind keine Nische mehr","Ortsunabhängiges Arbeiten ist im Alltag angekommen; die Infrastruktur muss nun nachziehen."),
        item("Remote-Arbeit verändert Immobilien","Arbeit wird flexibler, doch Menschen brauchen weiterhin Orte für Konzentration, Begegnung, Erholung und Vertrauen."),
      ],
    },
    vision:{
      eyebrow:"Vision", title:"Ein globales Dorf aus echten Räumen, nicht nur aus Online-Netzwerken.",
      body:"Crays ist als moderne urbane Lifestyle-Ebene gedacht: Orte zum Zuhausefühlen, Räume zum Arbeiten, lokale Gastfreundschaft, Veranstaltungen, Markenpartner und digitaler Zugang in einem erkennbaren System.",
      statement:"Es geht nicht darum, Gebäude zu dekorieren. Es geht darum, Orte für mobile Menschen als soziale, produktive und emotionale Heimatbasen nutzbar zu machen.",
      pillars:[item("Ort","Ausgewählte Wohnungen, Lounges und Clubräume."),item("Menschen","Gleichgesinnte Mitglieder, lokale Gastgeber und Geschäftskreise."),item("Technologie","Eine mobile Ebene für Entdeckung, Zugang und Gemeinschaft."),item("Marke","Eine gemeinsame Identität über Wohnen, Arbeiten und Reisen hinweg.")],
      cityCaption:"Städtische Energie, Gastfreundschaft und private Gemeinschaftsmomente, verbunden durch eine gemeinsame Markenlogik.",
      nomadCaption:"Digitale Nomaden zeigen, wohin sich der breitere Markt bewegt: Arbeit, Reisen und Leben sind keine getrennten Bereiche mehr.",
    },
    nomads:{
      eyebrow:"Digitale Nomaden", title:"Die mobile Arbeitswelt ist das Signal, nicht die Ausnahme.",
      body:"Digitale Nomaden verbinden Remote-Arbeit aus unterschiedlichen Gründen und für verschiedene Zeiträume mit Reisen. Manche sind jahrelang unterwegs, andere saisonal oder zwischen Projekten. Sie verbindet nicht Chaos, sondern der Bedarf an verlässlichem Wohnen, guten Arbeitsorten und einer Gemeinschaft, die mitreisen kann.",
      items:[
        item("Arbeitsort wählen","Arbeite in einer Lounge, einem Club, einer Stadtbasis oder einem Zuhause an der Küste."),
        item("Routinen bewahren","Bleibe produktiv, auch wenn Ort und Umfeld wechseln."),
        item("Echte Menschen treffen","Lass aus Reisen Beziehungen entstehen, nicht nur Inhalte."),
        item("Abwechslung leben","Neue Orte schaffen neue Energie, ohne dass Stabilität verloren geht."),
      ],
    },
    remote:{ eyebrow:"Remote-Arbeit", title:"Remote-Arbeit funktioniert am besten, wenn Menschen weiterhin einen Ort zum Ankommen haben.", body:"Remote-Arbeit hat das Büro als einzigen Standard abgelöst. Den Bedarf an Konzentration, Teamkontakt, Gastfreundschaft und gesunder Umgebung hat sie nicht beseitigt. Crays versteht Remote-Arbeit als Lebens- und Betriebsmodell, nicht als vorübergehenden Vorteil oder reinen Laptop-Trend.", items:["Verlässliche Arbeitsumgebungen für Einzelpersonen, Teams und Projektaufenthalte.","Wohnräume, die Produktivität, Erholung und tägliche Routinen unterstützen.","Gemeinschaftsmomente, in denen Menschen aus der Remote-Arbeit wieder persönlich zusammenfinden.","Flexible Immobilienmodelle für Unternehmen und Objektpartner."] },
    flow:{ eyebrow:"Der Crays-Ablauf", title:"Ankommen, arbeiten, leben und dazugehören – in einer verbundenen Ebene.", items:[item("Ankommen","Mitglieder kommen in einer Stadt an und finden bereits eine vertraute Heimatbasis vor."),item("Arbeiten und leben","Konzentriertes Arbeiten, tägliche Routinen und Erholung finden in derselben begleiteten Lifestyle-Ebene statt."),item("Dazugehören","Durch Abendessen, Veranstaltungen, persönliche Vorstellungen und tägliche Rituale wird das Netzwerk real.")] },
    short:{ eyebrow:"Kurz gesagt", title:"Crays baut Orte, an denen Weltbürger dazugehören können, bevor sie sich niederlassen.", body:"Crays ist die gemeinsame Struktur hinter Clubräumen, Wohnkonzepten, Gemeinschaftsmomenten und digitalem Zugang. Sie macht Mobilität zu einem verbundenen Erlebnis in der realen Welt statt zu einer Folge voneinander getrennter Aufenthalte.", cta:"Team entdecken" },
    mediaAlt:{
      solo:"Eine Person arbeitet mit Laptop und Telefon in einem gemeinsam genutzten Café.",
      conversation:"Zwei Kollegen sprechen mit Laptops in einem Café.",
      group:"Eine vielfältige Gruppe sitzt für eine Arbeitssession an einem Tisch.",
    },
  }),
  es: liveLocale({
    localeName:"Español", metaTitle:"Sobre nosotros | CRAYS Club", metaDescription:"Crays crea infraestructura social para personas que trabajan a distancia, se mueven por el mundo y siguen necesitando una comunidad real.", shell:esShell,
    hero:{ eyebrow:"Sobre nosotros", title:"Construimos la capa del mundo real para personas en movimiento.", body:"Crays conecta vivienda, trabajo, viajes y comunidad en un sistema reconocible para creadores, fundadores, viajeros de negocios y ciudadanos globales que necesitan libertad sin perder estructura.", primary:"Hazte miembro", secondary:"Explorar el modelo", signals:["Lugar","Personas","Tecnología","Pertenencia"], caption:"Una capa Crays\nhogares, salones, espacios de trabajo, eventos y acceso digital." },
    idea:{ eyebrow:"La idea", title:"La libertad solo funciona cuando lo esencial ya está resuelto.", body:"Las personas quieren vidas flexibles, las empresas necesitan mejores modelos de trabajo y las ciudades requieren lugares donde quienes se mueven puedan pertenecer de verdad. Crays responde con viviendas de marca, entornos preparados para trabajar, momentos de comunidad organizados y acceso digital que conecta todo el recorrido.", caption:"Primero, lugares reales. Después, la capa digital facilita entrar, repetir y reconocer el recorrido." },
    beliefs:{ eyebrow:"Lo que creemos", title:"Tres cambios definen el mundo para el que se ha creado Crays.", items:[item("La vivienda se convierte en una marca de estilo de vida","Hogares, hoteles, espacios de trabajo y comunidades deberían funcionar juntos en lugar de sentirse fragmentados."),item("Los nómadas digitales ya no son un nicho","El trabajo independiente de la ubicación se ha generalizado y la infraestructura debe ponerse al día."),item("El trabajo remoto transforma el sector inmobiliario","El trabajo es más flexible, pero seguimos necesitando lugares para concentrarnos, reunirnos, recuperarnos y generar confianza.")] },
    vision:{ eyebrow:"Visión", title:"Una aldea global hecha de espacios reales, no solo de redes digitales.", body:"Crays está concebido como una capa urbana de estilo de vida: hogares, espacios de trabajo, hospitalidad local, eventos, marcas colaboradoras y acceso digital dentro de un sistema reconocible.", statement:"No se trata de decorar edificios, sino de convertir los lugares en bases sociales, productivas y emocionales útiles para las personas en movimiento.", pillars:[item("Lugar","Hogares, salones y espacios de club seleccionados."),item("Personas","Miembros afines, anfitriones locales y círculos empresariales."),item("Tecnología","Una capa móvil para descubrir, acceder y participar en la comunidad."),item("Marca","Una identidad común para vivir, trabajar y viajar.")], cityCaption:"Energía urbana, hospitalidad y momentos privados de comunidad conectados por una misma lógica de marca.", nomadCaption:"Los nómadas digitales muestran hacia dónde avanza el mercado: trabajo, viajes y vida ya no son compartimentos separados." },
    nomads:{ eyebrow:"Nómadas digitales", title:"La fuerza laboral móvil es la señal, no la excepción.", body:"Los nómadas digitales combinan trabajo remoto y viajes por distintos motivos y durante periodos diferentes. Algunos se desplazan durante años; otros, por temporadas o entre proyectos. No los une el caos, sino la necesidad de vivienda fiable, buenos entornos de trabajo y una comunidad que pueda acompañarlos.", items:[item("Elegir la oficina","Trabaja desde un salón, un club, una base urbana o una vivienda junto al mar."),item("Mantener las rutinas","Conserva la productividad aunque cambien el lugar y el contexto."),item("Conocer personas reales","Convierte los viajes en relaciones, no solo en contenido."),item("Vivir con variedad","Los lugares nuevos aportan energía sin perder estabilidad.")] },
    remote:{ eyebrow:"Trabajo remoto", title:"El trabajo remoto funciona mejor cuando las personas siguen teniendo un lugar al que llegar.", body:"El trabajo remoto eliminó la oficina como única opción, pero no la necesidad de concentración, conexión de equipo, hospitalidad y entornos saludables. Crays lo trata como un estilo de vida y un modelo operativo, no como una ventaja temporal ni una tendencia limitada al portátil.", items:["Entornos de trabajo fiables para personas, equipos y estancias por proyecto.","Viviendas que apoyan la productividad, el descanso y las rutinas diarias.","Momentos de comunidad que ayudan a reencontrarse en persona.","Modelos inmobiliarios flexibles para empresas y socios de propiedades."] },
    flow:{ eyebrow:"El recorrido Crays", title:"Llegar, trabajar, vivir y pertenecer en una capa conectada.", items:[item("Llegada","Los miembros llegan a una ciudad y ya cuentan con una base reconocible."),item("Trabajar y vivir","El trabajo concentrado, las rutinas y el descanso conviven en la misma capa de estilo de vida acompañada."),item("Pertenecer","La red se hace real mediante cenas, eventos, presentaciones y rituales diarios.")] },
    short:{ eyebrow:"En pocas palabras", title:"Crays crea lugares donde los ciudadanos globales pueden pertenecer antes de establecerse.", body:"Crays es la estructura común que conecta clubes, conceptos residenciales, momentos comunitarios y acceso digital. Convierte la movilidad en una experiencia real conectada, no en una sucesión de estancias aisladas.", cta:"Conocer al equipo" },
    mediaAlt:{solo:"Una persona trabaja con un portátil y un teléfono en una cafetería compartida.",conversation:"Dos compañeros conversan con portátiles en una cafetería.",group:"Un grupo diverso se reúne alrededor de una mesa para una sesión de trabajo."},
  }),
  ca: liveLocale({
    localeName:"Català", metaTitle:"Sobre nosaltres | CRAYS Club", metaDescription:"Crays crea infraestructura social per a persones que treballen a distància, es mouen arreu del món i continuen necessitant una comunitat real.", shell:caShell,
    hero:{ eyebrow:"Sobre nosaltres", title:"Construïm la capa del món real per a persones en moviment.", body:"Crays connecta habitatge, feina, viatges i comunitat en un sistema reconeixible per a creadors, fundadors, viatgers de negocis i ciutadans globals que necessiten llibertat sense perdre estructura.", primary:"Fes-te membre", secondary:"Explora el model", signals:["Lloc","Persones","Tecnologia","Pertinença"], caption:"Una capa Crays\nllars, salons, espais de treball, esdeveniments i accés digital." },
    idea:{ eyebrow:"La idea", title:"La llibertat només funciona quan l'essencial ja està resolt.", body:"Les persones volen vides flexibles, les empreses necessiten models de treball millors i les ciutats requereixen llocs on les persones mòbils puguin pertànyer de debò. Crays hi respon amb habitatges de marca, entorns preparats per treballar, moments de comunitat guiats i accés digital que connecta tot el recorregut.", caption:"Primer, llocs reals. Després, la capa digital facilita entrar, repetir i reconèixer el recorregut." },
    beliefs:{ eyebrow:"El que creiem", title:"Tres canvis defineixen el món per al qual s'ha creat Crays.", items:[item("L'habitatge es converteix en una marca d'estil de vida","Llars, hotels, espais de treball i comunitats haurien de funcionar plegats en comptes de sentir-se fragmentats."),item("Els nòmades digitals ja no són un nínxol","La feina independent de la ubicació s'ha generalitzat i la infraestructura s'hi ha de posar al dia."),item("El treball remot transforma els immobles","La feina és més flexible, però encara necessitem llocs per concentrar-nos, trobar-nos, recuperar-nos i generar confiança.")] },
    vision:{ eyebrow:"Visió", title:"Un poble global fet d'espais reals, no només de xarxes digitals.", body:"Crays està pensat com una capa urbana d'estil de vida: llars, espais de treball, hospitalitat local, esdeveniments, marques col·laboradores i accés digital en un sistema reconeixible.", statement:"No es tracta de decorar edificis, sinó de fer que els llocs siguin bases socials, productives i emocionals útils per a les persones en moviment.", pillars:[item("Lloc","Llars, salons i espais de club seleccionats."),item("Persones","Membres afins, amfitrions locals i cercles empresarials."),item("Tecnologia","Una capa mòbil per descobrir, accedir i participar en la comunitat."),item("Marca","Una identitat comuna per viure, treballar i viatjar.")], cityCaption:"Energia urbana, hospitalitat i moments privats de comunitat connectats per una mateixa lògica de marca.", nomadCaption:"Els nòmades digitals mostren cap on avança el mercat: feina, viatges i vida ja no són compartiments separats." },
    nomads:{ eyebrow:"Nòmades digitals", title:"La força laboral mòbil és el senyal, no l'excepció.", body:"Els nòmades digitals combinen treball remot i viatges per motius i períodes diferents. Alguns es desplacen durant anys; d'altres, per temporades o entre projectes. No els uneix el caos, sinó la necessitat d'un habitatge fiable, bons entorns de treball i una comunitat que els pugui acompanyar.", items:[item("Triar l'oficina","Treballa des d'un saló, un club, una base urbana o una llar a la costa."),item("Mantenir les rutines","Conserva la productivitat encara que canviïn el lloc i el context."),item("Conèixer persones reals","Converteix els viatges en relacions, no només en contingut."),item("Viure amb varietat","Els llocs nous aporten energia sense perdre estabilitat.")] },
    remote:{ eyebrow:"Treball remot", title:"El treball remot funciona millor quan les persones continuen tenint un lloc on arribar.", body:"El treball remot va eliminar l'oficina com a única opció, però no la necessitat de concentració, connexió d'equip, hospitalitat i entorns saludables. Crays el tracta com un estil de vida i un model operatiu, no com un avantatge temporal ni una tendència limitada al portàtil.", items:["Entorns de treball fiables per a persones, equips i estades de projecte.","Habitatges que afavoreixen la productivitat, el descans i les rutines diàries.","Moments de comunitat que ajuden a retrobar-se en persona.","Models immobiliaris flexibles per a empreses i socis de propietats."] },
    flow:{ eyebrow:"El recorregut Crays", title:"Arribar, treballar, viure i pertànyer en una capa connectada.", items:[item("Arribada","Els membres arriben a una ciutat i ja disposen d'una base reconeixible."),item("Treballar i viure","La feina concentrada, les rutines i el descans conviuen en la mateixa capa d'estil de vida guiada."),item("Pertànyer","La xarxa es fa real mitjançant sopars, esdeveniments, presentacions i rituals diaris.")] },
    short:{ eyebrow:"En poques paraules", title:"Crays crea llocs on els ciutadans globals poden pertànyer abans d'establir-s'hi.", body:"Crays és l'estructura comuna que connecta clubs, conceptes residencials, moments comunitaris i accés digital. Converteix la mobilitat en una experiència real connectada, no en una successió d'estades aïllades.", cta:"Coneix l'equip" },
    mediaAlt:{solo:"Una persona treballa amb un portàtil i un telèfon en una cafeteria compartida.",conversation:"Dos companys conversen amb portàtils en una cafeteria.",group:"Un grup divers es reuneix al voltant d'una taula per a una sessió de treball."},
  }),
  fr: liveLocale({
    localeName:"Français", metaTitle:"À propos | CRAYS Club", metaDescription:"Crays crée une infrastructure sociale pour les personnes qui travaillent à distance, se déplacent dans le monde et ont toujours besoin d'une véritable communauté.", shell:frShell,
    hero:{ eyebrow:"À propos", title:"Nous construisons la dimension réelle pour les personnes en mouvement.", body:"Crays relie habitat, travail, voyage et communauté dans un système identifiable destiné aux créateurs, fondateurs, voyageurs d'affaires et citoyens du monde qui veulent rester libres sans perdre leurs repères.", primary:"Devenir membre", secondary:"Explorer le modèle", signals:["Lieux","Personnes","Technologie","Appartenance"], caption:"Une dimension Crays\nhabitats, salons, espaces de travail, événements et accès numérique." },
    idea:{ eyebrow:"L'idée", title:"La liberté ne fonctionne que lorsque l'essentiel est déjà pris en charge.", body:"Les personnes veulent des vies flexibles, les entreprises ont besoin de meilleurs modèles de travail et les villes doivent offrir des lieux où les personnes mobiles peuvent réellement trouver leur place. Crays y répond avec des habitats de marque, des environnements prêts pour le travail, des moments communautaires animés et un accès numérique qui relie tout le parcours.", caption:"D'abord des lieux réels. Puis la couche numérique rend le parcours plus simple à rejoindre, à répéter et à reconnaître." },
    beliefs:{ eyebrow:"Ce que nous croyons", title:"Trois évolutions définissent le monde pour lequel Crays est conçu.", items:[item("L'habitat devient une marque d'art de vivre","Habitats, hôtels, espaces de travail et communautés doivent fonctionner ensemble plutôt que rester fragmentés."),item("Les nomades numériques ne sont plus une niche","Le travail indépendant du lieu est devenu courant et les infrastructures doivent suivre."),item("Le travail à distance transforme l'immobilier","Le travail devient plus flexible, mais chacun a encore besoin de lieux pour se concentrer, se rencontrer, récupérer et créer de la confiance.")] },
    vision:{ eyebrow:"Vision", title:"Un village mondial composé de vrais espaces, pas seulement de réseaux en ligne.", body:"Crays est conçu comme une dimension urbaine moderne d'art de vivre : des lieux où se sentir chez soi, des espaces de travail, une hospitalité locale, des événements, des marques partenaires et un accès numérique réunis dans un système identifiable.", statement:"Il ne s'agit pas de décorer des bâtiments, mais de rendre les lieux utiles comme bases sociales, productives et émotionnelles pour les personnes en mouvement.", pillars:[item("Lieu","Habitats, salons et espaces de club sélectionnés."),item("Personnes","Membres partageant les mêmes valeurs, hôtes locaux et cercles d'affaires."),item("Technologie","Une couche mobile pour la découverte, l'accès et la communauté."),item("Marque","Une identité commune pour habiter, travailler et voyager.")], cityCaption:"Énergie urbaine, hospitalité et moments communautaires privés reliés par une même logique de marque.", nomadCaption:"Les nomades numériques montrent la direction du marché : travail, voyage et vie ne sont plus des compartiments séparés." },
    nomads:{ eyebrow:"Nomades numériques", title:"La main-d'œuvre mobile est le signal, pas l'exception.", body:"Les nomades numériques associent travail à distance et voyage pour des raisons et des durées variées. Certains se déplacent pendant des années, d'autres selon les saisons ou les projets. Ce qui les relie n'est pas le chaos, mais le besoin d'un habitat fiable, de bons environnements de travail et d'une communauté qui puisse les accompagner.", items:[item("Choisir son bureau","Travaillez depuis un salon, un club, une base urbaine ou une maison sur la côte."),item("Garder ses habitudes","Restez productif même lorsque le lieu et le contexte changent."),item("Rencontrer de vraies personnes","Transformez les voyages en relations, pas seulement en contenu."),item("Vivre dans la diversité","De nouveaux lieux apportent une énergie nouvelle sans sacrifier la stabilité.")] },
    remote:{ eyebrow:"Travail à distance", title:"Le travail à distance fonctionne mieux lorsque chacun garde un lieu où arriver.", body:"Le travail à distance a supprimé le bureau comme unique référence, mais pas le besoin de concentration, de lien d'équipe, d'hospitalité et d'un environnement sain. Crays le considère comme un mode de vie et d'organisation, pas comme un avantage temporaire ou une tendance limitée à l'ordinateur portable.", items:["Des environnements de travail fiables pour les personnes, les équipes et les séjours de projet.","Des habitats qui favorisent la productivité, la récupération et les habitudes quotidiennes.","Des moments communautaires qui aident les travailleurs à distance à se retrouver en personne.","Une logique immobilière flexible pour les entreprises et les partenaires immobiliers."] },
    flow:{ eyebrow:"Le parcours Crays", title:"Arriver, travailler, vivre et appartenir à une même dimension connectée.", items:[item("Arrivée","Les membres arrivent dans une ville et disposent déjà d'une base familière."),item("Travailler et vivre","Travail concentré, habitudes quotidiennes et récupération se déroulent dans la même dimension d'art de vivre accompagnée."),item("Appartenir","Le réseau devient réel grâce aux dîners, événements, présentations et rituels quotidiens.")] },
    short:{ eyebrow:"En bref", title:"Crays crée des lieux où les citoyens du monde peuvent trouver leur place avant de s'installer.", body:"Crays est la structure commune qui relie espaces de club, concepts d'habitat, moments communautaires et accès numérique. Elle transforme la mobilité en une expérience réelle connectée plutôt qu'en une série de séjours isolés.", cta:"Découvrir l'équipe" },
    mediaAlt:{solo:"Une personne travaille avec un ordinateur portable et un téléphone dans un café partagé.",conversation:"Deux collègues échangent avec leurs ordinateurs portables dans un café.",group:"Un groupe diversifié se réunit autour d'une table pour une séance de travail."},
  }),
  pt: liveLocale({
    localeName:"Português", metaTitle:"Sobre nós | CRAYS Club", metaDescription:"A Crays cria infraestrutura social para pessoas que trabalham remotamente, circulam pelo mundo e continuam a precisar de uma comunidade real.", shell:ptShell,
    hero:{ eyebrow:"Sobre nós", title:"Construímos a dimensão do mundo real para pessoas em movimento.", body:"A Crays liga habitação, trabalho, viagens e comunidade num sistema reconhecível para criadores, fundadores, viajantes de negócios e cidadãos globais que precisam de liberdade sem perder estrutura.", primary:"Tornar-se membro", secondary:"Explorar o modelo", signals:["Lugar","Pessoas","Tecnologia","Pertença"], caption:"Uma dimensão Crays\ncasas, salas, espaços de trabalho, eventos e acesso digital." },
    idea:{ eyebrow:"A ideia", title:"A liberdade só funciona quando o essencial já está assegurado.", body:"As pessoas querem vidas flexíveis, as empresas precisam de melhores modelos de trabalho e as cidades necessitam de lugares onde pessoas móveis possam realmente pertencer. A Crays responde com habitação de marca, ambientes preparados para trabalhar, momentos de comunidade acompanhados e acesso digital que liga todo o percurso.", caption:"Primeiro, lugares reais. Depois, a camada digital torna o percurso mais fácil de iniciar, repetir e reconhecer." },
    beliefs:{ eyebrow:"Aquilo em que acreditamos", title:"Três mudanças definem o mundo para o qual a Crays foi criada.", items:[item("A habitação torna-se uma marca de estilo de vida","Casas, hotéis, espaços de trabalho e comunidades devem funcionar em conjunto, em vez de parecerem fragmentados."),item("Os nómadas digitais já não são um nicho","O trabalho independente da localização tornou-se comum e a infraestrutura tem de acompanhar."),item("O trabalho remoto transforma o imobiliário","O trabalho é mais flexível, mas continuamos a precisar de lugares para nos concentrarmos, encontrarmos, recuperarmos e criarmos confiança.")] },
    vision:{ eyebrow:"Visão", title:"Uma aldeia global feita de espaços reais, não apenas de redes online.", body:"A Crays foi concebida como uma dimensão urbana moderna de estilo de vida: lugares para chamar casa, espaços de trabalho, hospitalidade local, eventos, marcas parceiras e acesso digital num sistema reconhecível.", statement:"O objetivo não é decorar edifícios. É tornar os lugares úteis como bases sociais, produtivas e emocionais para pessoas em movimento.", pillars:[item("Lugar","Casas, salas e espaços de clube selecionados."),item("Pessoas","Membros com afinidades, anfitriões locais e círculos de negócios."),item("Tecnologia","Uma camada móvel para descoberta, acesso e comunidade."),item("Marca","Uma identidade comum para habitação, trabalho e viagens.")], cityCaption:"Energia urbana, hospitalidade e momentos comunitários privados ligados por uma mesma lógica de marca.", nomadCaption:"Os nómadas digitais mostram para onde o mercado está a avançar: trabalho, viagens e vida já não são compartimentos separados." },
    nomads:{ eyebrow:"Nómadas digitais", title:"A força de trabalho móvel é o sinal, não a exceção.", body:"Os nómadas digitais combinam trabalho remoto e viagens por diferentes motivos e períodos. Alguns deslocam-se durante anos; outros, por épocas ou entre projetos. Não é o caos que os une, mas a necessidade de habitação fiável, bons ambientes de trabalho e uma comunidade que os possa acompanhar.", items:[item("Escolher o escritório","Trabalhe a partir de uma sala, de um clube, de uma base urbana ou de uma casa costeira."),item("Manter as rotinas","Continue produtivo mesmo quando o lugar e o contexto mudam."),item("Conhecer pessoas reais","Transforme viagens em relações, não apenas em conteúdo."),item("Viver com variedade","Novos lugares podem trazer nova energia sem perder estabilidade.")] },
    remote:{ eyebrow:"Trabalho remoto", title:"O trabalho remoto funciona melhor quando as pessoas continuam a ter um lugar onde chegar.", body:"O trabalho remoto retirou ao escritório o papel de única opção, mas não eliminou a necessidade de foco, ligação da equipa, hospitalidade e ambientes saudáveis. A Crays trata-o como um estilo de vida e modelo operacional, não como um benefício temporário ou uma tendência limitada ao portátil.", items:["Ambientes de trabalho fiáveis para pessoas, equipas e estadias de projeto.","Casas que apoiam produtividade, recuperação e rotinas diárias.","Momentos de comunidade que ajudam trabalhadores remotos a reencontrarem-se pessoalmente.","Modelos imobiliários flexíveis para empresas e parceiros de propriedades."] },
    flow:{ eyebrow:"O percurso Crays", title:"Chegar, trabalhar, viver e pertencer numa dimensão ligada.", items:[item("Chegada","Os membros chegam a uma cidade e já encontram uma base reconhecível."),item("Trabalhar e viver","Trabalho focado, rotinas diárias e recuperação acontecem na mesma dimensão de estilo de vida acompanhada."),item("Pertencer","A rede torna-se real através de jantares, eventos, apresentações e rituais diários.")] },
    short:{ eyebrow:"Em resumo", title:"A Crays cria lugares onde cidadãos globais podem pertencer antes de se estabelecerem.", body:"A Crays é a estrutura comum por trás de espaços de clube, conceitos de habitação, momentos comunitários e acesso digital. Transforma a mobilidade numa experiência real ligada, em vez de uma sequência de estadias isoladas.", cta:"Conhecer a equipa" },
    mediaAlt:{solo:"Uma pessoa trabalha com portátil e telefone num café partilhado.",conversation:"Dois colegas conversam com portáteis num café.",group:"Um grupo diverso reúne-se à volta de uma mesa para uma sessão de trabalho."},
  }),
  it: liveLocale({
    localeName:"Italiano", metaTitle:"Chi siamo | CRAYS Club", metaDescription:"Crays crea infrastrutture sociali per persone che lavorano da remoto, si muovono nel mondo e hanno comunque bisogno di una comunità reale.", shell:itShell,
    hero:{ eyebrow:"Chi siamo", title:"Costruiamo la dimensione del mondo reale per persone in movimento.", body:"Crays collega abitare, lavoro, viaggi e comunità in un sistema riconoscibile per creator, founder, viaggiatori d'affari e cittadini globali che cercano libertà senza perdere struttura.", primary:"Diventa membro", secondary:"Scopri il modello", signals:["Luogo","Persone","Tecnologia","Appartenenza"], caption:"Una dimensione Crays\ncase, lounge, spazi di lavoro, eventi e accesso digitale." },
    idea:{ eyebrow:"L'idea", title:"La libertà funziona solo quando l'essenziale è già gestito.", body:"Le persone desiderano vite flessibili, le aziende hanno bisogno di modelli di lavoro migliori e le città devono offrire luoghi in cui chi si sposta possa sentirsi davvero parte di una comunità. Crays risponde con abitazioni di marca, ambienti pronti per il lavoro, momenti di comunità guidati e un accesso digitale che collega l'intero percorso.", caption:"Prima i luoghi reali. Poi il livello digitale rende il percorso più semplice da iniziare, ripetere e riconoscere." },
    beliefs:{ eyebrow:"In cosa crediamo", title:"Tre cambiamenti definiscono il mondo per cui Crays è stato creato.", items:[item("L'abitare diventa un marchio di stile di vita","Case, hotel, spazi di lavoro e comunità dovrebbero funzionare insieme invece di apparire frammentati."),item("I nomadi digitali non sono più una nicchia","Il lavoro indipendente dalla posizione è diventato comune e l'infrastruttura deve adeguarsi."),item("Il lavoro da remoto trasforma gli immobili","Il lavoro è più flessibile, ma servono ancora luoghi per concentrarsi, incontrarsi, recuperare e costruire fiducia.")] },
    vision:{ eyebrow:"Visione", title:"Un villaggio globale fatto di spazi reali, non solo di reti online.", body:"Crays è concepito come una dimensione urbana contemporanea dello stile di vita: luoghi da chiamare casa, spazi di lavoro, ospitalità locale, eventi, brand partner e accesso digitale in un sistema riconoscibile.", statement:"Non si tratta di decorare edifici. Si tratta di rendere i luoghi utili come basi sociali, produttive ed emotive per persone in movimento.", pillars:[item("Luogo","Case, lounge e spazi club selezionati."),item("Persone","Membri affini, host locali e circoli d'affari."),item("Tecnologia","Un livello mobile per scoperta, accesso e comunità."),item("Brand","Un'identità condivisa tra abitare, lavoro e viaggi.")], cityCaption:"Energia urbana, ospitalità e momenti privati di comunità collegati da una stessa logica di brand.", nomadCaption:"I nomadi digitali mostrano dove si sta muovendo il mercato: lavoro, viaggi e vita non sono più compartimenti separati." },
    nomads:{ eyebrow:"Nomadi digitali", title:"La forza lavoro mobile è il segnale, non l'eccezione.", body:"I nomadi digitali combinano lavoro da remoto e viaggi per motivi e periodi diversi. Alcuni si spostano per anni, altri stagionalmente o tra un progetto e l'altro. Non li unisce il caos, ma la necessità di abitazioni affidabili, buoni ambienti di lavoro e una comunità che possa accompagnarli.", items:[item("Scegliere l'ufficio","Lavora da una lounge, un club, una base urbana o una casa sulla costa."),item("Mantenere le abitudini","Resta produttivo anche quando cambiano luogo e contesto."),item("Incontrare persone reali","Trasforma i viaggi in relazioni, non solo in contenuti."),item("Vivere la varietà","Nuovi luoghi possono dare nuova energia senza perdere stabilità.")] },
    remote:{ eyebrow:"Lavoro da remoto", title:"Il lavoro da remoto funziona meglio quando le persone hanno ancora un luogo in cui arrivare.", body:"Il lavoro da remoto ha eliminato l'ufficio come unica scelta, ma non il bisogno di concentrazione, connessione del team, ospitalità e ambienti sani. Crays lo considera uno stile di vita e un modello operativo, non un vantaggio temporaneo o una tendenza limitata al laptop.", items:["Ambienti di lavoro affidabili per persone, team e soggiorni di progetto.","Abitazioni che sostengono produttività, recupero e abitudini quotidiane.","Momenti di comunità che aiutano chi lavora da remoto a ritrovarsi di persona.","Modelli immobiliari flessibili per aziende e partner immobiliari."] },
    flow:{ eyebrow:"Il percorso Crays", title:"Arrivare, lavorare, vivere e appartenere in una dimensione connessa.", items:[item("Arrivo","I membri arrivano in una città e trovano già una base riconoscibile."),item("Lavorare e vivere","Lavoro concentrato, abitudini quotidiane e recupero avvengono nella stessa dimensione di stile di vita guidata."),item("Appartenere","La rete diventa reale attraverso cene, eventi, presentazioni e rituali quotidiani.")] },
    short:{ eyebrow:"In breve", title:"Crays crea luoghi in cui i cittadini globali possono appartenere prima di stabilirsi.", body:"Crays è la struttura condivisa che collega spazi club, concetti abitativi, momenti di comunità e accesso digitale. Trasforma la mobilità in un'esperienza reale connessa invece che in una serie di soggiorni separati.", cta:"Scopri il team" },
    mediaAlt:{solo:"Una persona lavora con laptop e telefono in un caffè condiviso.",conversation:"Due colleghi conversano con i laptop in un caffè.",group:"Un gruppo eterogeneo si riunisce attorno a un tavolo per una sessione di lavoro."},
  }),
};
