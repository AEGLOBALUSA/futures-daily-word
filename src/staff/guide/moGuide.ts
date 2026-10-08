/**
 * The Guide panel's content for Daily Word's staff side (/staff), FUT-45.
 * English only: the staff screens are written in English. The reader app does
 * not import this file. Labels named in the steps are the ones the staff
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

export function getMoGuideContent(viewer?: MoGuideViewer): MoGuideContent {
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
      title: 'Paste Sunday’s notes',
      href: '/staff?tab=notes',
      steps: [
        'Open Staff home and tap Paste Sunday’s notes.',
        'If Sunday’s notes are already up, tap Put up a different version before you paste.',
        'Paste the notes or the YouTube link into the box.',
        'Tap See the notes page. The app works out the Sunday, title, speaker and series.',
        'If it asks one more question, answer it and tap Add it to the notes.',
        'If you pasted notes, check the page it shows you, then tap Put this on the congregation page. If you added a YouTube link to a message already up, tap Add the video.',
      ],
    });
  }
  if (canHub) {
    howTo.push({
      title: 'Put up this week’s sermon notes',
      href: '/staff',
      steps: [
        'Open Staff home and tap Put up this week’s notes (the Put up this week’s sermon notes card).',
        'Under Which church is this for?, pick the church whose page this is.',
        'Answer the numbered questions and paste your notes.',
        'Tap Put this on the congregation page.',
        'Tap Open the page (it names the church) to see it as people will.',
      ],
    });
  }
  if (admin || role === 'media') {
    howTo.push({
      title: 'Add the sermon video link',
      href: '/staff',
      steps: [
        'Open Staff home and tap Add the YouTube or clean the notes.',
        'Pick the sermon the video belongs to.',
        'Paste the YouTube link.',
        'Tap Add the video. The notes already on the page stay as they are.',
      ],
    });
  }
  if (canCorner) {
    howTo.push({
      title: 'Write the campus corner',
      href: '/staff',
      steps: [
        'If a draft for this week shows on Staff home, read it and use it there.',
        'On the draft, tap Put this on the campus corner.',
        'On the draft, tap Not this week if there will be no corner.',
        'On the draft, tap Use the form instead to write from scratch.',
        'If no draft shows, tap Update the campus corner (the Update a campus corner card) for the plain form.',
        'On the plain form, fill it in, then tap Put this on the campus corner. The plain form has no Not this week or Use the form instead button.',
      ],
    });
  }
  if (canPrayer) {
    howTo.push({
      title: 'Read prayer requests',
      href: '/staff',
      steps: [
        'Only Needs you starts when your region is switched on. Held requests with Show it on the wall or Keep it private work now.',
        'In Needs you, an anonymous line has I prayed for this. Tap it when you have prayed.',
        'If the person gave a name, tap Write to followed by their name, and send your note.',
        'When you return, answer Did you write to followed by their name? with I wrote to followed by their name or Not yet.',
        'Under Prayer requests this week, read the week at a glance.',
      ],
    });
  }

  const parts: MoGuidePart[] = [
    {
      slug: 'staff-home',
      title: 'Staff home',
      intro: 'The first screen: it opens on the job to do next, with the reason above its button.',
      steps: [
        'Tap the main button. The line above it says why it is first.',
        'Every other job is a card below it.',
        'Use ← Staff home on any other screen to come back here.',
      ],
      routes: ['/staff'],
      connects: [
        { title: 'The reader app', how: 'Everything you save here shows up for the people who read Daily Word.' },
      ],
    },
  ];

  if (canNotes) {
    parts.push({
      slug: 'sundays-notes',
      title: 'Paste Sunday’s notes',
      intro: 'One box: paste the notes or the YouTube link and see the page before it goes up.',
      steps: [
        'If Sunday’s notes are already up, tap Put up a different version. Then paste Sunday’s notes or the YouTube link and tap See the notes page.',
        'For notes, tap Put this on the congregation page. For a YouTube link on a message already up, tap Add the video.',
        'To fix a detail, tap Change details. To begin again, tap Paste something else.',
      ],
      next: { label: 'Paste Sunday’s notes', href: '/staff?tab=notes' },
      connects: [
        { title: 'Sermon Prep', how: 'This fills the same Sermon Notes page as Sermon Prep’s Send to Sunday.' },
        { title: 'The reader app’s Sermon Notes page', how: 'Each church has its own page. People pick theirs from the banner in the app.' },
      ],
    });
  }
  if (canHub || canMedia) {
    parts.push({
      slug: 'sermon-notes-form',
      title: 'Sermon notes and YouTube',
      intro: 'The longer form for the week’s message, when you want every detail in front of you.',
      steps: [
        'Hub staff tap Put up this week’s notes (the Put up this week’s sermon notes card). Media staff tap Add the YouTube or clean the notes.',
        'Pick the church under Which church is this for?',
        'Save with Put this on the congregation page, or Add the video when you are only adding a link.',
      ],
      next: { label: 'Open Staff home', href: '/staff' },
      connects: [
        { title: 'Sermon Prep', how: 'Sermon Prep’s Send to Sunday fills the same page.' },
        { title: 'Paste Sunday’s notes', how: 'The quicker way in for most weeks.', slug: 'sundays-notes' },
      ],
    });
  }
  if (canCorner) {
    parts.push({
      slug: 'campus-corner',
      title: 'Campus corner',
      intro: 'A short note for your campus: what is on this week, and a prayer point if you have one.',
      steps: [
        'If a draft appears, read it. Add your own words, or change the words above.',
        'On the draft, tap Put this on the campus corner.',
        'On the draft, tap Not this week if there will be no corner.',
        'On the draft, tap Use the form instead if you would rather write it yourself.',
        'On the plain form, fill it in, then tap Put this on the campus corner. It has no Not this week or Use the form instead button.',
      ],
      next: { label: 'Open Staff home', href: '/staff' },
      connects: [
        { title: 'The reader app', how: 'People at your campus see it under Campus.' },
        { title: 'Sunday’s message', how: 'The draft starts from the message that went up for Sunday.' },
      ],
    });
  }
  if (canPrayer) {
    parts.push({
      slug: 'prayer-care',
      title: 'Prayer and care',
      intro: 'Only Needs you starts when your region is switched on. Held requests and Prayer requests this week work now.',
      steps: [
        'Held requests work now. They show Show it on the wall and Keep it private.',
        'Under Needs you, tap Write to followed by the name, or I prayed for this when there is no name.',
        'Prayer requests this week lists the last seven days.',
      ],
      next: { label: 'Open Staff home', href: '/staff' },
      connects: [
        { title: 'The reader app’s prayer wall', how: 'These are the requests people post on the wall. The app sends them nothing; only what you write reaches them.' },
      ],
    });
  }
  if (admin) {
    parts.push(
      {
        slug: 'history',
        title: 'History',
        intro: 'A record of what already went live, and the questions no one is asked now.',
        steps: ['Open History from Settings on Staff home.', 'Tap Ask this again to bring a switched-off question back.'],
        next: { label: 'Open Staff home', href: '/staff' },
      },
      {
        slug: 'people',
        title: 'People',
        intro: 'Who can sign in to the staff side, and what each person can do.',
        steps: [
          'Under Add or update, enter their email (any address), name, role and campus, then tap Save person.',
          'If a setup code appears, give it to them yourself. It works once.',
          'Tap Get a new setup code, or Let them set a new password, when someone is locked out.',
          'Only Ashley can make someone an admin, or change another admin.',
        ],
        next: { label: 'Open Staff home', href: '/staff' },
      },
      {
        slug: 'campuses',
        title: 'Campuses',
        intro: 'The one list of campuses that readers see, in the order they see it.',
        steps: [
          'Tap a campus to change it, or Add a campus.',
          'Use Move up and Move down to set the order, and Hide from readers to take one off the list.',
          'Tap Save campus.',
        ],
        next: { label: 'Open Staff home', href: '/staff' },
        connects: [
          { title: 'The reader app', how: 'This list feeds the campus picker readers use.' },
        ],
      },
    );
  }

  return {
    app: 'Daily Word',
    lang: 'en',
    why: {
      body: [
        'Daily Word is the daily devotional app the congregation reads. The staff side is where the church puts its own words into it.',
        'Staff put up the week’s sermon notes, the sermon video link and each campus’s corner, so readers meet this Sunday’s message all week.',
        'It also shows prayer requests that people post, so a pastor can pray, write back, or decide what goes on the wall.',
        'It fits with the other MultiplyOS apps that carry the Sunday message through the week: Sermon Prep sends its notes here, and Preach It Back picks up the same message.',
      ].join('\n\n'),
      who: 'Hub staff, media staff, campus pastors and admins.',
    },
    howTo,
    parts,
    mapHref: undefined,
  };
}
