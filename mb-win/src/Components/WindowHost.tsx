//WinHost.tsx
import { memo } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { windowsAtom, windowClassDefAtom, focusWindowAtom, patchRectAtom, getWindowAtoms } from "../store";
import { Window } from "./Window";
export const WinHost=()=>{
  const uuids=useAtomValue(windowsAtom);
  return<>{uuids.map((uuid,i)=><Win key={uuid} uuid={uuid} z={i}/>)}</>;
};
const Win=memo(({uuid,z}:{uuid:string,z:number})=>{
  const{base,meta:metaAtom,rect:rectAtom}=getWindowAtoms(uuid);
  const meta=useAtomValue(metaAtom);
  const rect=useAtomValue(rectAtom);
  const classDef=useAtomValue(windowClassDefAtom)[base.class];
  const patchRect=useSetAtom(patchRectAtom);
  const focus=useSetAtom(focusWindowAtom);
  const Comp=base.component;
  if(!classDef)return null;
  return<Window
    {...{rect,meta,z,minSize:classDef.minSize}}
    onFocus={()=>focus(uuid)}
    onRectChange={patch=>patchRect({uuid,patch})}>
      <Comp/>
  </Window>;
});