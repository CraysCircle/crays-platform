import {useEffect,useMemo,useSyncExternalStore} from 'react';
import {createExerciseApi} from './client/exercise-api';
import {createExerciseCatalogue,selectExerciseCatalogueSnapshot,type ExerciseFilters} from './client/exercise-catalogue';
import type {GymAccess} from './client/gym-access';

/** Display isolation follows the existing native Gym scope. It is never sent
 * as a credential or substituted for the original server authorization. */
export function useExerciseCatalogue(active:boolean,access:GymAccess|null,filters:ExerciseFilters,onAccessInvalidated:()=>void){
 const api=useMemo(()=>createExerciseApi(onAccessInvalidated),[onAccessInvalidated]);
 const controller=useMemo(()=>createExerciseCatalogue(api),[api]);
 const ownerKey=active&&access?.kind==='ready'?access.ownerKey:'';
 const {query,muscle,equipment,movement,goal,level,limitation,media}=filters;
 const selection=useMemo(()=>({query,muscle,equipment,movement,goal,level,limitation,media}),[query,muscle,equipment,movement,goal,level,limitation,media]);
 const snapshot=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getServerSnapshot);
 useEffect(()=>{controller.start(ownerKey,selection);return()=>controller.clear();},[controller,ownerKey,selection]);
 return {state:selectExerciseCatalogueSnapshot(snapshot,ownerKey,selection),api,retry:controller.retry,loadMore:controller.loadMore,ownerKey};
}
