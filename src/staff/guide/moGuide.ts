/**
 * The Guide panel's content for Daily Word's staff side (/staff), FUT-45.
 * English and Spanish copy. The reader app does not import this file.
 * Labels named in the steps are the ones the staff
 * screens show (StaffApp.tsx, CornerDraftCard.tsx, PrayerCare.tsx, QuickNotes.tsx).
 */

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
      title: copy('Paste Sunday’s notes', 'Pega las notas del domingo'),
      href: '/staff?tab=notes',
      steps: [
        copy('Open Staff home and tap Paste Sunday’s notes.', 'Abre Inicio del equipo y toca «Pega las notas del domingo».'),
        copy('If Sunday’s notes are already up, tap Put up a different version before you paste.', 'Si las notas del domingo ya están publicadas, toca «Subir otra versión» antes de pegar el contenido.'),
        copy('Paste the notes or the YouTube link into the box.', 'Pega las notas o el enlace de YouTube en el cuadro.'),
        copy('Tap See the notes page. The app works out the Sunday, title, speaker and series.', 'Toca «Ver la página de notas». La app identifica el domingo, el título, quién predica y la serie.'),
        copy('If it asks one more question, answer it and tap Add it to the notes.', 'Si te hace una pregunta más, respóndela y toca «Añadirlo a las notas».'),
        copy('If you pasted notes, check the page it shows you, then tap Put this on the congregation page. If you added a YouTube link to a message already up, tap Add the video.', 'Si pegaste notas, revisa la página que te muestra y toca «Ponlo en la página de la congregación». Si añadiste un enlace de YouTube a un mensaje ya publicado, toca «Añadir el video».'),
      ],
    });
  }
  if (canHub) {
    howTo.push({
      title: copy('Put up this week’s sermon notes', 'Publica las notas del sermón de esta semana'),
      href: '/staff',
      steps: [
        copy('Open Staff home and tap Put up this week’s notes (the Put up this week’s sermon notes card).', 'Abre Inicio del equipo y toca «Publica las notas de esta semana» (la tarjeta «Publica las notas del sermón de esta semana»).'),
        copy('Under Which church is this for?, pick the church whose page this is.', 'En «¿Para qué iglesia es?», elige la iglesia a la que pertenece la página.'),
        copy('Answer the numbered questions and paste your notes.', 'Responde las preguntas numeradas y pega tus notas.'),
        copy('Tap Put this on the congregation page.', 'Toca «Ponlo en la página de la congregación».'),
        copy('Tap Open the page (it names the church) to see it as people will.', 'Toca «Abrir la página de…» (incluye el nombre de la iglesia) para verla como la verá la congregación.'),
      ],
    });
  }
  if (admin || role === 'media') {
    howTo.push({
      title: copy('Add the sermon video link', 'Añade el enlace del video del sermón'),
      href: '/staff',
      steps: [
        copy('Open Staff home and tap Add the YouTube or clean the notes.', 'Abre Inicio del equipo y toca «Añade el enlace de YouTube o mejora las notas».'),
        copy('Pick the sermon the video belongs to.', 'Elige el sermón al que pertenece el video.'),
        copy('Paste the YouTube link.', 'Pega el enlace de YouTube.'),
        copy('Tap Add the video. The notes already on the page stay as they are.', 'Toca «Añadir el video a “{title}”». «{title}» es el título del mensaje. Las notas ya publicadas en la página quedan como están.'),
      ],
    });
  }
  if (canCorner) {
    howTo.push({
      title: copy('Write the campus corner', 'Escribe el rincón del campus'),
      href: '/staff',
      steps: [
        copy('If a draft for this week shows on Staff home, read it and use it there.', 'Si aparece un borrador para esta semana en Inicio del equipo, léelo y úsalo ahí.'),
        copy('On the draft, tap Put this on the campus corner.', 'En el borrador, toca «Ponlo en el rincón del campus».'),
        copy('On the draft, tap Not this week if there will be no corner.', 'En el borrador, toca «Esta semana no» si no habrá rincón.'),
        copy('On the draft, tap Use the form instead to write from scratch.', 'En el borrador, toca «Usar el formulario» para escribir desde cero.'),
        copy('If no draft shows, tap Update the campus corner (the Update a campus corner card) for the plain form.', 'Si no aparece un borrador, toca «Actualiza el rincón del campus» (la tarjeta «Actualiza el rincón de un campus») para abrir el formulario sencillo.'),
        copy('On the plain form, fill it in, then tap Put this on the campus corner. The plain form has no Not this week or Use the form instead button.', 'Completa el formulario sencillo y toca «Ponlo en el rincón del campus». Ese formulario no tiene los botones «Esta semana no» ni «Usar el formulario».'),
      ],
    });
  }
  if (canPrayer) {
    howTo.push({
      title: copy('Read prayer requests', 'Lee las peticiones de oración'),
      href: '/staff',
      steps: [
        copy('Only Needs you starts when your region is switched on. Held requests with Show it on the wall or Keep it private work now.', 'Solo «Necesita tu atención» empieza a funcionar cuando se activa tu región. Las peticiones pendientes de revisión con «Muéstrala en el muro» o «Mantenla privada» ya funcionan.'),
        copy('In Needs you, an anonymous line has I prayed for this. Tap it when you have prayed.', 'En «Necesita tu atención», una petición anónima tiene el botón «Oré por esto». Tócalo cuando hayas orado.'),
        copy('If the person gave a name, tap Write to followed by their name, and send your note.', 'Si la persona dejó su nombre, toca «Escríbele a» seguido de su nombre y envía tu mensaje.'),
        copy('When you return, answer Did you write to followed by their name? with I wrote to followed by their name or Not yet.', 'Cuando regreses, responde a «¿Le escribiste a…?» (con su nombre) con «Le escribí a» seguido de su nombre o «Todavía no».'),
        copy('Under Prayer requests this week, read the week at a glance.', 'En «Peticiones de oración de esta semana», consulta el resumen de la semana.'),
      ],
    });
  }

  const parts: MoGuidePart[] = [
    {
      slug: 'staff-home',
      title: copy('Staff home', 'Inicio del equipo'),
      intro: copy('The first screen: it opens on the job to do next, with the reason above its button.', 'La primera pantalla te muestra la siguiente tarea, con el motivo encima del botón.'),
      steps: [
        copy('Tap the main button. The line above it says why it is first.', 'Toca el botón principal. La línea de arriba explica por qué esa tarea va primero.'),
        copy('Every other job is a card below it.', 'Las demás tareas aparecen en tarjetas debajo.'),
        copy('Use ← Staff home on any other screen to come back here.', 'Usa «← Inicio del equipo» desde cualquier otra pantalla para volver aquí.'),
      ],
      routes: ['/staff'],
      connects: [
        { title: copy('The reader app', 'La app de la congregación'), how: copy('Everything you save here shows up for the people who read Daily Word.', 'Todo lo que guardas aquí aparece para quienes leen Palabra Diaria.') },
      ],
    },
  ];

  parts.push({
    slug: 'your-settings',
    title: copy('Text size and Face ID', 'Tamaño del texto y Face ID'),
    intro: copy('Your text size, and the Face ID lock that keeps Staff safe on your phone.', 'Tu tamaño del texto y el bloqueo con Face ID que protege el área del equipo en tu teléfono.'),
    steps: [
      copy('Tap Aa (Text size), choose a size, then tap Save. Your size follows you to every phone and computer you sign in on.', 'Toca Aa (Tamaño del texto), elige un tamaño y toca Guardar. Tu tamaño te acompaña en cada teléfono y computadora donde inicies sesión.'),
      copy('Staff opens with Face ID (or your fingerprint) to keep people’s details safe. Turn it on the first time it asks.', 'El área del equipo se abre con Face ID (o tu huella) para mantener seguros los datos de las personas. Actívalo la primera vez que te lo pida.'),
      copy('After 60 minutes away it asks again. Tap Use your password instead if Face ID does not work.', 'Después de 60 minutos sin usarla, te lo vuelve a pedir. Toca «Usar tu contraseña» si Face ID no funciona.'),
    ],
    next: { label: copy('Open Staff home', 'Abrir Inicio del equipo'), href: '/staff' },
  });

  if (canNotes) {
    parts.push({
      slug: 'sundays-notes',
      title: copy('Paste Sunday’s notes', 'Pega las notas del domingo'),
      intro: copy('One box: paste the notes or the YouTube link and see the page before it goes up.', 'Un solo cuadro: pega las notas o el enlace de YouTube y revisa la página antes de publicarla.'),
      steps: [
        copy('If Sunday’s notes are already up, tap Put up a different version. Then paste Sunday’s notes or the YouTube link and tap See the notes page.', 'Si las notas del domingo ya están publicadas, toca «Subir otra versión». Luego pega las notas del domingo o el enlace de YouTube y toca «Ver la página de notas».'),
        copy('For notes, tap Put this on the congregation page. For a YouTube link on a message already up, tap Add the video.', 'Para publicar notas, toca «Ponlo en la página de la congregación». Para añadir un enlace de YouTube a un mensaje ya publicado, toca «Añadir el video».'),
        copy('To fix a detail, tap Change details. To begin again, tap Paste something else.', 'Para corregir un detalle, toca «Cambiar detalles». Para empezar de nuevo, toca «Pegar otra cosa».'),
      ],
      next: { label: copy('Paste Sunday’s notes', 'Pega las notas del domingo'), href: '/staff?tab=notes' },
      connects: [
        { title: copy('Sermon Prep', 'Sermon Prep'), how: copy('This fills the same Sermon Notes page as Sermon Prep’s Send to Sunday.', 'Esto llena la misma página de notas del sermón que la opción de enviar al domingo de Sermon Prep.') },
        { title: copy('The reader app’s Sermon Notes page', 'La página de notas del sermón en la app de la congregación'), how: copy('Each church has its own page. People pick theirs from the banner in the app.', 'Cada iglesia tiene su propia página. Cada persona elige la suya desde el banner de la app.') },
      ],
    });
  }
  if (canHub || canMedia) {
    parts.push({
      slug: 'sermon-notes-form',
      title: copy('Sermon notes and YouTube', 'Notas del sermón y YouTube'),
      intro: copy('The longer form for the week’s message, when you want every detail in front of you.', 'El formulario completo para el mensaje de la semana, cuando quieres tener todos los detalles a la vista.'),
      steps: [
        copy('Hub staff tap Put up this week’s notes (the Put up this week’s sermon notes card). Media staff tap Add the YouTube or clean the notes.', 'Si eres del equipo central, toca «Publica las notas de esta semana» (la tarjeta «Publica las notas del sermón de esta semana»). Si eres del equipo de medios, toca «Añade el enlace de YouTube o mejora las notas».'),
        copy('Pick the church under Which church is this for?', 'Elige la iglesia en «¿Para qué iglesia es?».'),
        copy('Save with Put this on the congregation page, or Add the video when you are only adding a link.', 'Guarda con «Ponlo en la página de la congregación», o con «Añadir el video a “{title}”» si solo estás añadiendo un enlace. «{title}» es el título del mensaje.'),
      ],
      next: { label: copy('Open Staff home', 'Abrir Inicio del equipo'), href: '/staff' },
      connects: [
        { title: copy('Sermon Prep', 'Sermon Prep'), how: copy('Sermon Prep’s Send to Sunday fills the same page.', 'La opción de enviar al domingo de Sermon Prep llena la misma página.') },
        { title: copy('Paste Sunday’s notes', 'Pega las notas del domingo'), how: copy('The quicker way in for most weeks.', 'La forma más rápida de hacerlo la mayoría de las semanas.'), slug: 'sundays-notes' },
      ],
    });
  }
  if (canCorner) {
    parts.push({
      slug: 'campus-corner',
      title: copy('Campus corner', 'Rincón del campus'),
      intro: copy('A short note for your campus: what is on this week, and a prayer point if you have one.', 'Una nota breve para tu campus: qué hay esta semana y una petición de oración si tienes una.'),
      steps: [
        copy('If a draft appears, read it. Add your own words, or change the words above.', 'Si aparece un borrador, léelo. Añade tus propias palabras o cambia el texto de arriba.'),
        copy('On the draft, tap Put this on the campus corner.', 'En el borrador, toca «Ponlo en el rincón del campus».'),
        copy('On the draft, tap Not this week if there will be no corner.', 'En el borrador, toca «Esta semana no» si no habrá rincón.'),
        copy('On the draft, tap Use the form instead if you would rather write it yourself.', 'En el borrador, toca «Usar el formulario» si prefieres escribirlo tú.'),
        copy('On the plain form, fill it in, then tap Put this on the campus corner. It has no Not this week or Use the form instead button.', 'Completa el formulario sencillo y toca «Ponlo en el rincón del campus». No tiene los botones «Esta semana no» ni «Usar el formulario».'),
      ],
      next: { label: copy('Open Staff home', 'Abrir Inicio del equipo'), href: '/staff' },
      connects: [
        { title: copy('The reader app', 'La app de la congregación'), how: copy('People at your campus see it under Campus.', 'La gente de tu campus lo ve en «Sede».') },
        { title: copy('Sunday’s message', 'El mensaje del domingo'), how: copy('The draft starts from the message that went up for Sunday.', 'El borrador parte del mensaje que se publicó para el domingo.') },
      ],
    });
  }
  if (canPrayer) {
    parts.push({
      slug: 'prayer-care',
      title: copy('Prayer and care', 'Oración y cuidado pastoral'),
      intro: copy('Only Needs you starts when your region is switched on. Held requests and Prayer requests this week work now.', 'Solo «Necesita tu atención» empieza a funcionar cuando se activa tu región. Las peticiones pendientes de revisión y «Peticiones de oración de esta semana» ya funcionan.'),
      steps: [
        copy('Held requests work now. They show Show it on the wall and Keep it private.', 'Las peticiones pendientes de revisión ya funcionan. Muestran «Muéstrala en el muro» y «Mantenla privada».'),
        copy('Under Needs you, tap Write to followed by the name, or I prayed for this when there is no name.', 'En «Necesita tu atención», toca «Escríbele a» seguido del nombre, u «Oré por esto» si no hay nombre.'),
        copy('Prayer requests this week lists the last seven days.', '«Peticiones de oración de esta semana» muestra los últimos siete días.'),
      ],
      next: { label: copy('Open Staff home', 'Abrir Inicio del equipo'), href: '/staff' },
      connects: [
        { title: copy('The reader app’s prayer wall', 'El muro de oración de la app de la congregación'), how: copy('These are the requests people post on the wall. The app sends them nothing; only what you write reaches them.', 'Estas son las peticiones que las personas publican en el muro. La app no les envía nada; solo reciben lo que tú escribes.') },
      ],
    });
  }
  if (admin) {
    parts.push(
      {
        slug: 'history',
        title: copy('History', 'Historial'),
        intro: copy('A record of what already went live, and the questions no one is asked now.', 'Un registro de lo que ya se publicó y de las preguntas que ya no se le hacen a nadie.'),
        steps: [copy('Open History from Settings on Staff home.', 'Abre el historial desde los ajustes en Inicio del equipo.'), copy('Tap Ask this again to bring a switched-off question back.', 'Toca la opción de volver a preguntar para recuperar una pregunta desactivada.')],
        next: { label: copy('Open Staff home', 'Abrir Inicio del equipo'), href: '/staff' },
      },
      {
        slug: 'people',
        title: copy('People', 'Personas'),
        intro: copy('Who can sign in to the staff side, and what each person can do.', 'Quién puede entrar al área del equipo y qué puede hacer cada persona.'),
        steps: [
          copy('Under Add or update, enter their email (any address), name, role and campus, then tap Save person.', 'En la sección para añadir o actualizar, escribe su correo electrónico (cualquier dirección), nombre, rol y campus. Luego toca el botón para guardar a la persona.'),
          copy('If a setup code appears, give it to them yourself. It works once.', 'Si aparece un código de configuración, entrégaselo tú. Solo se puede usar una vez.'),
          copy('Tap Get a new setup code, or Let them set a new password, when someone is locked out.', 'Si alguien no puede entrar, toca la opción de obtener un nuevo código de configuración o la de permitirle crear una nueva contraseña.'),
          copy('Only Ashley can make someone an admin, or change another admin.', 'Solo Ashley puede convertir a alguien en administrador o modificar a otro administrador.'),
          copy('Ashley taps Make admin on a person’s row to give them full edit. It takes effect the next time they open Staff home.', 'Ashley toca «Make admin» en la fila de una persona para darle permisos completos de edición. Se aplica la próxima vez que abra Inicio del equipo.'),
        ],
        next: { label: copy('Open Staff home', 'Abrir Inicio del equipo'), href: '/staff' },
      },
      {
        slug: 'campuses',
        title: copy('Campuses', 'Campus'),
        intro: copy('The one list of campuses that readers see, in the order they see it.', 'La lista única de campus que ve la congregación, en el orden en que aparecen.'),
        steps: [
          copy('Tap a campus to change it, or Add a campus.', 'Toca un campus para modificarlo, o la opción de añadir un campus.'),
          copy('Use Move up and Move down to set the order, and Hide from readers to take one off the list.', 'Usa las opciones de subir y bajar para definir el orden, y la de ocultar a los lectores para quitar un campus de la lista.'),
          copy('Tap Save campus.', 'Toca el botón para guardar el campus.'),
        ],
        next: { label: copy('Open Staff home', 'Abrir Inicio del equipo'), href: '/staff' },
        connects: [
          { title: copy('The reader app', 'La app de la congregación'), how: copy('This list feeds the campus picker readers use.', 'Esta lista alimenta el selector de campus que usa la congregación.') },
        ],
      },
    );
  }

  return {
    app: copy('Daily Word', 'Palabra Diaria'),
    lang: copy('en', 'es'),
    why: {
      body: [
        copy('Daily Word is the daily devotional app the congregation reads. The staff side is where the church puts its own words into it.', 'Palabra Diaria es la app de devocionales diarios que lee la congregación. En el área del equipo, la iglesia añade sus propias palabras.'),
        copy('Staff put up the week’s sermon notes, the sermon video link and each campus’s corner, so readers meet this Sunday’s message all week.', 'El equipo publica las notas del sermón de la semana, el enlace del video y el rincón de cada campus, para que la congregación encuentre el mensaje de este domingo durante toda la semana.'),
        copy('It also shows prayer requests that people post, so a pastor can pray, write back, or decide what goes on the wall.', 'También muestra las peticiones de oración que publican las personas, para que un pastor pueda orar, responderles o decidir qué aparece en el muro.'),
        copy('It fits with the other MultiplyOS apps that carry the Sunday message through the week: Sermon Prep sends its notes here, and Preach It Back picks up the same message.', 'Se conecta con las otras apps de MultiplyOS que acompañan el mensaje del domingo durante la semana: Sermon Prep envía sus notas aquí y Preach It Back usa el mismo mensaje.'),
      ].join('\n\n'),
      who: copy('Hub staff, media staff, campus pastors and admins.', 'Equipo central, equipo de medios, pastores de campus y administradores.'),
    },
    howTo,
    parts,
    mapHref: undefined,
    ...(lang === 'es' ? {
      labels: {
        open: 'Abrir la guía',
        close: 'Cerrar la guía',
        title: 'Guía',
        onThisScreen: 'En esta pantalla',
        why: 'Por qué existe {app}',
        who: 'Para quién es',
        howTo: 'Cómo usarla',
        parts: 'Cada parte',
        connects: 'Cómo se conecta',
        back: 'Atrás',
        map: 'Cómo encaja MultiplyOS',
        full: 'Guía completa',
        goThere: 'Ir allí',
      },
    } : {}),
  };
}
