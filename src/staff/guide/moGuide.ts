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
        'Paste the notes or the YouTube link into the box.',
        'Tap See the notes page. The app works out the Sunday, title, speaker and series.',
        'If it asks one more question, answer it and tap Add it to the notes.',
        'Check the page it shows you, then tap Put this on the congregation page.',
      ],
    });
  }
  if (canHub) {
    howTo.push({
      title: 'Put up this week’s sermon notes',
      href: '/staff',
      steps: [
        'Open Staff home and tap Put up this week’s sermon notes.',
        'Under Which church is this for?, pick the church whose page this is.',
        'Answer the numbered questions and paste your notes.',
        'Tap Put this on the congregation page.',
        'Tap Open the page (it names the church) to see it as people will.',
      ],
    });
  }
  if (canMedia) {
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
        'On Staff home, find the draft for this week’s corner and read it.',
        'Change the words yourself, or add something only you would say.',
        'Tap Put this on the campus corner.',
        'If there is no corner this week, tap Not this week.',
        'To write it from scratch, tap Use the form instead, or Update a campus corner on Staff home.',
      ],
    });
  }
  if (canPrayer) {
    howTo.push({
      title: 'Read prayer requests',
      href: '/staff',
      steps: [
        'On Staff home, look for Needs you. Each line is a request waiting for a person.',
        'If the person gave a name, tap Write to followed by their name, and send your note.',
        'Afterward tap I wrote to followed by their name. If you only prayed, tap I prayed for this.',
        'Under Prayer requests this week, read the week at a glance.',
      ],
    });
  }

  const parts: MoGuidePart[] = [
    {
      slug: 'staff-home',
      title: 'Staff home',
      intro: 'The first screen: one card for each job you can do, and prayer care at the top when something is waiting.',
      steps: [
        'Pick the card for the job you came to do.',
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
        'Paste Sunday’s notes or the YouTube link, then tap See the notes page.',
        'Nothing is on the congregation page until you tap Put this on the congregation page.',
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
        'Hub staff tap Put up this week’s sermon notes. Media staff tap Add the YouTube or clean the notes.',
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
        'Read the draft. Add your own words, or change the words above.',
        'Tap Put this on the campus corner.',
        'Tap Not this week if there will be no corner.',
        'Tap Use the form instead if you would rather write it yourself.',
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
      intro: 'Prayer requests that need a person to look, write, or pray.',
      steps: [
        'A request held for a look shows Show it on the wall and Keep it private.',
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
          'Under Add or update, enter their email, name, role and campus, then tap Save person.',
          'Give them the setup code yourself. It works once.',
          'Tap Get a new setup code, or Let them set a new password, when someone is locked out.',
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
