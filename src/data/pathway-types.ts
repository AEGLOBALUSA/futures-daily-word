// Faith Pathway types — shared by HomeScreen and the extracted pathway/lesson components.

export interface PathwayDay {
  day: number;
  title: string;
  titleEs?: string;
  titlePt?: string;
  titleId?: string;
  theme: string;
  themeEs?: string;
  themePt?: string;
  themeId?: string;
  passages?: string[];
  reflection?: string;
  lesson?: string;
  lessonEs?: string;
  lessonPt?: string;
  lessonId?: string;
  reading?: { book: string; chapter: number; verses: string; ref: string };
}

export interface PathwayData {
  title: string;
  titleEs?: string;
  titlePt?: string;
  titleId?: string;
  days: PathwayDay[];
}

export interface PathwayProgress {
  completedDays: number[];
  currentDay: number;
  enrolled: boolean;
  // The day finished on lastCompletedDate. Persisted so "today's lesson is done,
  // the next one arrives tomorrow" survives a reload — it used to be component
  // state, so refreshing served the next lesson immediately.
  lastCompletedDay?: number;
  lastCompletedDate?: string;
  // Mirrored from the pathway JSON so the Read tab can show "Day N of M"
  // without fetching the 373KB file.
  totalDays?: number;
  title?: string;
}
