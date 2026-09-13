import { describe, it, expect } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { NewBelieverLessonCard } from './NewBelieverLessonCard';
import { ScriptureSelectionProvider } from '../contexts/ScriptureSelectionContext';
import { t } from '../utils/i18n';
import type { PathwayData, PathwayProgress } from '../data/pathway-types';

// Verse 1 text must NOT appear when the range is showing; verses 8–9 must.
const CHAPTER_TEXT =
  '[1] For we are his workmanship, created in Christ Jesus unto good works. ' +
  '[8] For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: ' +
  '[9] Not of works, lest any man should boast.';

const pathwayData: PathwayData = {
  title: 'New & Returning to Faith',
  days: [
    {
      day: 1,
      title: 'Grace Changes Everything',
      theme: 'Grace',
      lesson: 'Here is the lesson.',
      questions: ['Q1', 'Q2'],
      reading: { book: 'Ephesians', chapter: 2, verses: '8-9', ref: 'Ephesians 2:8-9' },
    },
  ],
};

const pathwayProgress: PathwayProgress = {
  completedDays: [],
  currentDay: 1,
  enrolled: true,
};

function renderCard() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  return { host, root };
}

describe('NewBelieverLessonCard — Day N serves the assigned verse range', () => {
  it('shows only verses 8-9 and the ranged ref when verseSpec is present', async () => {
    const { host, root } = renderCard();
    await act(async () => {
      root.render(
        <ScriptureSelectionProvider>
          <NewBelieverLessonCard
            pathwayData={pathwayData}
            pathwayProgress={pathwayProgress}
            displayDay={1}
            lang="en"
            t={(key: string) => t(key, 'en')}
            scriptureFontSize={17}
            savePathwayProgress={() => {}}
            open
            onClose={() => {}}
            passageText={CHAPTER_TEXT}
            verseSpec="8-9"
            rangedRef="Ephesians 2:8-9"
          />
        </ScriptureSelectionProvider>
      );
    });
    expect(host.textContent).toContain('Ephesians 2:8-9');
    expect(host.textContent).toContain('grace are ye saved');
    expect(host.textContent).toContain('lest any man should boast');
    expect(host.textContent).not.toContain('his workmanship');

    // The whole-chapter control is present.
    const wholeBtn = Array.from(host.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Read the whole chapter'
    );
    expect(wholeBtn).toBeTruthy();

    await act(async () => { wholeBtn!.click(); });
    expect(host.textContent).toContain('his workmanship');
    expect(host.textContent).toContain('Ephesians 2');
    // Toggled to the whole chapter — the control now offers to go back to
    // today's assigned verses, in a translated verb label.
    const backBtn = Array.from(host.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === "Show today's verses"
    );
    expect(backBtn).toBeTruthy();

    root.unmount();
    host.remove();
  });

  it('falls back to the whole chapter when the assigned range cannot be found in the served text (F5)', async () => {
    const { host, root } = renderCard();
    // No [N] markers at all — the range can never be sliced out of this text.
    const plainText = 'A chapter served as plain prose with no verse markers.';
    await act(async () => {
      root.render(
        <ScriptureSelectionProvider>
          <NewBelieverLessonCard
            pathwayData={pathwayData}
            pathwayProgress={pathwayProgress}
            displayDay={1}
            lang="en"
            t={(key: string) => t(key, 'en')}
            scriptureFontSize={17}
            savePathwayProgress={() => {}}
            open
            onClose={() => {}}
            passageText={plainText}
            verseSpec="8-9"
            rangedRef="Ephesians 2:8-9"
          />
        </ScriptureSelectionProvider>
      );
    });
    // Chapter heading, not the ranged ref — the slice failed.
    expect(host.textContent).toContain('Ephesians 2');
    expect(host.textContent).not.toContain('Ephesians 2:8-9');
    expect(host.textContent).toContain(plainText);
    // The toggle has nothing to toggle back to — it's hidden.
    const wholeBtn = Array.from(host.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Read the whole chapter' || b.textContent?.trim() === "Show today's verses"
    );
    expect(wholeBtn).toBeFalsy();

    root.unmount();
    host.remove();
  });

  it('shows the whole chapter as today when no verseSpec is given', async () => {
    const { host, root } = renderCard();
    await act(async () => {
      root.render(
        <ScriptureSelectionProvider>
          <NewBelieverLessonCard
            pathwayData={pathwayData}
            pathwayProgress={pathwayProgress}
            displayDay={1}
            lang="en"
            t={(key: string) => t(key, 'en')}
            scriptureFontSize={17}
            savePathwayProgress={() => {}}
            open
            onClose={() => {}}
            passageText={CHAPTER_TEXT}
          />
        </ScriptureSelectionProvider>
      );
    });
    expect(host.textContent).toContain('his workmanship');
    expect(host.textContent).toContain('lest any man should boast');
    const wholeBtn = Array.from(host.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Read the whole chapter'
    );
    expect(wholeBtn).toBeFalsy();

    root.unmount();
    host.remove();
  });
});
