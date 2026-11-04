import { atom } from 'jotai';
export const logAtom=atom<logs.LogType[]>([]);
export declare namespace mbsh {
  interface ShellVariable {
    name:string;
    value:any;
  }
}
export const variableAtom=atom<mbsh.ShellVariable[]>([
  {
    name:"HOME",
    value:"/home/administrator/"
  }
]);
export const keyboardInputBufferAtom=atom<string[]>([]);
export const keyboardInputBufferDerivedAtom=atom(
  (get)=>{return{getValue:():string[]=>get(keyboardInputBufferAtom),};},
  (get,set,key:string)=>{
    const nextValue=[...get(keyboardInputBufferAtom),key];
    set(keyboardInputBufferAtom,nextValue);
    return nextValue;
  }
);