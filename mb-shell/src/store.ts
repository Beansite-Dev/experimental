import { atom } from 'jotai';
export const logAtom=atom<logs.LogType[]>([]);
export declare namespace mbsh {
  interface ShellVariable {
    name:string;
    value:any;
  }
  interface ShellCommandBase {
    commandOfOrigin:string;
    subcommand:string;
    invoker:string;
    i?:number;
  }
  interface StandardShellCommand extends ShellCommandBase{invoker:"";}
  interface NewLineShellCommand extends ShellCommandBase{invoker:"newline";}
  interface SingleAmpersandCommand extends ShellCommandBase{invoker:"&";}
  interface DoubleAmpersandCommand extends ShellCommandBase{invoker:"&&";}
  interface FileOriginShellCommand extends ShellCommandBase{invoker:"file";}
  interface SubstitutionOriginShellCommand extends ShellCommandBase{invoker:"substitution";}
  type ShellCommand=StandardShellCommand
    |FileOriginShellCommand
    |NewLineShellCommand
    |SubstitutionOriginShellCommand
    |SingleAmpersandCommand
    |DoubleAmpersandCommand;
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
export const commandHistoryAtom=atom<string[]>([]);
export const positionInCommandHistoryAtom=atom<number>(-1);