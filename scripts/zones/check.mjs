import fs from 'node:fs';
import { buildComment, classifyFiles, decide, isRevert, ownerApproved as isOwnerApproved } from './classify.mjs';

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const server = process.env.GITHUB_SERVER_URL;
const apiBase = server === 'https://github.com' ? 'https://api.github.com' : `${server}/api/v3`;
const headers = { accept: 'application/vnd.github+json', authorization: `Bearer ${token}`, 'x-github-api-version': '2022-11-28' };

async function gh(method, path, body) {
  const response = await fetch(`${apiBase}${path}`, { method, headers: { ...headers, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

async function all(path) {
  const items = [];
  for (let page = 1; ; page += 1) {
    const batch = await gh('GET', `${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    items.push(...batch);
    if (batch.length < 100) return items;
  }
}

async function processPr(listed, zones) {
  // Always the full, current PR: list results and event payloads can be stale or omit changed_files.
  const pr = await gh('GET', `/repos/${repo}/pulls/${listed.number}`);
  if (pr.state !== 'open') return;
  const files = await all(`/repos/${repo}/pulls/${pr.number}/files`);
  const results = classifyFiles(files, zones);
  const complete = typeof pr.changed_files !== 'number' || files.length >= pr.changed_files;
  const red = results.some((result) => result.zone === 'red');
  const amber = results.some((result) => result.zone === 'amber');
  let ownerApproved = false;
  if (red) {
    const reviews = await all(`/repos/${repo}/pulls/${pr.number}/reviews`);
    ownerApproved = isOwnerApproved({ reviews, owner: zones.owner, headSha: pr.head.sha });
  }
  const commits = await all(`/repos/${repo}/pulls/${pr.number}/commits`);
  const author = pr.user?.login;
  const ownerOnly = author === zones.owner && commits.every((commit) => commit.author?.login === zones.owner);
  const revert = isRevert({ headRef: pr.head?.ref, title: pr.title, body: pr.body ?? '' });
  const decision = decide({ author, owner: zones.owner, results, body: pr.body ?? '', now: new Date(), revert, ownerApproved, ownerOnly, complete });
  const target = pr.html_url;
  await gh('POST', `/repos/${repo}/statuses/${pr.head.sha}`, { state: decision.zones.state, context: 'zones', description: decision.zones.description, target_url: target });
  await gh('POST', `/repos/${repo}/statuses/${pr.head.sha}`, { state: decision.hold.state, context: 'sunday-hold', description: decision.hold.description, target_url: target });
  if (amber && !revert && !ownerOnly && !(pr.body ?? '').split(/\r?\n/).some((line) => /^\s*[-*]\s*\[[ xX]\]\s*I['’]ve read what this changes/m.test(line))) {
    await gh('PATCH', `/repos/${repo}/pulls/${pr.number}`, { body: `${pr.body ?? ''}\n\n- [ ] I've read what this changes` });
  }
  if (author !== zones.owner || (author === zones.owner && !ownerOnly)) {
    const comments = await all(`/repos/${repo}/issues/${pr.number}/comments`);
    const body = buildComment({ results, holdActive: decision.hold.state === 'failure', ownerCommitWarning: author === zones.owner && !ownerOnly });
    const existing = comments.find((comment) => comment.body?.includes('<!-- zones-check -->'));
    if (existing) {
      if (existing.body !== body) await gh('PATCH', `/repos/${repo}/issues/comments/${existing.id}`, { body });
    } else await gh('POST', `/repos/${repo}/issues/${pr.number}/comments`, { body });
  }
  console.log(`#${pr.number} ${decision.zones.state}/${decision.hold.state}`);
}

try {
  const zones = JSON.parse(fs.readFileSync('.github/zones.json', 'utf8'));
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const eventName = process.env.GITHUB_EVENT_NAME;
  const prs = eventName === 'schedule'
    ? await all(`/repos/${repo}/pulls?state=open`)
    : [event.pull_request ?? await gh('GET', `/repos/${repo}/pulls/${event.number}`)];
  let failed = false;
  for (const pr of prs) {
    try {
      await processPr(pr, zones);
    } catch (error) {
      failed = true;
      console.error(`#${pr.number}: ${error.message}`);
    }
  }
  if (failed) process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
