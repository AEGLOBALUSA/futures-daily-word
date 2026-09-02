/**
 * Sermon-outline scaffolds offered in the Preach workspace's Outline Builder.
 *
 * Every entry here must have a verified source — never invent a framework or
 * a step name. These two are Ashley's, from the published book "Multiply or
 * Die"; do not add a third entry without an equally verified source.
 */
export interface PreachFramework {
  id: string;
  name: string;
  source: string;
  steps: string[];
}

export const PREACH_FRAMEWORKS: PreachFramework[] = [
  { id: '4d', name: 'The 4D Protocol', source: 'Multiply or Die', steps: ['Discover', 'Develop', 'Deploy', 'Depart'] },
  { id: 'heat', name: 'H.E.A.T.', source: 'Multiply or Die', steps: ['Hungry', 'Effective', 'Adaptable', 'Transferable'] },
];
