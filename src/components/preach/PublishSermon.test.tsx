import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, type ReactElement } from 'react';
import type { IntakeQuestion, PreachOutline, StaffLike } from '../../utils/preachPublish';

const api = vi.hoisted(() => ({ intake: vi.fn() }));
vi.mock('../../staff/api', () => ({ intake: api.intake }));

import { PublishSermon } from './PublishSermon';

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

let mounted: { el: HTMLDivElement; root: Root } | null = null;
function mount(ui: ReactElement) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => { root.render(ui); });
  mounted = { el, root };
  return el;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function click(btn: Element) {
  await act(async () => { (btn as HTMLElement).click(); });
  await flush();
}

function byTestId(el: HTMLElement, id: string) {
  return el.querySelector(`[data-testid="${id}"]`);
}

const HUB_QUESTIONS: IntakeQuestion[] = [
  { id: 'q_date', label: 'Date', type: 'date', audience: 'hub', required: true, enabled: true, config: { publish: 'sermon_field', sermonKey: 'date' } },
  { id: 'q_title', label: 'Title', type: 'text', audience: 'hub', required: true, enabled: true, config: { publish: 'sermon_field', sermonKey: 'title' } },
  { id: 'q_speaker', label: 'Speaker', type: 'text', audience: 'hub', required: false, enabled: true, config: { publish: 'sermon_field', sermonKey: 'speaker' } },
  { id: 'q_series', label: 'Series', type: 'text', audience: 'hub', required: false, enabled: true, config: { publish: 'sermon_field', sermonKey: 'series' } },
  { id: 'q_youtube', label: 'YouTube', type: 'text', audience: 'hub', required: false, enabled: true, config: { publish: 'sermon_field', sermonKey: 'youtubeUrl' } },
  { id: 'q_outline', label: 'Notes', type: 'long_text', audience: 'hub', required: true, enabled: true, config: { publish: 'sermon_field', sermonKey: 'outline' } },
  { id: 'q_have', label: 'Do you have your notes?', type: 'yes_no', audience: 'hub', required: false, enabled: true, config: { flow: 'notes_have' } },
  { id: 'q_ai', label: 'Format with AI?', type: 'yes_no', audience: 'hub', required: false, enabled: true, config: { flow: 'notes_ai' } },
];

const CAMPUS_QUESTIONS: IntakeQuestion[] = [
  { id: 'q_campus', label: 'Which campus?', type: 'campus', audience: 'campus', required: true, enabled: true, config: {} },
  { id: 'q_corner', label: 'Campus corner post', type: 'long_text', audience: 'campus', required: true, enabled: true, config: { publish: 'campus_corner', itemType: 'announcement' } },
];

const OUTLINE: PreachOutline = {
  title: 'Living Water',
  passage: 'John 4:1-26',
  series: 'Thirsty',
  date: '2026-09-13',
  speaker: 'Ashley Evans',
  bigIdea: 'Jesus offers what nothing else can satisfy.',
  points: [{ heading: 'We all thirst', body: 'Everyone is chasing something to fill the gap.' }],
  weeklyAction: 'Name one thing you have been drinking from instead of Him.',
  updatedAt: 1_757_000_000_000,
};

const HUB_STAFF: StaffLike = { email: 'josh@futures.church', role: 'hub', campusId: null, name: 'Josh Greenwood' };
const CAMPUS_STAFF: StaffLike = { email: 'pastor@futures.church', role: 'campus', campusId: 'us-alpharetta', name: 'Campus Pastor' };

const FORMATTED_SERMON = {
  id: 'living-water-2026-09-13',
  title: 'Living Water',
  series: 'Thirsty',
  date: '2026-09-13',
  speaker: 'Ashley Evans',
  sections: [{ num: '1', title: 'We all thirst', content: [{ type: 'text', value: 'Everyone is chasing something to fill the gap.' }] }],
  responsePrompts: ['What are you thirsty for?'],
};

beforeEach(() => {
  api.intake.mockReset();
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })));
});

afterEach(() => {
  if (mounted) { act(() => mounted!.root.unmount()); mounted.el.remove(); mounted = null; }
  vi.unstubAllGlobals();
});

describe('PublishSermon', () => {
  it('shows a sign-in line and never calls intake when no pastor is signed in', async () => {
    const el = mount(<PublishSermon outline={OUTLINE} staff={null} lang="en" onPublished={vi.fn()} />);
    await flush();
    expect(byTestId(el, 'preach-publish-sign-in')).toBeTruthy();
    expect(api.intake).not.toHaveBeenCalled();
  });

  it('loads the hub form for a hub-job staff member', async () => {
    api.intake.mockImplementation(async (action: string) => {
      if (action === 'form') return { questions: HUB_QUESTIONS };
      return {};
    });
    mount(<PublishSermon outline={OUTLINE} staff={HUB_STAFF} lang="en" onPublished={vi.fn()} />);
    await flush();
    expect(api.intake).toHaveBeenCalledWith('form', { job: 'hub' });
  });

  it('previews a hub sermon and renders it with SermonNotesSurface, without publishing', async () => {
    api.intake.mockImplementation(async (action: string) => {
      if (action === 'form') return { questions: HUB_QUESTIONS };
      if (action === 'format_preview') return { preview: FORMATTED_SERMON };
      return {};
    });
    const el = mount(<PublishSermon outline={OUTLINE} staff={HUB_STAFF} lang="en" onPublished={vi.fn()} />);
    await flush();
    await click(byTestId(el, 'preach-publish-preview-btn')!);
    expect(api.intake).toHaveBeenCalledWith('format_preview', expect.objectContaining({ job: 'hub', useAI: false }));
    expect(el.querySelector('.dw-sermon-notes')).toBeTruthy();
    expect(byTestId(el, 'preach-publish-warning')).toBeTruthy();
    expect(api.intake).not.toHaveBeenCalledWith('submit', expect.anything());
  });

  it('does not submit on the first publish tap, and submits with the outline text after confirming', async () => {
    api.intake.mockImplementation(async (action: string) => {
      if (action === 'form') return { questions: HUB_QUESTIONS };
      if (action === 'format_preview') return { preview: FORMATTED_SERMON };
      if (action === 'submit') return { submission: { id: 'sub_1' }, preview: FORMATTED_SERMON };
      return {};
    });
    const onPublished = vi.fn();
    const el = mount(<PublishSermon outline={OUTLINE} staff={HUB_STAFF} lang="en" onPublished={onPublished} />);
    await flush();
    await click(byTestId(el, 'preach-publish-preview-btn')!);

    const submitBtn = byTestId(el, 'preach-publish-submit-btn')!;
    await click(submitBtn); // first tap: arms confirmation only
    expect(api.intake).not.toHaveBeenCalledWith('submit', expect.anything());

    await click(submitBtn); // second tap: actually publishes
    expect(api.intake).toHaveBeenCalledWith('submit', expect.objectContaining({
      job: 'hub',
      answers: expect.objectContaining({ q_outline: 'Jesus offers what nothing else can satisfy.\n\nWe all thirst\nEveryone is chasing something to fill the gap.\n\nName one thing you have been drinking from instead of Him.' }),
    }));
    expect(onPublished).toHaveBeenCalledWith({ id: 'sub_1', title: 'Living Water', kind: 'sermon' });
    expect(byTestId(el, 'preach-publish-success')).toBeTruthy();
  });

  it('is disabled until a preview exists', async () => {
    api.intake.mockImplementation(async (action: string) => {
      if (action === 'form') return { questions: HUB_QUESTIONS };
      return {};
    });
    const el = mount(<PublishSermon outline={OUTLINE} staff={HUB_STAFF} lang="en" onPublished={vi.fn()} />);
    await flush();
    const submitBtn = byTestId(el, 'preach-publish-submit-btn') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
    await click(submitBtn);
    expect(api.intake).not.toHaveBeenCalledWith('submit', expect.anything());
  });

  it('shows the campus announcement title/body from a local preview, with no format_preview call, then publishes on confirm', async () => {
    api.intake.mockImplementation(async (action: string) => {
      if (action === 'form') return { questions: CAMPUS_QUESTIONS };
      if (action === 'submit') return { submission: { id: 'sub_2' } };
      return {};
    });
    const onPublished = vi.fn();
    const el = mount(<PublishSermon outline={OUTLINE} staff={CAMPUS_STAFF} lang="en" onPublished={onPublished} />);
    await flush();
    await click(byTestId(el, 'preach-publish-preview-btn')!);
    expect(api.intake).not.toHaveBeenCalledWith('format_preview', expect.anything());
    const campusPreview = byTestId(el, 'preach-publish-campus-preview')!;
    expect(campusPreview.textContent).toContain('Living Water');
    expect(campusPreview.textContent).toContain('We all thirst');

    const submitBtn = byTestId(el, 'preach-publish-submit-btn')!;
    await click(submitBtn);
    expect(api.intake).not.toHaveBeenCalledWith('submit', expect.anything());
    await click(submitBtn);
    expect(api.intake).toHaveBeenCalledWith('submit', expect.objectContaining({
      job: 'campus',
      campusId: 'us-alpharetta',
      answers: expect.objectContaining({ q_campus: 'us-alpharetta' }),
    }));
    expect(onPublished).toHaveBeenCalledWith({ id: 'sub_2', title: 'Living Water', kind: 'campus' });
  });

  it('surfaces a server error inline without throwing', async () => {
    api.intake.mockImplementation(async (action: string) => {
      if (action === 'form') return { questions: HUB_QUESTIONS };
      if (action === 'format_preview') throw Object.assign(new Error('Missing: Title'), { status: 400, data: { error: 'Missing: Title' } });
      return {};
    });
    const el = mount(<PublishSermon outline={OUTLINE} staff={HUB_STAFF} lang="en" onPublished={vi.fn()} />);
    await flush();
    await click(byTestId(el, 'preach-publish-preview-btn')!);
    expect(byTestId(el, 'preach-publish-error')?.textContent).toBe('Missing: Title');
  });

  it('changing the YouTube link or the AI toggle clears a stale preview', async () => {
    api.intake.mockImplementation(async (action: string) => {
      if (action === 'form') return { questions: HUB_QUESTIONS };
      if (action === 'format_preview') return { preview: FORMATTED_SERMON };
      return {};
    });
    const el = mount(<PublishSermon outline={OUTLINE} staff={HUB_STAFF} lang="en" onPublished={vi.fn()} />);
    await flush();
    await click(byTestId(el, 'preach-publish-preview-btn')!);
    expect(el.querySelector('.dw-sermon-notes')).toBeTruthy();

    const checkbox = byTestId(el, 'preach-publish-ai-checkbox') as HTMLInputElement;
    await act(async () => { checkbox.click(); });
    expect(el.querySelector('.dw-sermon-notes')).toBeNull();
    expect((byTestId(el, 'preach-publish-submit-btn') as HTMLButtonElement).disabled).toBe(true);
  });
});
