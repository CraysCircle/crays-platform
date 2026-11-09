import { exerciseExamples } from './trainingJourney.ts';

/** Planned catalogue UX, retaining the existing original exercise identities. */
export type ExerciseCatalogueFilters = { query: string; equipment: string; muscle: string; goal: string; level: string; limitation: string; media: string };
export type ExerciseCatalogueNavigation = { filters: ExerciseCatalogueFilters; detailId: string; trail: string[]; listScrollTop: number };
export const newExerciseCatalogueNavigation = (): ExerciseCatalogueNavigation => ({ filters: { query: '', equipment: '', muscle: '', goal: '', level: '', limitation: '', media: '' }, detailId: '', trail: [], listScrollTop: 0 });
export const exerciseCatalogueOptions = {
  equipment: [['', 'Any equipment'], ['NONE', 'Bodyweight'], ['DUMBBELL', 'Dumbbell'], ['BAND', 'Resistance band'], ['MACHINE', 'Machine']],
  muscle: [['', 'Any muscle area'], ['upper-body', 'Upper body'], ['whole-body', 'Whole body']],
  goal: [['', 'Any goal'], ['coordination', 'Coordination'], ['strength', 'Strength']],
  level: [['', 'Any catalogue level'], ['BEGINNER', 'Beginner'], ['INTERMEDIATE', 'Intermediate'], ['ADVANCED', 'Advanced'], ['UNKNOWN', 'Not classified']],
  limitation: [['', 'No movement constraint selected'], ['no-jump-written', 'No jumping in written variant'], ['standing-written', 'Standing written variant'], ['unassessed', 'Personal limitations need review']],
  media: [['', 'Any media status'], ['EXACT', 'Reviewed exact demonstration'], ['ANY', 'Related media available'], ['NONE', 'No media supplied']],
} as const;
export type ExerciseCatalogueEntry = {
  id: string; version: 1; name: string; originalId: string; originalSlug: string;
  equipment: string[]; muscles: string[]; goals: string[]; level: string; movementFeatures: string[];
  metadataSource: 'fictional-catalogue-classification'; suitabilityAssessed: false;
  description: string; techniqueCues: string[]; commonMistakes: string[];
  alternatives: { id: string; reason: string }[];
  media: { match: 'FAMILY_LEVEL'; exactApproved: false; reviewReceipt: null; note: string; author: string; licence: string; sourceUrl: string; licenceUrl: string };
};
const classification = [
  { muscles: ['whole-body'], goals: ['coordination'], level: 'BEGINNER', movementFeatures: ['no-jump-written', 'standing-written'], alternatives: ['example-marching-knees'] },
  { muscles: ['upper-body'], goals: ['strength'], level: 'INTERMEDIATE', movementFeatures: [], alternatives: [] },
  { muscles: ['whole-body'], goals: ['coordination'], level: 'BEGINNER', movementFeatures: ['no-jump-written', 'standing-written'], alternatives: ['example-step-jack'] },
] as const;

/** Classifications illustrate the planned filters; they are not provider or medical assessments. */
export function exerciseCatalogueEntries(): ExerciseCatalogueEntry[] {
  return exerciseExamples.map((original, index) => {
    const metadata = classification[index];
    return {
      id: original.id, originalId: original.id, originalSlug: original.slug, version: 1, name: original.name,
      equipment: ['NONE'], muscles: [...metadata.muscles], goals: [...metadata.goals], level: metadata.level, movementFeatures: [...metadata.movementFeatures],
      metadataSource: 'fictional-catalogue-classification', suitabilityAssessed: false,
      description: `Explore the existing ${original.name} example and its written variant. Catalogue groupings and alternative links are fictional design examples; they are not an assessment of suitability for you.`,
      techniqueCues: [...original.instructions],
      commonMistakes: ['Treating this related clip as an exact exercise or equipment demonstration.', 'Copying a load, repetition target or pace from media instead of reviewing your own plan.'],
      alternatives: metadata.alternatives.map(id => ({ id, reason: 'Another coordination example to compare, not an equivalent movement or an automatic replacement in your plan.' })),
      media: { match: 'FAMILY_LEVEL', exactApproved: false, reviewReceipt: null, note: original.mediaNote, author: original.author, licence: original.license, sourceUrl: original.source, licenceUrl: original.licenseUrl },
    };
  });
}
export function exerciseCatalogueDetail(id: string) {
  const matches = exerciseCatalogueEntries().filter(entry => entry.id === id);
  return matches.length === 1 ? matches[0] : undefined;
}
export function exerciseCatalogueSearch(filters: ExerciseCatalogueFilters) {
  if (!filters || typeof filters.query !== 'string' || filters.query.length > 200
    || (Object.keys(exerciseCatalogueOptions) as (keyof typeof exerciseCatalogueOptions)[]).some(key => !exerciseCatalogueOptions[key].some(option => option[0] === filters[key]))) {
    return { state: 'REVIEW_REQUIRED' as const, items: [], message: 'Review the current catalogue filters. No exercise or plan has changed.' };
  }
  const words = filters.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const items = exerciseCatalogueEntries().filter(entry => words.every(word => `${entry.name} ${entry.muscles.join(' ')} ${entry.goals.join(' ')} ${entry.equipment.join(' ')}`.toLocaleLowerCase().includes(word))
    && (!filters.equipment || entry.equipment.includes(filters.equipment)) && (!filters.muscle || entry.muscles.includes(filters.muscle))
    && (!filters.goal || entry.goals.includes(filters.goal)) && (!filters.level || entry.level === filters.level)
    && (!filters.limitation || filters.limitation === 'unassessed' && !entry.suitabilityAssessed || entry.movementFeatures.includes(filters.limitation))
    && (!filters.media || filters.media === 'ANY' && !!entry.media || filters.media === 'EXACT' && entry.media.exactApproved && Boolean(entry.media.reviewReceipt)));
  return { state: items.length ? 'READY' as const : 'NO_RESULTS' as const, items,
    message: items.length ? 'Fictional catalogue classifications; original exercise and media references are retained.' : filters.media === 'EXACT' ? 'No reviewed exact-variant demonstration is supplied. Related clips have not been relabelled as exact.' : 'No matching example is supplied. Change a filter or discuss the exact movement with Chuck; your plan is unchanged.' };
}
/** Return only the existing original ID; targets, plan identity and version belong to its editor. */
export function chooseCatalogueExercise(id: string, existingIds: readonly string[]) {
  const entry = exerciseCatalogueDetail(id);
  if (!entry || !Array.isArray(existingIds) || existingIds.includes(id) || !exerciseExamples.some(original => original.id === entry.originalId)) throw Error('Choose one available original exercise that is not already in your plan.');
  return { exerciseId: entry.originalId, catalogueVersion: entry.version, source: entry.metadataSource, targetsSupplied: false as const };
}
export function openCatalogueDetail(state: ExerciseCatalogueNavigation, id: string, scrollTop = state.listScrollTop): ExerciseCatalogueNavigation {
  if (!exerciseCatalogueDetail(id) || !Number.isFinite(scrollTop) || scrollTop < 0) throw Error('Open an available catalogue original.');
  return { ...state, filters: { ...state.filters }, detailId: id, trail: state.detailId ? [...state.trail, state.detailId] : [], listScrollTop: state.detailId ? state.listScrollTop : scrollTop };
}
export function catalogueBack(state: ExerciseCatalogueNavigation): ExerciseCatalogueNavigation {
  const trail = [...state.trail], previous = trail.pop();
  return { ...state, filters: { ...state.filters }, detailId: previous || '', trail };
}
