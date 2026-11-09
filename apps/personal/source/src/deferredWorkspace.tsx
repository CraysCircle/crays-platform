import {withWorkspaceEntryDeadline} from './workspaceEntryDeadline.mjs';
import {Component,Suspense,createElement,lazy,type ComponentType,type ReactNode} from 'react';

/** Existing views load on demand; their original props, context and state owners stay intact. */
class WorkspaceLoadBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<section role="alert" className="deferred-workspace-status"><p>This view could not open.</p><button type="button" onClick={()=>window.location.reload()}>Reload workspace</button></section>:this.props.children;}
}
export function deferredWorkspace<P extends object>(load:()=>Promise<{default:ComponentType<P>}>):ComponentType<P>{
 const View=lazy(()=>withWorkspaceEntryDeadline(()=>load()));
 return function DeferredWorkspace(props:P){
  return <WorkspaceLoadBoundary><Suspense fallback={<p role="status" className="deferred-workspace-status">Opening this view…</p>}>{createElement(View as ComponentType<P>,props)}</Suspense></WorkspaceLoadBoundary>;
 };
}
