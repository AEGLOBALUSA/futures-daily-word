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
}
