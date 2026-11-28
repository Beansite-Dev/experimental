import React from "react";
import { transform } from "sucrase";
import { mbfs, modTypes } from "mb-fs2";
import { parseLog } from "./logs";
import { mbsh } from "./store";
import { SetStateAction } from "jotai";
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor as new(...args:string[])=>(...args:unknown[])=>Promise<unknown>;
const compile=(script:string)=>transform(script,{
  transforms:["typescript","jsx"],
  jsxRuntime:"classic",
  production:true,
}).code;
const toErr=(e:unknown)=>({
  name:e instanceof Error?e.name:"Error",
  reason:e instanceof Error?e.message:String(e),
});
const makeBoundary=(report:(e:unknown)=>void)=>(Comp:React.ComponentType<any>)=>{
  class Boundary extends React.Component<{p:any},{err:unknown}>{
    state={err:null as unknown};
    static getDerivedStateFromError(err:unknown){return{err}}
    componentDidCatch(err:unknown){report(err)}
    render(){
      if(this.state.err===null)return React.createElement(Comp,this.props.p);
      const{name,reason}=toErr(this.state.err);
      return React.createElement("pre",{style:{color:"red",whiteSpace:"pre-wrap"}},`${name}: ${reason}`);
    }
  }
  return(props:any)=>React.createElement(Boundary,{p:props});
};
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
  signal:AbortSignal,
  wm:mbsh.wm,
):Promise<boolean>=>{
  const log=(msg:string)=>{
    const parsed=parseLog(msg);
    setLogs(prev=>[...prev,...parsed]);
  };
  const reportError=(e:unknown)=>{
    const{name,reason}=toErr(e);
    log(`${name}: ${reason}`);
  };
  const withBoundary=makeBoundary(reportError);
  const safeWm=Object.fromEntries(Object.entries(wm).map(([k,f])=>[
    k,
    typeof f==="function"
      ?(args:any)=>f(args?.component?{...args,component:withBoundary(args.component)}:args)
      :f,
  ])) as typeof wm;
  const mbshBridge={
    console:{log},
    reportError,
    scope,
    logs,
    dirTree,
    setVars,
    signal,
    keyboardInputBuffer,
    mods,
    vars,
    wm:safeWm,
  };
  const aborted=new Promise<never>((_,rej)=>{
    if(signal.aborted)return rej(signal.reason);
    signal.addEventListener("abort",()=>rej(signal.reason),{once:true});
  });
  let code:string;
  try{code=compile(script)}catch(e){
    throw{...toErr(e),name:"CompileError"};
  }
  const fn=new AsyncFunction("mbshBridge","React",`"use strict";\n${code}`);
  try{
    await Promise.race([fn(mbshBridge,React),aborted]);
    return true;
  }catch(e){
    if(signal.aborted)throw e;
    throw toErr(e);
  }
};