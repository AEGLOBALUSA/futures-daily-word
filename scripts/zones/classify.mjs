const escape = (value) => value.replace(/[.+^${}()|[\]\\]/g, '\\$&');

export function matchGlob(pattern, path) {
  pattern = pattern.replaceAll('\\', '/').replace(/^\//, '');
  path = path.replaceAll('\\', '/').replace(/^\//, '');
  let source = '';
  for (let i = 0; i < pattern.length;) {
    if (pattern.startsWith('**/', i)) {
      source += '(?:[^/]+/)*';
      i += 3;
    } else if (pattern.startsWith('**', i)) {
      source += '.*';
      i += 2;
    } else if (pattern[i] === '*') {
      source += '[^/]*';
      i += 1;
    } else if (pattern[i] === '?') {
      source += '[^/]';
      i += 1;
    } else {
      source += escape(pattern[i]);
      i += 1;
    }
  }
  return new RegExp(`^${source}$`).test(path);
}

const matchesAny = (patterns, path) => patterns.some((pattern) => matchGlob(pattern, path));

export function classify(path, zones) {
  if (matchesAny(zones.green, path)) return { zone: 'green', why: "the Alpharetta space" };
  for (const group of zones.red) if (matchesAny(group.patterns, path)) return { zone: 'red', why: group.why };
  for (const group of zones.amber) if (matchesAny(group.patterns, path)) return { zone: 'amber', why: group.why };
  return { zone: 'amber', why: zones.amberFallback };
}

const rank = { green: 0, amber: 1, red: 2 };

export function classifyFiles(files, zones) {
  return files.map((file) => {
    const paths = [file.filename, ...(file.previous_filename ? [file.previous_filename] : [])];
    const classifications = paths.map((path) => ({ path, ...classify(path, zones) }));
    const result = classifications.reduce((worst, current) => rank[current.zone] > rank[worst.zone] ? current : worst);
    return { ...file, ...result, paths, classifications };
  });
}

export function isSundayHold(date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', hourCycle: 'h23', minute: 'numeric'
  }).formatToParts(date).filter(({ type }) => ['weekday', 'hour', 'minute'].includes(type)).map(({ type, value }) => [type, value]));
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return (parts.weekday === 'Sat' && minutes >= 18 * 60) || (parts.weekday === 'Sun' && minutes < 14 * 60);
}

export function hasTick(body = '') {
  return body.split(/\r?\n/).some((line) => /^\s*[-*]\s*\[[xX]\]\s*I['’]ve read what this changes/m.test(line));
}

export function isRevert({ headRef = '', title = '' }) {
  return headRef.startsWith('revert-') || title.startsWith('Revert "');
}

const trim = (text) => text.length <= 140 ? text : `${text.slice(0, 137)}...`;

export function decide({ author, owner, results, body, now, revert, ownerApproved }) {
  if (author === owner) return { zones: { state: 'success', description: "Ashley's own change" }, hold: { state: 'success', description: "Ashley's own change" } };
  const red = results.find((result) => result.zone === 'red');
  const amber = results.some((result) => result.zone === 'amber');
  const zones = red
    ? (ownerApproved ? { state: 'success', description: "Ashley's approval is recorded" } : { state: 'failure', description: trim(`Waiting for Ashley's approval: this touches ${red.why}`) })
    : amber
      ? (hasTick(body) ? { state: 'success', description: 'The note was read' } : { state: 'failure', description: 'Read the note on this pull request, then tick the box in the description' })
      : { state: 'success', description: 'Only the Alpharetta space' };
  const hold = isSundayHold(now) && !revert
    ? { state: 'failure', description: 'Merges pause Saturday 6 pm to Sunday 2 pm Atlanta time. Reverts still go through.' }
    : { state: 'success', description: 'Not paused' };
  return { zones, hold };
}

function bullets(results, zone) {
  const grouped = new Map();
  for (const result of results.filter((item) => item.zone === zone)) {
    const paths = result.paths ?? [result.filename];
    const existing = grouped.get(result.why) ?? [];
    for (const path of paths) if (!existing.includes(path)) existing.push(path);
    grouped.set(result.why, existing);
  }
  return [...grouped].map(([why, paths]) => `- ${why}: ${paths.map((path) => `\`${path}\``).join(', ')}`).join('\n');
}

export function buildComment({ results, holdActive }) {
  const red = results.some((result) => result.zone === 'red');
  const amber = results.some((result) => result.zone === 'amber');
  let text;
  if (!red && !amber) text = '✅ This change stays inside the Alpharetta space. When the checks are green, you can merge it.';
  else if (!red) text = `⚠️ This change reaches past the Alpharetta space. It changes things every campus sees:\n${bullets(results, 'amber')}\nWhen you've read this, tick "I've read what this changes" in the description above. The other checks show whether the rest of the app still works.`;
  else text = `🛑 This change touches the deeper parts of the app, so it waits for Ashley's approval:\n${bullets(results, 'red')}${amber ? `\nIt also changes things every campus sees:\n${bullets(results, 'amber')}` : ''}`;
  return `${text}${holdActive ? '\n⏸️ Merges pause from Saturday 6 pm to Sunday 2 pm Atlanta time.' : ''}\n<!-- zones-check -->`;
}
