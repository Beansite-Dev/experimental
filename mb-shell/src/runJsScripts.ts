import {mbfs,modTypes} from "mb-fs2";
import {parseLog} from "./logs";
import {mbsh} from "./store";
import {SetStateAction} from "jotai";
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor as new(...args:string[])=>(...args:unknown[])=>Promise<unknown>;
export const runJsScripts=async(
  script:string,
  scope:mbfs.Directory,
  mods:modTypes,
  logs:logs.LogType[],
  setLogs:(update:SetStateAction<logs.LogType[]>)=>void,
  dirTree:string[],
  vars:mbsh.ShellVariable[],
  setVars:(update:SetStateAction<mbsh.ShellVariable[]>)=>void,
  keyboardInputBuffer:{getValue:()=>string[]},
  signal:AbortSignal
):Promise<boolean>=>{
  const mbshBridge={
    console:{
      log:(msg:string)=>{
        const parsed=parseLog(msg);
        setLogs(prev=>[...prev,...parsed]);
      },
    },
    scope,
    logs,
    dirTree,
    setVars,
    signal,
    keyboardInputBuffer,
    mods,
    vars,
  };
  const aborted=new Promise<never>((_,rej)=>{
    if(signal.aborted)return rej(signal.reason);
    signal.addEventListener("abort",()=>rej(signal.reason),{once:true});
  });
  const fn=new AsyncFunction("mbshBridge",`"use strict";\n${script}`);
  await Promise.race([fn(mbshBridge),aborted]);
  return true;
};