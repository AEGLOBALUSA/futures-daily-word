// Pastor / leader reading rotation — the day-one floor for pastor_leader.
// A pastor with no plan and no reading slots used to land on an EMPTY hero
// (only comfort and I'm-New had fallbacks). These rotate by local day index,
// the same way COMFORT_CHAPTERS does, so the home always opens on a reading.
// Chapters chosen for the work of shepherding: calling, character, care of
// the flock, sending, and leading from a full cup. Scripture refs only —
// same "Book N" shape the hero pipeline already resolves for comfort.
export const PASTOR_CHAPTERS = [
  '1 Peter 5', 'John 21', '2 Timothy 2', 'Acts 20', 'Ezekiel 34',
  'Joshua 1', 'Isaiah 6', 'Jeremiah 1', '1 Timothy 3', 'Titus 1',
  'Nehemiah 1', 'Nehemiah 2', 'Exodus 18', 'Numbers 11', 'Psalm 78',
  '1 Samuel 16', 'Matthew 9', 'Luke 10', 'John 10', 'John 13',
  'John 15', 'Acts 2', 'Acts 6', 'Ephesians 4', 'Philippians 2',
  'Colossians 1', '1 Thessalonians 2', '2 Corinthians 4', 'Hebrews 13', 'Matthew 28',
];
