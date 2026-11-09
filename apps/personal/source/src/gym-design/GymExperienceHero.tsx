import {ArrowRight} from '@phosphor-icons/react';
import trainingImage from './source-media/member-training-hero-v2.png';
import bookingImage from './source-media/crays-performance-class-pexels-3775566.jpg';

/** Original section imagery only. Recipe screens intentionally do not use this component. */
export function GymExperienceHero({kind,onWorkout}:{kind:'training'|'book';onWorkout:()=>void}){
 const training=kind==='training';
 return <section className={'gym-lifestyle-hero gym-experience-hero '+(training?'gym-experience-training':'gym-experience-book')} aria-labelledby={'gym-'+kind+'-title'}>
  <img src={training?trainingImage:bookingImage} alt={training?'Strength athlete preparing for a barbell deadlift on the CRAYS performance floor':'Members training together in a coached CRAYS class'}/>
  <div className="gym-lifestyle-hero-copy"><p className="gym-lifestyle-kicker">{training?'YOUR NEXT MOVE':'MOVE TOGETHER'}</p><h1 id={'gym-'+kind+'-title'}>{training?'Built around your next move.':'Book a session'}</h1><p>{training?'Your plan, workouts and progress are ready when you are.':'Find your next class or appointment and manage your bookings.'}</p>{training&&<button type="button" className="gym-design-action primary" onClick={onWorkout}>Open workout<ArrowRight size={18}/></button>}</div>
  <span className="gym-lifestyle-preview">Design preview · sample data</span>
 </section>;
}
