import { atom, type PrimitiveAtom } from "jotai";
import { WindowBase, WindowClassDef, WindowMeta, WindowRect, type mbwin } from "./types";
import type { ComponentType, ReactElement } from "react";
// idea is, the window class atom defines the actual properties for windows to follow
// windows in the instances atom will then cross refrence with the class atom when actually used in the winhost
// standard window classes will exist, but apps will be able to make their own and deifne them in /.classes
export const windowClassDefAtom=atom<{[key:string]:mbwin.WindowClassDef}>({
  //default window classes
  StandardWindow:
    WindowClassDef.parse({
      minSize:{w:100,h:100},
      defaultSize:{w:320,h:240},
      singleton:false,
    }),
});
type WindowAtoms={
  base:mbwin.WindowBase,
  meta:PrimitiveAtom<mbwin.WindowMeta>,
  rect:PrimitiveAtom<mbwin.WindowRect>,
};
type WindowSpawn={
  base:mbwin.WindowBase,
  meta:mbwin.WindowMeta,
  rect:mbwin.WindowRect,
};
const windowAtomMap=new Map<string,WindowAtoms>();
export const getWindowAtoms=(uuid:string)=>windowAtomMap.get(uuid)!;
const registerWindow=({base,meta,rect}:WindowSpawn)=>{
  windowAtomMap.set(base.uuid,{
    base,
    meta:atom(meta),
    rect:atom(rect),
  });
  return base.uuid;
};

export const windowsAtom=atom<string[]>([]);
type OpenWindowArgs={
  class:string,
  id:string,
  component:ComponentType<any>,
  meta?:Partial<mbwin.WindowMeta>,
  rect?:Partial<mbwin.WindowRect>,
};
export const openWindowAtom=atom(null,(get,set,{class:cls,id,component,meta,rect}:OpenWindowArgs)=>{
  const def=get(windowClassDefAtom)[cls];
  if(!def)throw new Error(`unknown window class: ${cls}`);
  if(def.singleton){
    const existing=get(windowsAtom).find(u=>getWindowAtoms(u).base.class===cls);
    if(existing)return void set(focusWindowAtom,existing);
  }
  const uuid=registerWindow({
    base:WindowBase.parse({class:cls,id,uuid:crypto.randomUUID(),component}),
    meta:WindowMeta.parse(meta??{}),
    rect:WindowRect.parse({x:0,y:0,...def.defaultSize,...rect}),
  });
  set(windowsAtom,prev=>[...prev,uuid]);
});
export const closeWindowAtom=atom(null,(_get,set,uuid:string)=>{
  windowAtomMap.delete(uuid);
  set(windowsAtom,prev=>prev.filter(u=>u!==uuid));
});
export const focusWindowAtom=atom(null,(_get,set,uuid:string)=>{
  set(windowsAtom,prev=>[...prev.filter(u=>u!==uuid),uuid]);});
export const patchRectAtom=atom(null,(_get,set,{uuid,patch}:{uuid:string,patch:Partial<mbwin.WindowRect>})=>{
  const win=windowAtomMap.get(uuid);
  if(win)set(win.rect,prev=>({...prev,...patch}));
});
export const patchMetaAtom=atom(null,(_get,set,{uuid,patch}:{uuid:string,patch:Partial<mbwin.WindowMeta>})=>{
  const win=windowAtomMap.get(uuid);
  if(win)set(win.meta,prev=>({...prev,...patch}));
});
export const registerWindowClassAtom=atom(null,(_get,set,{name,def}:{name:string,def:mbwin.WindowClassDef})=>{
  set(windowClassDefAtom,prev=>({...prev,[name]:WindowClassDef.parse(def)}));
});