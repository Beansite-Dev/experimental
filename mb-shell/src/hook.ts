import { useAtom } from "jotai/react";
import { commandHistoryAtom, keyboardInputBufferAtom, keyboardInputBufferDerivedAtom, logAtom, mbsh, positionInCommandHistoryAtom, variableAtom } from "./store";
import { ComponentPropsWithoutRef, ComponentPropsWithRef, KeyboardEvent, RefObject, useEffect, useRef, useState } from "react";
import { useFileSystem } from "mb-fs2";
import { SetStateAction } from "jotai";
import { runShellCommand } from "./runShellCommand";
import { clamp, parseShell } from "./lib";
export const useShell=():[
  logs.LogType[],//logs
  ((update: SetStateAction<logs.LogType[]>)=>void),//logs setter
  (code:string,echo:boolean)=>Promise<void>,//interpreter
  ReturnType<typeof useFileSystem>[0],//filesystem
  ReturnType<typeof useFileSystem>[1],//scope
  ReturnType<typeof useFileSystem>[2],//dirTree (in uuids)
  ReturnType<typeof useFileSystem>[3],//modifier functions
  ComponentPropsWithRef<'textarea'>,
  boolean,
]=>{
  const[logs,setLogs]=useAtom(logAtom);
  const[vars,setVars]=useAtom(variableAtom);
  const[running,setRunning]=useState<boolean>(false);
  const[keyboardInputBuffer,setKeyboardInputBuffer]=useAtom(keyboardInputBufferDerivedAtom);
  const[commandHistory,setCommandHistory]=useAtom(commandHistoryAtom);
  const[positionInCommandHistory,setPositionInCommandHistory]=useAtom(positionInCommandHistoryAtom);
  const[
    filesystem,
    scope,
    dirTree,
    mods,
  ]=useFileSystem();
  // const store=getDefaultStore();//no longer needed
  //filesystem is persistent but scope is not. Perfect for this ComponentPropsWithRef
  const textAreaRef=useRef<HTMLTextAreaElement>(null);
  const textAreaEvents={
    ref:textAreaRef,
    onKeyDown:(e:KeyboardEvent<HTMLTextAreaElement>)=>{
      setKeyboardInputBuffer(e.key);
      if(e.ctrlKey){
        switch(e.code){
          case"KeyC":
            e.preventDefault();
            e.stopPropagation();
            if(e.shiftKey){
              const start=e.currentTarget.selectionStart;
              const end=e.currentTarget.selectionEnd;
              let textToCopy=e.currentTarget.value;
              if(start!==end)textToCopy=e.currentTarget.value.substring(start,end);
              if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(textToCopy);
              else{
                e.currentTarget.select();
                document.execCommand("copy");
              }
            }else{
              //quit program
            }
          break;
          default:console.log(e.key);
        }
      }
      if(e.key==="ArrowUp"){
        e.preventDefault();
        e.stopPropagation();
        setPositionInCommandHistory(x=>clamp(x+1,-1,commandHistory.length-1));
      }
      if(e.key==="ArrowDown"){
        e.preventDefault();
        e.stopPropagation();
        setPositionInCommandHistory(x=>clamp(x-1,-1,commandHistory.length-1));
      }
      if(e.key==="Enter"&&!e.shiftKey){
        e.preventDefault();
        e.stopPropagation();
        setPositionInCommandHistory(-1);
        setCommandHistory(x=>[e.currentTarget.value,...x]);
        interpreter(e.currentTarget.value,true).catch(console.error);
        e.currentTarget.value="";
      }
    },
  };
  useEffect(()=>{
    if(positionInCommandHistory===-1)textAreaRef.current!.value="";
    if(commandHistory[positionInCommandHistory]){
      textAreaRef.current!.value=commandHistory[positionInCommandHistory];
      textAreaRef.current!.focus();
      textAreaRef.current!.setSelectionRange(textAreaRef.current!.value.length,textAreaRef.current!.value.length);
    }
  },[positionInCommandHistory]);
  const active=useRef(0);
  const interpreter=async(code:string,echo:boolean):Promise<void>=>{
    const commands:mbsh.ShellCommand[][]=parseShell(code);
    for(const command of commands){
      let ok:boolean=true;
      for(let i=0;i<command.length;i++){
        const sub=command[i];
        const next:string|undefined=command[i+1]?.invoker;
        console.log("run",sub.subcommand,"| before:",sub.invoker,"| after:",next);
        if(sub.invoker==="&&"&&!ok){console.log("skip",sub.subcommand);continue;}
        if(echo)setLogs(x=>[...x,
          {t:"nl"},
          ...(sub.invoker===""||!((sub.i||0)>0)
            ?[{t:"nl"},{t:"l",m:`/${mods.getNamesFromUuids(dirTree).join("/")} > ${sub.commandOfOrigin}`},{t:"nl"}]
            :[]
          )as logs.LogType[],
        ]);
        active.current++;
        setRunning(true);
        const p:Promise<boolean>=runShellCommand(
          sub,scope,mods,logs,setLogs,dirTree,interpreter,vars,setVars,keyboardInputBuffer,
        ).then(r=>{
          active.current--;
          setRunning(active.current>0);
          console.log("done",sub.subcommand,r);
          return r;
        });
        switch(next){
          case"&":ok=true;break;
          default:ok=await p;
        }
      }
    }
  };
  return[
    logs,
    setLogs,
    interpreter,
    filesystem,
    scope,
    dirTree,
    mods,
    textAreaEvents,
    running,
  ];
};