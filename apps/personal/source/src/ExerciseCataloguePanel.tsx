import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, CaretRight, ChatCircle, Images, MagnifyingGlass, SlidersHorizontal } from '@phosphor-icons/react';
import { useKeyboard } from './mobile';
import { VoiceInput } from './VoiceInput';
import { catalogueBack, chooseCatalogueExercise, exerciseCatalogueDetail, exerciseCatalogueOptions, exerciseCatalogueSearch, newExerciseCatalogueNavigation, openCatalogueDetail, type ExerciseCatalogueFilters, type ExerciseCatalogueNavigation } from './exerciseCatalogue.ts';
import './exercise-catalogue-panel.css';

export type ExerciseCataloguePanelProps = {
  state?: ExerciseCatalogueNavigation;
  onStateChange?: (state: ExerciseCatalogueNavigation) => void;
  selectedExerciseIds?: readonly string[];
  onChoose?: (originalExerciseId: string) => void;
  onMedia: (originalExerciseId: string) => void;
  onBack: () => void;
  onAskChuck?: (request: string) => void;
};
const filterLabels = { equipment: 'Equipment', muscle: 'Muscle area', goal: 'Goal', level: 'Catalogue level', limitation: 'Movement constraint', media: 'Media review' } as const;

/** Embed inside the existing training MobileScroll, retaining the same plan/draft. */
export function ExerciseCataloguePanel({ state, onStateChange, selectedExerciseIds = [], onChoose, onMedia, onBack, onAskChuck }: ExerciseCataloguePanelProps) {
  const keyboard = useKeyboard(), root = useRef<HTMLElement>(null);
  const [local, setLocal] = useState(newExerciseCatalogueNavigation), [message, setMessage] = useState('');
  const navigation = state || local, detail = navigation.detailId ? exerciseCatalogueDetail(navigation.detailId) : undefined;
  const result = exerciseCatalogueSearch(navigation.filters);
  const update = (next: ExerciseCatalogueNavigation) => { setMessage(''); if (onStateChange) onStateChange(next); else setLocal(next); };
  const scroll = () => root.current?.closest('[data-testid="mobile-scroll"]') as HTMLElement | null;
  useLayoutEffect(() => { scroll()?.scrollTo({ top: navigation.detailId ? 0 : navigation.listScrollTop }); }, [navigation.detailId]);
  const open = (id: string) => { keyboard.hide(); try { update(openCatalogueDetail(navigation, id, scroll()?.scrollTop || 0)); } catch (error) { setMessage(error instanceof Error ? error.message : 'Review this original exercise.'); } };
  const change = (key: keyof ExerciseCatalogueFilters, value: string) => { update({ ...navigation, filters: { ...navigation.filters, [key]: value } }); };
  const back = () => { keyboard.hide(); if (navigation.detailId) update(catalogueBack(navigation)); else onBack(); };
  const choose = () => { if (!detail || !onChoose) return; keyboard.hide(); try { onChoose(chooseCatalogueExercise(detail.id, selectedExerciseIds).exerciseId); } catch (error) { setMessage(error instanceof Error ? error.message : 'Review this original exercise.'); } };
  const activeCount = Object.values(navigation.filters).filter(Boolean).length;

  return <section ref={root} className="exercise-catalogue-panel" aria-label="Exercise catalogue">
    <button className="training-link" onClick={back}><ArrowLeft size={19} />{navigation.detailId ? navigation.trail.length ? 'Back to previous exercise' : 'Back to filtered exercises' : 'Back to my training'}</button>
    {navigation.detailId ? !detail ? <section className="exercise-catalogue-empty"><h2>This exercise is unavailable.</h2><p>Your original plan and filtered list are retained. Go back and choose an available original.</p></section> : <>
      <p className="eyebrow">EXERCISE ORIGINAL</p><h1>{detail.name}</h1>
      <img className="training-demo-media" src={`/assets/crays/training/${detail.originalSlug}-poster.jpg`} alt={`${detail.name} related movement illustration; exact variant not verified`} />
      <p className="exercise-catalogue-boundary">Related illustration · exact-variant review not supplied</p>
      <p>{detail.description}</p>
      <dl className="exercise-catalogue-facts"><div><dt>Equipment</dt><dd>Bodyweight</dd></div><div><dt>Example classification</dt><dd>{detail.level === 'BEGINNER' ? 'Beginner' : detail.level === 'INTERMEDIATE' ? 'Intermediate' : 'Not classified'}</dd></div><div><dt>Area</dt><dd>{detail.muscles.includes('upper-body') ? 'Upper body' : 'Whole body'}</dd></div><div><dt>Personal suitability</dt><dd>Not assessed</dd></div></dl>
      <button className="secondary" onClick={() => { keyboard.hide(); onMedia(detail.originalId); }}><Images size={20} />View pictures & related video</button>
      <p className="exercise-catalogue-boundary">{detail.media.note}</p>
      <h2>Written variant & technique checks</h2><ol>{detail.techniqueCues.map(cue => <li key={cue}>{cue}</li>)}</ol>
      <h2>Common interpretation mistakes</h2><ul>{detail.commonMistakes.map(mistake => <li key={mistake}>{mistake}</li>)}</ul>
      <details className="exercise-catalogue-source"><summary>Original sources & media review</summary><p>Exercise identity and written notes are retained from the CRAYS local training example. Filter classifications and alternative links are fictional catalogue metadata, not a live provider publication or a clinical assessment.</p><p>{detail.media.author} · {detail.media.licence}</p><p><a href={detail.media.sourceUrl} target="_blank" rel="noreferrer">Original related-media source</a> · <a href={detail.media.licenceUrl} target="_blank" rel="noreferrer">Media licence</a></p><p>Exact exercise, variant and equipment review: not supplied. No signed publication or exact-review receipt is claimed. Existing local media credits remain available in the player.</p></details>
      <h2>Compare alternatives</h2>
      {detail.alternatives.length ? detail.alternatives.map(alternative => { const other = exerciseCatalogueDetail(alternative.id); return other && <button className="exercise-catalogue-row" key={other.id} onClick={() => open(other.id)}><span><strong>{other.name}</strong><small>{alternative.reason}</small></span><CaretRight size={18} /></button>; }) : <p className="exercise-catalogue-caption">No source-qualified equivalent alternative is supplied. Ask about the exact movement before changing your plan.</p>}
      <p className="exercise-catalogue-caption">Comparing another example never replaces an exercise or its targets. A plan change needs its own review.</p>
      {onChoose && <button className="primary" disabled={selectedExerciseIds.includes(detail.id)} onClick={choose}>{selectedExerciseIds.includes(detail.id) ? 'Already in this plan' : 'Choose this original exercise'}</button>}
      {onAskChuck && <button className="training-link" onClick={() => { keyboard.hide(); onAskChuck(`Help me clarify the exact ${detail.name} variant and its suitability for my own training. The available clip is a related movement example, not a reviewed exact demonstration. Prepare advice for my review; do not change my plan.`); }}><ChatCircle size={20} />Discuss this movement with Chuck</button>}
    </> : <>
      <p className="eyebrow">EXERCISE LIBRARY</p><h1>Find your next move.</h1>
      <label className="exercise-catalogue-search"><MagnifyingGlass size={20} /><VoiceInput aria-label="Search exercise catalogue" type="search" maxLength={200} value={navigation.filters.query} placeholder="Name, muscle area or goal" onBlur={() => keyboard.hide()} onChange={event => change('query', event.target.value)} /></label>
      <details className="exercise-catalogue-filters"><summary><SlidersHorizontal size={20} />Filter exercises{activeCount ? ` · ${activeCount} active` : ''}</summary>
        <div className="exercise-catalogue-filter-grid">{(Object.keys(exerciseCatalogueOptions) as (keyof typeof exerciseCatalogueOptions)[]).map(key => <label key={key}><span>{filterLabels[key]}</span><select aria-label={`Exercise ${filterLabels[key].toLowerCase()}`} value={navigation.filters[key]} onChange={event => { keyboard.hide(); change(key, event.target.value); }}>{exerciseCatalogueOptions[key].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>)}</div>
        <p className="exercise-catalogue-caption">These fictional classifications demonstrate the planned catalogue. Movement constraints describe the written variant, not the related video, medical clearance or suitability for an injury.</p>
        <button className="quiet" disabled={!activeCount} onClick={() => { keyboard.hide(); update(newExerciseCatalogueNavigation()); }}>Clear exercise filters</button>
      </details>
      <p className="exercise-catalogue-caption" role="status">{result.items.length} matching {result.items.length === 1 ? 'example' : 'examples'}. {result.message}</p>
      {result.items.map(entry => <button className="exercise-catalogue-result" key={entry.id} onClick={() => open(entry.id)}><img src={`/assets/crays/training/${entry.originalSlug}-poster.jpg`} alt="" /><span><strong>{entry.name}</strong><small>{entry.muscles.includes('upper-body') ? 'Upper body' : 'Whole body'} · Bodyweight</small><small>Related media · exact variant not reviewed</small></span><CaretRight size={18} /></button>)}
      {!result.items.length && <section className="exercise-catalogue-empty"><h2>{result.state === 'REVIEW_REQUIRED' ? 'Review these filters.' : 'No matching example supplied.'}</h2><p>Change a filter or describe the movement you need. We do not substitute another exercise, approve a clip or change your plan automatically.</p></section>}
      {onAskChuck && <button className="training-link" disabled={!navigation.filters.query.trim()} onClick={() => { keyboard.hide(); onAskChuck(navigation.filters.query.trim()); }}><ChatCircle size={20} />Review my exercise question with Chuck</button>}
    </>}
    {message && <p role="alert" className="exercise-catalogue-boundary">{message}</p>}
  </section>;
}
