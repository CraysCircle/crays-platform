import {createContext,useContext,useMemo,useState,type PropsWithChildren,type Dispatch,type SetStateAction} from 'react';

type Placement={inline:boolean;target:HTMLDivElement|null;setTarget:Dispatch<SetStateAction<HTMLDivElement|null>>};
const Context=createContext<Placement|null>(null);
export const useSpotCreatePlacement=()=>useContext(Context);

/** Per-screen presentation target for the unchanged original Create action. */
export function SpotCreatePlacement({inline,children}:PropsWithChildren<{inline:boolean}>){
 const [target,setTarget]=useState<HTMLDivElement|null>(null);
 const value=useMemo(()=>({inline,target,setTarget}),[inline,target]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
