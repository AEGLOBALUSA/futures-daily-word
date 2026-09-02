import { describe, it, expect } from 'vitest';
import { youtubeLinkProblem } from './youtubeLink';

describe('youtubeLinkProblem (mirrors intake-core parseYoutubeId)', () => {
  it('accepts blank and every link shape the server accepts', () => {
    for (const ok of [
      '', '   ',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'youtube.com/watch?v=dQw4w9WgXcQ&t=10s',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://www.youtube.com/live/dQw4w9WgXcQ?feature=share',
      'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
      'dQw4w9WgXcQ',
    ]) expect(youtubeLinkProblem(ok), ok).toBe('');
  });

  it('refuses channel, playlist, studio and non-YouTube links', () => {
    for (const bad of [
      'https://www.youtube.com/@futureschurch',
      'https://www.youtube.com/playlist?list=PL123',
      'https://studio.youtube.com/video/dQw4w9WgXcQ/edit',
      'https://vimeo.com/123456',
      'not a link',
    ]) expect(youtubeLinkProblem(bad), bad).toMatch(/not a YouTube video link/);
  });
});
