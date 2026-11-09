import {SceneLoadBoundary} from '../SceneLoadBoundary';
import {captureNavigationView,restoreNavigationView,type NavigationViewState} from '../webNavigationViewState';
import {
  Activity,
  createContext,
  type CSSProperties,
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useIsPresent, type HTMLMotionProps } from "motion/react";
import { useDrag } from "@use-gesture/react";
import { useMobileDevice } from "./Device";
import { useKeyboard, useKeyboardDismissDrag, useKeyboardInsets } from "./Keyboard";
import {personalNavigationHref,personalNavigationLocation,personalNavigationPlacement,personalNavigationParents,type PersonalNavigationRoute} from '../webPersonalNavigation';
import {localPreviewId} from '../localPreviewId';

export type FlowScreen = {
  id: string;
  webRoute?: PersonalNavigationRoute;
  title?: string;
  header?: (flow: FlowControls) => ReactNode;
  headerHeight?: number;
  footer?: (flow: FlowControls) => ReactNode;
  footerHeight?: number;
  render: (flow: FlowControls) => ReactNode;
};

type FlowEntry = FlowScreen & {
  key: string;
};

/** Keep profile UI state on Back while hidden profile effects yield to the active
 * Messenger. Hidden human person routes yield their UI effects too; admitted
 * transports retain their independent account-scoped lifetime. Retained Chuck
 * workspace views also yield their reads; conversations and calls are unchanged. */
function RetainedProfileBody({entry,controls}:{entry:FlowEntry;controls:FlowControls}){return entry.render(controls);}

export type FlowControls = {
  returnLabel?:string;
  current: FlowEntry;
  previous: FlowEntry | null;
  stack: FlowEntry[];
  canGoBack: boolean;
  push: (screen: FlowScreen) => void;
  pop: () => void;
  replace: (screen: FlowScreen) => void;
  navigate: (screen: FlowScreen) => void;
  popTo?: (index: number) => void;
};

export type FlowBrowserNavigation = {
  scope: string;
  describe: (screen: FlowScreen) => PersonalNavigationRoute | undefined;
  resolve: (route: PersonalNavigationRoute) => FlowScreen;
  unavailable: () => FlowScreen;
};

const FlowContext = createContext<FlowControls | null>(null);

/** Explicit return destination for an existing screen opened from a web overview. */
export function FlowBackBoundary({onBack,label,children}:PropsWithChildren<{onBack:()=>void;label:string}>){const flow=useFlow();return <FlowContext.Provider value={{...flow,pop:onBack,returnLabel:label}}>{children}</FlowContext.Provider>;}

/** A modal must relinquish the top layer before an existing flow opens its destination. */
export function FlowNavigationBoundary({beforeNavigate,children}:PropsWithChildren<{beforeNavigate:()=>void}>){
 const flow=useFlow();const value=useMemo(()=>({...flow,push:(screen:FlowScreen)=>{beforeNavigate();flow.push(screen);},replace:(screen:FlowScreen)=>{beforeNavigate();flow.replace(screen);},navigate:(screen:FlowScreen)=>{beforeNavigate();flow.navigate(screen);}}),[flow,beforeNavigate]);
 return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlow() {
  const context = useContext(FlowContext);

  if (!context) {
    throw new Error("useFlow must be used inside FlowStack");
  }

  return context;
}

function FlowProvider({ value, children }: PropsWithChildren<{ value: FlowControls }>) {
  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

/** In the web copy, outgoing scenes must stop exposing content immediately during exit. */
function WebFlowScene({isTop,...props}:HTMLMotionProps<'div'>&{isTop:boolean}){
 const present=useIsPresent();
 return <motion.div {...props} data-flow-current={isTop&&present?'true':'false'} data-testid={isTop&&present?'flow-current':undefined}/>;
}

export function FlowStack({ initial, children, navigation }: PropsWithChildren<{ initial: FlowScreen; navigation?: FlowBrowserNavigation }>) {
  const { device } = useMobileDevice();
  const keyboard = useKeyboard();
  const { bottomInset, keyboardDragging } = useKeyboardInsets();
  const dismissKeyboardDrag = useKeyboardDismissDrag();
  const sequence = useRef(1);
  const gestureStartedAtEdge = useRef(false);
  const initialEntry = useRef<FlowEntry>({ ...initial, key: `${initial.id}-0` });
  const navigationRef=useRef(navigation);navigationRef.current=navigation;
  const initialStack=useRef<FlowEntry[]|null>(null);
  if(!initialStack.current){
    const location=navigation?personalNavigationLocation(window.location.pathname,window.location.hash):null;
    const destination=location?.kind==='invalid'?navigation!.unavailable():location?.kind==='route'&&location.route.name!=='home'?navigation!.resolve(location.route):undefined;
    const parents=location?.kind==='route'?personalNavigationParents(location.route).filter(route=>route.name!=='home').map(route=>{const screen=navigation!.resolve(route);return {...screen,key:`${screen.id}-${sequence.current++}`};}):[];
    initialStack.current=destination?[initialEntry.current,...parents,{...destination,key:`${destination.id}-${sequence.current++}`}]:[initialEntry.current];
  }
  const [stack, setStack] = useState<FlowEntry[]>(() => initialStack.current!);
  const stackRef=useRef(stack);stackRef.current=stack;
  const viewStates=useRef(new Map<string,NavigationViewState>());
  const pendingView=useRef<{key:string;state?:NavigationViewState}|null>(null);
  const rememberView=useCallback((explicitNavigation=false)=>{const root=document.querySelector<HTMLElement>('[data-flow-current="true"]'),key=root?.dataset.screenKey;if(key&&root&&(explicitNavigation||pendingView.current?.key!==key)&&root.querySelector('main,h1,[data-testid="mobile-scroll"]'))viewStates.current.set(key,captureNavigationView(root,viewStates.current.get(key)));},[]);
  const historySession=useRef<string>('');
  const historyFrames=useRef(new Map<string,{stack:FlowEntry[];href:string;chain:string;position:number}>());
  const historyOperation=useRef<'initial'|'push'|'replace'|'restore'|'adopt'>('initial');
  const [direction, setDirection] = useState(1);
  const [swipeX, setSwipeX] = useState(0);

  const toEntry = useCallback((screen: FlowScreen): FlowEntry => {
    const next = sequence.current;
    sequence.current += 1;
    return { ...screen, key: `${screen.id}-${next}` };
  }, []);

  const pop = useCallback(() => {
    rememberView();keyboard.hide();
    if(navigationRef.current){
      const marker=window.history.state?.craysPersonalNavigation;
      const frame=marker?.session===historySession.current&&typeof marker.key==='string'?historyFrames.current.get(marker.key):undefined;
      if(frame&&frame.href===window.location.pathname+window.location.hash&&frame.chain===marker.chain&&frame.position===marker.position&&marker.hasPrevious===true&&frame.position>0){window.history.back();return;}
      historyOperation.current='replace';
    }
    setDirection(-1);
    setStack((currentStack) => {
      if (currentStack.length <= 1) return currentStack;
      return currentStack.slice(0, -1);
    });
  }, [keyboard,rememberView]);

  const controls = useMemo<FlowControls>(() => {
    const current = stack[stack.length - 1];
    const previous = stack.length > 1 ? stack[stack.length - 2] : null;

    return {
      current,
      previous,
      stack,
      canGoBack: stack.length > 1,
      push: (screen) => {
        // A fresh explicit opener supersedes an older pending return-focus snapshot.
        rememberView(true);historyOperation.current='push';
        keyboard.hide();
        setDirection(1);
        setSwipeX(0);
        setStack((currentStack) => [...currentStack, toEntry(screen)]);
      },
      pop,
      replace: (screen) => {
        rememberView();historyOperation.current='replace';
        keyboard.hide();
        setDirection(1);
        setSwipeX(0);
        setStack((currentStack) => {
          const next = currentStack.slice(0, -1);
          return [...next, toEntry(screen)];
        });
      },
      navigate: (screen) => {
        rememberView();keyboard.hide();historyOperation.current='push';setDirection(1);setSwipeX(0);
        setStack(screen.id===initialEntry.current.id?[initialEntry.current]:[initialEntry.current,toEntry(screen)]);
      },
      popTo: (index) => {
        if(!Number.isInteger(index)||index<0||index>=stack.length-1)return;
        rememberView();keyboard.hide();const target=stack.slice(0,index+1),marker=window.history.state?.craysPersonalNavigation;
        if(navigationRef.current&&marker?.session===historySession.current){
          const frame=historyFrames.current.get(marker.key);
          if(frame&&frame.position===marker.position&&frame.chain===marker.chain){
            const match=[...historyFrames.current.values()].filter(value=>value.chain===frame.chain&&value.position<frame.position&&value.stack.length===target.length&&value.stack.every((entry,i)=>entry.key===target[i].key)).sort((a,b)=>b.position-a.position)[0];
            if(match){window.history.go(match.position-frame.position);return;}
          }
        }
        historyOperation.current='replace';setDirection(-1);setSwipeX(0);setStack(target);
      },
    };
  }, [keyboard, pop, stack, toEntry,rememberView]);

  useEffect(()=>{
    if(!navigation)return;
    historySession.current=localPreviewId();historyFrames.current.clear();
    const restore=()=>{
      rememberView();const nav=navigationRef.current;if(!nav)return;
      const location=personalNavigationLocation(window.location.pathname,window.location.hash);
      if(location.kind==='module')return;
      const href=window.location.pathname+window.location.hash,marker=window.history.state?.craysPersonalNavigation;
      const cached=marker?.session===historySession.current&&typeof marker.key==='string'?historyFrames.current.get(marker.key):undefined;
      let restored:FlowEntry[];
      const knownFrame=cached?.href===href;
      if(knownFrame)restored=cached.stack;
      else{
        const screen=location.kind==='route'?nav.resolve(location.route):nav.unavailable();
        const parents=location.kind==='route'?personalNavigationParents(location.route).filter(route=>route.name!=='home').map(route=>toEntry(nav.resolve(route))):[];
        restored=screen.id===initialEntry.current.id?[initialEntry.current]:[initialEntry.current,...parents,toEntry(screen)];
      }
      const target=restored.at(-1)!;pendingView.current={key:target.key,state:viewStates.current.get(target.key)};
      keyboard.hide();historyOperation.current=knownFrame?'restore':'adopt';setDirection(-1);setSwipeX(0);setStack(restored);
      const route=location.kind==='route'?location.route:undefined;
      // Original message destinations belong to VIFs; opener history still owns Back.
      if(route){const origin=route.name==='chuckOriginalMessage'?undefined:restored.slice(0,-1).reverse().map(entry=>nav.describe(entry)).find(value=>value&&value.name!=='home'&&!value.id);window.dispatchEvent(new CustomEvent('crays:personal-route',{detail:{route,placement:personalNavigationPlacement(origin||route)}}));}
    };
    window.addEventListener('popstate',restore);window.addEventListener('hashchange',restore);
    return()=>{window.removeEventListener('popstate',restore);window.removeEventListener('hashchange',restore);historyFrames.current.clear();};
  },[navigation?.scope,toEntry,rememberView]);

  useEffect(()=>{
    const nav=navigationRef.current;if(!nav)return;
    const operation=historyOperation.current;historyOperation.current='replace';
    const screen=stack[stack.length-1],route=nav.describe(screen);
    if(operation==='restore')return;
    const location=personalNavigationLocation(window.location.pathname,window.location.hash);
    if(operation==='initial'&&location.kind==='module')return;
    const base=window.location.pathname==='/__qa__/personal'?'/__qa__/personal':'/';
    const href=route?personalNavigationHref(route,base):window.location.pathname+window.location.hash;
    const key=localPreviewId(),previous=window.history.state?.craysPersonalNavigation;
    const prior=operation!=='adopt'&&previous?.session===historySession.current&&typeof previous.key==='string'?historyFrames.current.get(previous.key):undefined;
    const chain=prior?.chain||localPreviewId(),position=prior?prior.position+(operation==='push'?1:0):0;
    // Only opaque navigation references enter history; closures, private drafts and approvals stay in memory.
    const state={craysPersonalNavigation:{version:1,session:historySession.current,key,chain,position,hasPrevious:operation==='push'||!!prior&&previous.hasPrevious===true}};
    historyFrames.current.set(key,{stack,href,chain,position});
    if(operation==='push')window.history.pushState(state,'',href);else window.history.replaceState(state,'',href);
    if(route){const origin=route.id&&route.name!=='chuckOriginalMessage'?stack.slice(0,-1).reverse().map(entry=>nav.describe(entry)).find(value=>value&&value.name!=='home'&&!value.id):undefined;window.dispatchEvent(new CustomEvent('crays:personal-route',{detail:{route,placement:personalNavigationPlacement(origin||route)}}));}
  },[stack,navigation?.scope]);

  useEffect(()=>{if(!navigation)return;const track=()=>{const root=document.querySelector<HTMLElement>('[data-flow-current="true"]');if(root?.contains(document.activeElement))rememberView();};document.addEventListener('focusin',track);return()=>document.removeEventListener('focusin',track);},[navigation?.scope,rememberView]);

  useEffect(()=>{
    if(!navigation)return;
    const current=stack.at(-1);if(!current)return;
    const saved=pendingView.current?.key===current.key?pendingView.current.state:viewStates.current.get(current.key);
    let frame=0,finished=false;
    const attempt=()=>{
      const root=document.querySelector<HTMLElement>('[data-flow-current="true"]');
      if(finished||!root||root.dataset.screenKey!==current.key||stackRef.current.at(-1)?.key!==current.key)return;
      // Lazy presenters may initially suspend. A timer/empty scene is not a loaded destination.
      if(!root.querySelector('main,h1,[data-testid="mobile-scroll"]'))return;
      // Native top-layer dialogs temporarily make a returned scene unfocusable.
      // Restore only after modal withdrawal; a failed focus must not finish restoration.
      if(document.querySelector('dialog:modal'))return;
      const active=document.activeElement;
      restoreNavigationView(root,saved,active instanceof HTMLElement&&root.contains(active)&&active.matches('input,textarea,select'));
      pendingView.current=null;finished=true;observer.disconnect();
    };
    const observer=new MutationObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(attempt);});
    const host=document.querySelector('.flow-scenes');if(host)observer.observe(host,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
    frame=requestAnimationFrame(attempt);
    return()=>{finished=true;observer.disconnect();cancelAnimationFrame(frame);};
  },[stack,navigation?.scope]);

  const bindEdgeSwipe = useDrag(
    (state) => {
      if (!controls.canGoBack) return;

      if (state.first) {
        const target = state.event.currentTarget as HTMLElement;
        const bounds = target.getBoundingClientRect();
        gestureStartedAtEdge.current = state.initial[0] - bounds.left < 28;
      }

      if (!gestureStartedAtEdge.current) return;

      const [movementX] = state.movement;
      const [velocityX] = state.velocity;
      const [directionX] = state.direction;
      const nextX = Math.max(0, Math.min(movementX, device.geometry.screen.width));

      if (!state.last) {
        setSwipeX(nextX);
        return;
      }

      const shouldPop = nextX > 92 || (velocityX > 0.45 && directionX > 0);
      setSwipeX(0);
      gestureStartedAtEdge.current = false;

      if (shouldPop) {
        controls.pop();
      }
    },
    {
      axis: "x",
      filterTaps: true,
      pointer: { touch: true },
    },
  );

  const screenWidth = device.geometry.screen.width;
  const topIndex = stack.length - 1;
  const parkedX = -screenWidth * 0.28;
  const header = controls.current.header?.(controls);
  const headerHeight = controls.current.headerHeight ?? 0;
  const headerSafeArea = header ? device.geometry.safeArea.top : 0;
  const totalHeaderHeight = header ? headerSafeArea + headerHeight : 0;
  const footer = controls.current.footer?.(controls);
  const footerHeight = controls.current.footerHeight ?? 0;

  const screenVariants = {
    enter: (animationDirection: number) => ({
      x: animationDirection > 0 ? screenWidth : parkedX,
      scale: animationDirection > 0 ? 1 : 0.985,
    }),
    exit: (animationDirection: number) => ({
      x: animationDirection < 0 ? screenWidth : parkedX,
      scale: animationDirection < 0 ? 1 : 0.985,
    }),
  };

  return (
    <FlowProvider value={controls}>
      {children}
      <div
        className="flow-stack"
        data-testid="flow-stack"
        data-keyboard-dragging={keyboardDragging ? "true" : "false"}
        style={
          {
            "--flow-header-height": `${totalHeaderHeight}px`,
            "--flow-header-content-height": `${headerHeight}px`,
            "--flow-header-safe-area": `${headerSafeArea}px`,
            "--flow-footer-height": `${footer ? footerHeight : 0}px`,
            "--keyboard-height": `${bottomInset}px`,
          } as CSSProperties
        }
        {...bindEdgeSwipe()}
      >
        {header ? (
          <header className="flow-fixed-header" data-testid="flow-fixed-header">
            {header}
          </header>
        ) : null}
        <div className="flow-scenes">
          <AnimatePresence initial={false} custom={direction}>
            {stack.map((entry, index) => {
              const isTop = index === topIndex;
              const isVisible = index >= topIndex - 1;

              return (
                <WebFlowScene
                  isTop={isTop}
                  key={entry.key}
                  className="flow-screen"
                  data-screen-id={entry.id}
                  data-screen-key={entry.key}
                  custom={direction}
                  variants={screenVariants}
                  initial={isTop ? "enter" : false}
                  animate={{
                    x: isTop ? swipeX : parkedX,
                    scale: isTop ? 1 : 0.985,
                  }}
                  exit="exit"
                  transition={{ type: "spring", stiffness: 360, damping: 38, mass: 0.9 }}
                  style={{
                    opacity: isVisible ? 1 : 0,
                    pointerEvents: isTop ? "auto" : "none",
                    visibility: isVisible ? "visible" : "hidden",
                    zIndex: isTop ? 2 : 1,
                  }}
                >
                  <SceneLoadBoundary>{(navigation?.describe(entry)?.name==='memberProfile'||['chuck','chuckWorkspace','chuckTasks','chuckKnowledge','chuckKnowledgeNotes','chuckKnowledgeSources','chuckKnowledgePreferences','chuckResults','chuckPeople','chuckSavedPeople','chuckDismissedPeople','chuckRecommendation','chuckRecommendedPerson','agentTask'].includes(navigation?.describe(entry)?.name??'')||(navigation?.describe(entry)?.name==='conversation'&&navigation?.describe(entry)?.id?.startsWith('person:')))?<Activity mode={isTop?'visible':'hidden'}><RetainedProfileBody entry={entry} controls={controls}/></Activity>:entry.render(controls)}</SceneLoadBoundary>
                </WebFlowScene>
              );
            })}
          </AnimatePresence>
        </div>
        {footer ? (
          <footer className="flow-fixed-footer" data-testid="flow-fixed-footer" {...dismissKeyboardDrag}>
            {footer}
          </footer>
        ) : null}
      </div>
    </FlowProvider>
  );
}
