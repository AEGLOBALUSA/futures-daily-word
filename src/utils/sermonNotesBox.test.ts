import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

describe('sermon notes expanding boxes', () => {
  it('uses ExpandingNoteBox, not a hairline underline', () => {
    const surface = readFileSync(join(ROOT, 'src/components/SermonNotesSurface.tsx'), 'utf-8');
    expect(surface).toMatch('function ExpandingNoteBox');
    expect(surface).not.toMatch('HairlineBlank');
    expect(surface).toMatch('Write here');
    expect(surface).toMatch('el.style.height = Math.max(el.scrollHeight');
  });

  it('styles blanks as a visible growing box on the shared surface', () => {
    const css = readFileSync(join(ROOT, 'src/index.css'), 'utf-8');
    const start = css.indexOf('.dw-sermon-notes-blank {');
    const end = css.indexOf('.dw-sermon-notes-blank.is-response');
    const blank = css.slice(start, end);
    expect(blank).toMatch(/border:\s*1\.5px solid #ECE3D4/);
    expect(blank).toMatch(/background:\s*#FFF/);
    expect(blank).toMatch(/border-radius:\s*10px/);
    expect(blank).toMatch(/padding:\s*10px 12px/);
    expect(blank).toMatch(/min-height:\s*44px/);
    expect(blank).toMatch(/overflow:\s*hidden/);
    expect(blank).toMatch(/resize:\s*none/);
    expect(blank).toMatch(/caret-color:\s*#A8552F/);
    expect(blank).not.toMatch('border-bottom');
    expect(css).toMatch(/\.dw-sermon-notes-blank\.is-response\s*\{\s*min-height:\s*88px/);
  });
});
