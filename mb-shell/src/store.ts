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