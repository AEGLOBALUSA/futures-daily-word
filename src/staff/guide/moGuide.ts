/**
 * The Guide panel's content for Daily Word's staff side (/staff), FUT-45.
 * English and Spanish follow the staff language. The reader app does
 * not import this file. Labels named in the steps are the ones the staff
 * screens show (StaffApp.tsx, CornerDraftCard.tsx, PrayerCare.tsx, QuickNotes.tsx).
 */

import { t } from '../../utils/i18n';

// Local copy of the shared contract (CONTRACT.md section 2).
export interface MoGuideLink { label: string; href: string }

export interface MoGuidePart {
  slug: string;
  title: string;
  intro: string;
  body?: string;
  steps?: string[];
  routes?: string[];
  next?: MoGuideLink;
  connects?: { title: string; how: string; slug?: string; href?: string }[];
}

export interface MoGuideJob { title: string; steps: string[]; href?: string }

export interface MoGuideLabels {
  open: string; close: string; title: string; onThisScreen: string;
  why: string; who: string; howTo: string; parts: string; connects: string; back: string;
  map: string; full: string; goThere: string;
}

export interface MoGuideContent {
  app: string;
  lang?: string;
  why: { body: string; who: string };
  howTo: MoGuideJob[];
  parts: MoGuidePart[];
  fullGuide?: MoGuideLink;
  mapHref?: string | null;
  labels?: Partial<MoGuideLabels>;
}

/** Who is signed in. Left out, every part and job is returned. */
export interface MoGuideViewer { isAdmin: boolean; role: string }

export function getMoGuideContent(viewer?: MoGuideViewer, lang = 'en'): MoGuideContent {
  const copy = (en: string, es: string) => lang === 'es' ? es : en;
  const es = (key: string) => t(key, 'es');
  const admin = !viewer || viewer.isAdmin || viewer.role === 'admin';
  const role = viewer?.role;
  // Same gates as StaffApp: Sunday's notes for hub, media and admin; the corner
  // for campus and admin; prayer care for hub, campus and admin.
  const canNotes = admin || role === 'hub' || role === 'media';
  const canHub = admin || role === 'hub';
  const canMedia = admin || role === 'hub' || role === 'media';
  const canCorner = admin || role === 'campus';
  const canPrayer = admin || role === 'hub' || role === 'campus';

  const howTo: MoGuideJob[] = [];
  if (canNotes) {
    howTo.push({
      title: copy('Paste Sunday’s notes', es('staff_notes_card_title')),
      href: '/staff?tab=notes',
      steps: [
        copy('Open Staff home and tap Paste Sunday’s notes.', `Abre el inicio del equipo y toca «${es('staff_notes_card_title')}».`),
        copy('Paste the notes or the YouTube link into the box.', "Pega las notas o el enlace de YouTube en el recuadro."),
        copy('Tap See the notes page. The app works out the Sunday, title, speaker and series.', `Toca «${es('staff_quick_read')}». La app identifica el domingo, el título, quién predica y la serie.`),
        copy('If it asks one more question, answer it and tap Add it to the notes.', `Si te hace otra pregunta, respóndela y toca «${es('staff_quick_answer')}».`),
        copy('Check the page it shows you, then tap Put this on the congregation page.', `Revisa la página que te muestra y toca «${es('staff_publish_notes')}».`),
      ],
    });
  }
  if (canHub) {
    howTo.push({
      title: copy('Put up this week’s sermon notes', es('staff_hub_card_title')),
      href: '/staff',
      steps: [
        copy('Open Staff home and tap Put up this week’s sermon notes.', `Abre el inicio del equipo y toca «${es('staff_hub_card_title')}».`),
        copy('Under Which church is this for?, pick the church whose page this is.', `En «${es('staff_church_question')}», elige la iglesia a la que pertenece la página.`),
        copy('Answer the numbered questions and paste your notes.', "Responde las preguntas numeradas y pega tus notas."),
        copy('Tap Put this on the congregation page.', `Toca «${es('staff_publish_notes')}».`),
        copy('Tap Open the page (it names the church) to see it as people will.', "Toca «Abrir la página de…» (el botón incluye el nombre de la iglesia) para verla como la verá la congregación."),
      ],
    });
  }
  if (canMedia) {
    howTo.push({
      title: copy('Add the sermon video link', "Añade el enlace del video del sermón"),
      href: '/staff',
      steps: [
        copy('Open Staff home and tap Add the YouTube or clean the notes.', `Abre el inicio del equipo y toca «${es('staff_media_card_title')}».`),
        copy('Pick the sermon the video belongs to.', "Elige el sermón al que pertenece el video."),
        copy('Paste the YouTube link.', "Pega el enlace de YouTube."),
        copy('Tap Add the video. The notes already on the page stay as they are.', `Toca «${es('staff_add_video')}». Las notas ya publicadas en la página se quedan como están.`),
      ],
    });
  }
  if (canCorner) {
    howTo.push({
      title: copy('Write the campus corner', "Escribe el rincón del campus"),
      href: '/staff',
      steps: [
        copy('On Staff home, find the draft for this week’s corner and read it.', "En el inicio del equipo, busca el borrador del rincón de esta semana y léelo."),
        copy('Change the words yourself, or add something only you would say.', "Edita el texto o añade algo que solo tú dirías."),
        copy('Tap Put this on the campus corner.', `Toca «${es('corner_draft_publish')}».`),
        copy('If there is no corner this week, tap Not this week.', `Si no habrá rincón esta semana, toca «${es('corner_draft_skip')}».`),
        copy('To write it from scratch, tap Use the form instead, or Update a campus corner on Staff home.', `Para escribirlo desde cero, toca «${es('corner_draft_use_form')}» o «${es('staff_campus_card_title')}» en el inicio del equipo.`),
      ],
    });
  }
  if (canPrayer) {
    howTo.push({
      title: copy('Read prayer requests', "Lee las peticiones de oración"),
      href: '/staff',
      steps: [
        copy('On Staff home, look for Needs you. Each line is a request waiting for a person.', "En el inicio del equipo, busca «Necesita tu atención». Cada línea es una petición que espera la atención de alguien."),
        copy('If the person gave a name, tap Write to followed by their name, and send your note.', "Si la persona dio su nombre, toca «Escríbele a» seguido de su nombre y envía tu mensaje."),
        copy('Afterward tap I wrote to followed by their name. If you only prayed, tap I prayed for this.', `Después toca «Le escribí a» seguido de su nombre. Si solo oraste, toca «${es('prayer_care_i_prayed')}».`),
        copy('Under Prayer requests this week, read the week at a glance.', `En «${es('prayer_care_week')}», repasa las peticiones de la semana.`),
      ],
    });
  }

  const parts: MoGuidePart[] = [
    {
      slug: 'staff-home',
      title: copy('Staff home', "Inicio del equipo"),
      intro: copy('The first screen: one card for each job you can do, and prayer care at the top when something is waiting.', "La primera pantalla: una tarjeta por cada tarea que puedes hacer y, arriba, las peticiones de oración que necesitan atención."),
      steps: [
        copy('Pick the card for the job you came to do.', "Elige la tarjeta de la tarea que viniste a hacer."),
        copy('Use ← Staff home on any other screen to come back here.', `Usa «${es('staff_home_link')}» en cualquier otra pantalla para volver aquí.`),
      ],
      routes: ['/staff'],
      connects: [
        { title: copy('The reader app', "La app de la congregación"), how: copy('Everything you save here shows up for the people who read Daily Word.', "Todo lo que guardas aquí aparece para quienes leen Daily Word.") },
      ],
    },
  ];

  if (canNotes) {
    parts.push({
      slug: 'sundays-notes',
      title: copy('Paste Sunday’s notes', es('staff_notes_card_title')),
      intro: copy('One box: paste the notes or the YouTube link and see the page before it goes up.', "Un solo recuadro: pega las notas o el enlace de YouTube y revisa la página antes de publicarla."),
      steps: [
        copy('Paste Sunday’s notes or the YouTube link, then tap See the notes page.', `Pega las notas del domingo o el enlace de YouTube y toca «${es('staff_quick_read')}».`),
        copy('Nothing is on the congregation page until you tap Put this on the congregation page.', `No se publica nada en la página de la congregación hasta que toques «${es('staff_publish_notes')}».`),
        copy('To fix a detail, tap Change details. To begin again, tap Paste something else.', `Para corregir un detalle, toca «${es('staff_quick_change')}». Para empezar de nuevo, toca «${es('staff_quick_start_over')}».`),
      ],
      next: { label: copy('Paste Sunday’s notes', es('staff_notes_card_title')), href: '/staff?tab=notes' },
      connects: [
        { title: 'Sermon Prep', how: copy('This fills the same Sermon Notes page as Sermon Prep’s Send to Sunday.', "Esto llena la misma página de notas del sermón que «Send to Sunday» de Sermon Prep.") },
        { title: copy('The reader app’s Sermon Notes page', "La página de notas del sermón de la app de la congregación"), how: copy('Each church has its own page. People pick theirs from the banner in the app.', "Cada iglesia tiene su propia página. Cada persona elige la suya desde el banner de la app.") },
      ],
    });
  }
  if (canHub || canMedia) {
    parts.push({
      slug: 'sermon-notes-form',
      title: copy('Sermon notes and YouTube', "Notas del sermón y YouTube"),
      intro: copy('The longer form for the week’s message, when you want every detail in front of you.', "El formulario completo del mensaje de la semana, para cuando quieras ver todos los detalles."),
      steps: [
        copy('Hub staff tap Put up this week’s sermon notes. Media staff tap Add the YouTube or clean the notes.', `El equipo central toca «${es('staff_hub_card_title')}». El equipo de medios toca «${es('staff_media_card_title')}».`),
        copy('Pick the church under Which church is this for?', `Elige la iglesia en «${es('staff_church_question')}».`),
        copy('Save with Put this on the congregation page, or Add the video when you are only adding a link.', `Guarda con «${es('staff_publish_notes')}» o con «${es('staff_add_video')}» si solo vas a añadir un enlace.`),
      ],
      next: { label: copy('Open Staff home', "Abre el inicio del equipo"), href: '/staff' },
      connects: [
        { title: 'Sermon Prep', how: copy('Sermon Prep’s Send to Sunday fills the same page.', "«Send to Sunday» de Sermon Prep llena la misma página.") },
        { title: copy('Paste Sunday’s notes', es('staff_notes_card_title')), how: copy('The quicker way in for most weeks.', "La forma más rápida de hacerlo la mayoría de las semanas."), slug: 'sundays-notes' },
      ],
    });
  }
  if (canCorner) {
    parts.push({
      slug: 'campus-corner',
      title: copy('Campus corner', es('staff_campus_form_title')),
      intro: copy('A short note for your campus: what is on this week, and a prayer point if you have one.', "Una nota breve para tu campus: qué hay esta semana y una petición de oración si tienes una."),
      steps: [
        copy('Read the draft. Add your own words, or change the words above.', "Lee el borrador. Añade tus propias palabras o edita el texto de arriba."),
        copy('Tap Put this on the campus corner.', `Toca «${es('corner_draft_publish')}».`),
        copy('Tap Not this week if there will be no corner.', `Toca «${es('corner_draft_skip')}» si no habrá rincón esta semana.`),
        copy('Tap Use the form instead if you would rather write it yourself.', `Toca «${es('corner_draft_use_form')}» si prefieres escribirlo tú.`),
      ],
      next: { label: copy('Open Staff home', "Abre el inicio del equipo"), href: '/staff' },
      connects: [
        { title: copy('The reader app', "La app de la congregación"), how: copy('People at your campus see it under Campus.', "La gente de tu campus lo ve en Sede.") },
        { title: copy('Sunday’s message', "El mensaje del domingo"), how: copy('The draft starts from the message that went up for Sunday.', "El borrador parte del mensaje publicado para el domingo.") },
      ],
    });
  }
  if (canPrayer) {
    parts.push({
      slug: 'prayer-care',
      title: copy('Prayer and care', "Oración y cuidado pastoral"),
      intro: copy('Prayer requests that need a person to look, write, or pray.', "Peticiones de oración que necesitan que alguien las revise, escriba o dedique un momento a orar."),
      steps: [
        copy('A request held for a look shows Show it on the wall and Keep it private.', `Una petición pendiente de revisión muestra «${es('prayer_care_show')}» y «${es('prayer_care_private')}».`),
        copy('Under Needs you, tap Write to followed by the name, or I prayed for this when there is no name.', `En «Necesita tu atención», toca «Escríbele a» seguido del nombre o «${es('prayer_care_i_prayed')}» si no hay nombre.`),
        copy('Prayer requests this week lists the last seven days.', `«${es('prayer_care_week')}» muestra los últimos siete días.`),
      ],
      next: { label: copy('Open Staff home', "Abre el inicio del equipo"), href: '/staff' },
      connects: [
        { title: copy('The reader app’s prayer wall', "El muro de oración de la app de la congregación"), how: copy('These are the requests people post on the wall. The app sends them nothing; only what you write reaches them.', "Son las peticiones que la gente publica en el muro. La app no les envía nada; solo reciben lo que tú escribes.") },
      ],
    });
  }
  if (admin) {
    parts.push(
      {
        slug: 'history',
        title: copy('History', "Historial"),
        intro: copy('A record of what already went live, and the questions no one is asked now.', "Un registro de lo que ya se publicó y de las preguntas que ya no se hacen."),
        steps: [copy('Open History from Settings on Staff home.', "Abre «History» desde «Settings» en el inicio del equipo."), copy('Tap Ask this again to bring a switched-off question back.', "Toca «Ask this again» para volver a activar una pregunta.")],
        next: { label: copy('Open Staff home', "Abre el inicio del equipo"), href: '/staff' },
      },
      {
        slug: 'people',
        title: copy('People', "Personas"),
        intro: copy('Who can sign in to the staff side, and what each person can do.', "Quién puede entrar al área del equipo y qué puede hacer cada persona."),
        steps: [
          copy('Under Add or update, enter their email, name, role and campus, then tap Save person.', "En «Add or update», ingresa su correo, nombre, rol y campus, y toca «Save person»."),
          copy('Give them the setup code yourself. It works once.', "Entrégale el código de configuración personalmente. Solo sirve una vez."),
          copy('Tap Get a new setup code, or Let them set a new password, when someone is locked out.', "Toca «Get a new setup code» o «Let them set a new password» cuando alguien no pueda entrar."),
        ],
        next: { label: copy('Open Staff home', "Abre el inicio del equipo"), href: '/staff' },
      },
      {
        slug: 'campuses',
        title: copy('Campuses', "Campus"),
        intro: copy('The one list of campuses that readers see, in the order they see it.', "La lista única de campus que ve la congregación, en el orden en que aparecen."),
        steps: [
          copy('Tap a campus to change it, or Add a campus.', "Toca un campus para editarlo o «Add a campus» para añadir uno."),
          copy('Use Move up and Move down to set the order, and Hide from readers to take one off the list.', "Usa «Move up» y «Move down» para ordenar la lista y «Hide from readers» para ocultar un campus."),
          copy('Tap Save campus.', "Toca «Save campus»."),
        ],
        next: { label: copy('Open Staff home', "Abre el inicio del equipo"), href: '/staff' },
        connects: [
          { title: copy('The reader app', "La app de la congregación"), how: copy('This list feeds the campus picker readers use.', "Esta lista alimenta el selector de campus que usa la congregación.") },
        ],
      },
    );
  }

  return {
    app: 'Daily Word',
    lang: lang === 'es' ? 'es' : 'en',
    ...(lang === 'es' ? { labels: {
      open: 'Guía', close: 'Cerrar la guía', title: 'Guía', onThisScreen: 'En esta pantalla',
      why: 'Por qué existe {app}', who: 'Para quién es', howTo: 'Cómo usarla', parts: 'Cada sección',
      connects: 'Cómo se conecta', back: 'Volver', map: 'Cómo se conectan las apps de MultiplyOS',
      full: 'Guía completa', goThere: 'Ir a esta sección',
    } } : {}),
    why: {
      body: [
        copy('Daily Word is the daily devotional app the congregation reads. The staff side is where the church puts its own words into it.', "Daily Word es la app de devocionales diarios que lee la congregación. El área del equipo es donde la iglesia añade sus propias palabras."),
        copy('Staff put up the week’s sermon notes, the sermon video link and each campus’s corner, so readers meet this Sunday’s message all week.', "El equipo publica las notas del sermón de la semana, el enlace del video y el rincón de cada campus, para que la congregación siga profundizando en el mensaje del domingo durante la semana."),
        copy('It also shows prayer requests that people post, so a pastor can pray, write back, or decide what goes on the wall.', "También muestra las peticiones de oración que la gente publica, para que un pastor pueda orar, responder o decidir qué aparece en el muro."),
        copy('It fits with the other MultiplyOS apps that carry the Sunday message through the week: Sermon Prep sends its notes here, and Preach It Back picks up the same message.', "Se conecta con las otras apps de MultiplyOS que llevan el mensaje del domingo a toda la semana: Sermon Prep envía sus notas aquí y Preach It Back usa el mismo mensaje."),
      ].join('\n\n'),
      who: copy('Hub staff, media staff, campus pastors and admins.', "Equipo central, equipo de medios, pastores de campus y administradores."),
    },
    howTo,
    parts,
    mapHref: undefined,
  };
}
