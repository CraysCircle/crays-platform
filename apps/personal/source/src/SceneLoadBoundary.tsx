import {Suspense,useEffect,type ReactNode} from 'react';
import {noteViewStability} from './viewStability';
function SceneOpening(){useEffect(()=>{noteViewStability('scene-opening-mounted');return()=>noteViewStability('scene-opening-unmounted');},[]);return <section className="scene-opening" role="status" aria-live="polite"><p>Loading this page…</p></section>;}
/** A deferred page must not suspend the already admitted shared navigation/chrome. */
export function SceneLoadBoundary({children}:{children:ReactNode}){return <Suspense fallback={<SceneOpening/>}>{children}</Suspense>;}
