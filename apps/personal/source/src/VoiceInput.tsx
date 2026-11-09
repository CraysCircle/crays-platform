import {useRef,useState,type ComponentPropsWithRef} from 'react';
import {KeyboardInput,KeyboardTextarea,useKeyboard} from './mobile';
import {VoiceDraftControl} from './VoiceDraftControl';
import './voice-input.css';

const nextTextField=(target:EventTarget|null)=>target instanceof HTMLElement&&target.matches('textarea:not([disabled]):not([readonly]),input:not([disabled]):not([readonly]):not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=file]):not([type=range]):not([type=hidden])');

/** App-owned enhancement; keeps the protected keyboard-aware input untouched. */
export function VoiceInput(props:ComponentPropsWithRef<typeof KeyboardInput>){
 const keyboard=useKeyboard();
 const blur:NonNullable<typeof props.onBlur>=event=>{if(!nextTextField(event.relatedTarget))keyboard.hide();props.onBlur?.(event);};
 const shell=useRef<HTMLDivElement>(null);
 const [local,setLocal]=useState(()=>String(props.defaultValue??''));
 const label=String(props['aria-label']||props.placeholder||'This field');
 const type=props.type||'text';
 const eligible=['text','search','email','tel','url'].includes(type)&&!props.disabled&&!props.readOnly&&props.inputMode!=='numeric'&&props.inputMode!=='decimal'&&!/^Message Chuck(?: Crays)?$/.test(label);
 if(!eligible)return <KeyboardInput {...props} onBlur={blur}/>;
 const value=String(props.value??local);
 return <div className="voice-input-shell" ref={shell}>
 <KeyboardInput {...props} onBlur={blur} onChange={event=>{setLocal(event.target.value);props.onChange?.(event);}}/>
 <VoiceDraftControl compact label={label} value={value} maxLength={props.maxLength} onChange={words=>{
  const input=shell.current?.querySelector('input');if(!input||input.disabled||input.readOnly)return;
  const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
  // A real input event preserves the original controlled form's validation path.
  // Never synthesize Enter, submit, approval or navigation events.
  setter?.call(input,words.replace(/[\r\n]+/g,' '));
  input.dispatchEvent(new Event('input',{bubbles:true}));
 }}/>
 </div>;
}

export function VoiceTextarea(props:ComponentPropsWithRef<typeof KeyboardTextarea>){
 const keyboard=useKeyboard();
 const blur:NonNullable<typeof props.onBlur>=event=>{if(!nextTextField(event.relatedTarget))keyboard.hide();props.onBlur?.(event);};
 const shell=useRef<HTMLDivElement>(null);
 const [local,setLocal]=useState(()=>String(props.defaultValue??''));
 const label=String(props['aria-label']||props.placeholder||'This field');
 if(props.disabled||props.readOnly)return <KeyboardTextarea {...props} onBlur={blur}/>;
 return <div className="voice-textarea-shell" ref={shell}>
 <KeyboardTextarea {...props} onBlur={blur} onChange={event=>{setLocal(event.target.value);props.onChange?.(event);}}/>
 <VoiceDraftControl label={label} value={String(props.value??local)} maxLength={props.maxLength} onChange={words=>{
  const field=shell.current?.querySelector('textarea');if(!field||field.disabled||field.readOnly)return;
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')?.set?.call(field,words);
  field.dispatchEvent(new Event('input',{bubbles:true}));
 }}/>
 </div>;
}
