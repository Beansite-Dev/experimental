import { useAtom } from "jotai/react";
import { commandHistoryAtom, keyboardInputBufferAtom, keyboardInputBufferDerivedAtom, logAtom, mbsh, positionInCommandHistoryAtom, variableAtom } from "./store";
import { ComponentPropsWithoutRef, ComponentPropsWithRef, KeyboardEvent, RefObject, useEffect, useRef, useState } from "react";
import { mbfs, useFileSystem } from "mb-fs2";
import { SetStateAction } from "jotai";
import { runShellCommand } from "./runShellCommand";
import { clamp, parsePath, parseShell } from "./lib";
import { functionMap } from "./interpreterFunctionMap";
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
  const sessions=useRef(new Set<AbortController>());
  const[
    filesystem,
    scope,
    dirTree,
    mods,
  ]=useFileSystem();
  const logsRef=useRef(logs);
  const varsRef=useRef(vars);
  logsRef.current=logs;
  varsRef.current=vars;
  const setLogsLatest=(update:SetStateAction<logs.LogType[]>):void=>{
    logsRef.current=typeof update==="function"?update(logsRef.current):update;
    setLogs(update);
  };
  const setVarsLatest=(update:SetStateAction<mbsh.ShellVariable[]>):void=>{
    varsRef.current=typeof update==="function"?update(varsRef.current):update;
    setVars(update);
  };
  const textAreaRef=useRef<HTMLTextAreaElement>(null);
  const draft=useRef<string>("");
  const complete=(ta:HTMLTextAreaElement):void=>{
    const before=ta.value.slice(0,ta.selectionStart);
    const after=ta.value.slice(ta.selectionStart);
    const tokenStart=Math.max(before.lastIndexOf(" "),before.lastIndexOf("\n"))+1;
    const token=before.slice(tokenStart);
    const prev=before.slice(0,tokenStart).trim().split(/\s+/).at(-1)||"";
    const isCommand=["","sudo","&&","&",";"].includes(prev);
    const slash=isCommand?-1:token.lastIndexOf("/");
    const prefix=token.slice(0,slash+1);
    const base=token.slice(slash+1);
    let options:string[]=[];
    if(isCommand)options=Object.keys(functionMap).filter(x=>x&&x.startsWith(base));
    else try{
      const names=parsePath(prefix||"./",mods.getNamesFromUuids(mods.getCurrentDirTree()));
      const d=mods.getDirectoryContents(mods.getUuidsFromDirectoryNames(names));
      options=Object.values(d.data)
        .map(x=>x.metadata.typeof.directory?`${x.name}/`:`${x.name}.${(x as mbfs.File).type}`)
        .filter(x=>x.startsWith(base));
    }catch{return;}
    if(!options.length)return;
    options=[...new Set(options)].sort();
    const common=options.reduce((a,b)=>{
      let i=0;
      while(i<a.length&&a[i]===b[i])i++;
      return a.slice(0,i);
    });
    if(options.length>1&&common.length===base.length){
      setLogsLatest(x=>[...x,{t:"nl"},{t:"l",m:options.join("  ")},{t:"nl"}]);
      return;
    }
    const done=options.length===1&&!common.endsWith("/")?`${common} `:common;
    ta.value=`${before.slice(0,tokenStart)}${prefix}${done}${after}`;
    const pos=tokenStart+prefix.length+done.length;
    ta.setSelectionRange(pos,pos);
  };
  const textAreaEvents:ComponentPropsWithRef<'textarea'>={
    ref:textAreaRef,
    autoFocus:true,
    spellCheck:false,
    autoCapitalize:"off",
    autoCorrect:"off",
    "aria-label":"terminal input",
    style:running?{
      position:"fixed",
      top:0,
      left:0,
      width:1,
      height:1,
      padding:0,
      border:0,
      opacity:0,
      overflow:"hidden",
      resize:"none",
      pointerEvents:"none",
      caretColor:"transparent",
    }:{},
    onBlur:e=>{
      if(!e.relatedTarget&&running)requestAnimationFrame(()=>e.target.focus());
    },
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
              sessions.current.forEach(c=>c.abort());
            }
          break;
          case"KeyL":e.preventDefault();e.stopPropagation();setLogsLatest([]);break;
          case"KeyU":e.preventDefault();e.stopPropagation();e.currentTarget.value="";break;
          default:console.log(e.key);
        }
      }
      if(e.key==="Tab"){
        e.preventDefault();
        e.stopPropagation();
        if(!running)complete(e.currentTarget);
      }
      if(e.key==="ArrowUp"){
        e.preventDefault();
        e.stopPropagation();
        if(positionInCommandHistory===-1)draft.current=e.currentTarget.value;
        setPositionInCommandHistory(x=>clamp(x+1,-1,commandHistory.length-1));
      }
      if(e.key==="ArrowDown"){
        e.preventDefault();
        e.stopPropagation();
        setPositionInCommandHistory(x=>clamp(x-1,-1,commandHistory.length-1));
      }
      if((e.key==="Enter"&&!e.shiftKey)&&!running){
        e.preventDefault();
        e.stopPropagation();
        const value=e.currentTarget.value;
        draft.current="";
        setPositionInCommandHistory(-1);
        if(value.trim()&&value!==commandHistory[0])setCommandHistory(x=>[value,...x]);
        interpreter(value,true).catch(console.error);
        e.currentTarget.value="";
      }
    },
  };
  useEffect(()=>{
    if(positionInCommandHistory===-1)textAreaRef.current!.value=draft.current;
    if(commandHistory[positionInCommandHistory]){
      textAreaRef.current!.value=commandHistory[positionInCommandHistory];
      textAreaRef.current!.focus();
      textAreaRef.current!.setSelectionRange(textAreaRef.current!.value.length,textAreaRef.current!.value.length);
    }
  },[positionInCommandHistory]);
  // useEffect(()=>{
  //   if(running)textAreaRef.current!.focus();
  // },[running]);
  const active=useRef(0);
  const interpreter=async(code:string,echo:boolean):Promise<void>=>{
    const commands:mbsh.ShellCommand[][]=parseShell(code);
    const session=new AbortController();
    const{signal}=session;
    const aborted=new Promise<boolean>(r=>signal.addEventListener("abort",()=>r(false),{once:true}));
    sessions.current.add(session);
    try{
      for(const command of commands){
        if(signal.aborted)break;
        let ok:boolean=true;
        for(let i=0;i<command.length;i++){
          if(signal.aborted)break;
          const sub=command[i];
          const next:string|undefined=command[i+1]?.invoker;
          if(sub.invoker==="&&"&&!ok){console.log("skip",sub.subcommand);continue;}
          if(echo)setLogsLatest(x=>[...x,
            {t:"nl"},
            ...(sub.invoker===""||!((sub.i||0)>0)
              ?[{t:"nl"},{t:"l",m:`/${mods.getNamesFromUuids(mods.getCurrentDirTree()).join("/")} > ${sub.commandOfOrigin}`},{t:"nl"}]
              :[]
            )as logs.LogType[],
          ]);
          active.current++;
          setRunning(true);
          const p:Promise<boolean>=runShellCommand(
            sub,mods.getCurrentScope(),mods,logsRef.current,setLogsLatest,mods.getCurrentDirTree(),interpreter,varsRef.current,setVarsLatest,keyboardInputBuffer,signal,
          ).finally(()=>{
            active.current--;
            setRunning(active.current>0);
          });
          switch(next){
            case"&":ok=true;break;
            default:ok=await Promise.race([p,aborted]);
          }
          if(signal.aborted){
            setLogsLatest(x=>[...x,{t:"l",m:"^C"}]);
            break;
          }
        }
      }
    }finally{
      sessions.current.delete(session);
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