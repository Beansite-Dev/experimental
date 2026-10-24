import { useAtom } from "jotai/react";
import { logAtom, variableAtom } from "./store";
import { ComponentPropsWithoutRef, KeyboardEvent } from "react";
import { useFileSystem } from "mb-fs2";
import { SetStateAction } from "jotai";
import { runShellCommand } from "./runShellCommand";
// idea is, a person would wrap their function in the provider
// and then use the useShell hook. Then the user can run the
// interpreter function and it will interpret their shell
// input
export const useShell=():[
  logs.LogType[],//logs
  ((update: SetStateAction<logs.LogType[]>)=>void),//logs setter
  (code:string,echo:boolean)=>void,//interpreter
  ReturnType<typeof useFileSystem>[0],//filesystem
  ReturnType<typeof useFileSystem>[1],//scope
  ReturnType<typeof useFileSystem>[2],//dirTree (in uuids)
  ReturnType<typeof useFileSystem>[3],//modifier functions
  ComponentPropsWithoutRef<'textarea'>
]=>{
  const[logs,setLogs]=useAtom(logAtom);
  const[vars,setVars]=useAtom(variableAtom);
  const[
    filesystem,
    scope,
    dirTree,
    mods,
  ]=useFileSystem();
  // const store=getDefaultStore();//no longer needed
  //filesystem is persistent but scope is not. Perfect for this 
  const textAreaEvents={
    onKeyDown:(e:KeyboardEvent<HTMLTextAreaElement>)=>{
      if(e.ctrlKey){
        switch(e.key){
          case "c":
            e.preventDefault();
            e.stopPropagation();
            if(e.shiftKey){
              const start=e.currentTarget.selectionStart;
              const end=e.currentTarget.selectionEnd;
              let textToCopy=e.currentTarget.value;
              if(start!==end)textToCopy=e.currentTarget.value.substring(start, end);
              if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(textToCopy);
              else{
                e.currentTarget.select();
                document.execCommand('copy');
              }
            }else{
              //quit program
            }
          default:console.log(e.key);
        }
      }
      if(e.key==="Enter"&&!e.shiftKey){
        e.preventDefault();
        e.stopPropagation();
        try{interpreter(e.currentTarget.value,true);}catch{}
        e.currentTarget.value="";
      }
    }
  };
  const interpreter=(code:string,echo:boolean)=>{
    const commands=code.split(/;|\r?\n/);
    for(const command of commands){
      //temp, will likely add custom feature here instead. maybe even be like ohmyposh
      if(echo)setLogs(x=>[...x,
        ...(logs.length>0?[{t:"nl"},{t:"nl"},]as logs.LogType[]:[]),
        {t:"l",m:`c:/${mods.getNamesFromUuids(dirTree).join("/")} > ${command}`},{t:"nl"}
      ]);
      runShellCommand(
        command,
        scope,
        mods,
        logs,
        setLogs,
        dirTree,
        interpreter,
        vars,
        setVars,
      );
    };
  };
  return[
    logs,
    setLogs,
    interpreter,
    filesystem,
    scope,
    dirTree,
    mods,
    textAreaEvents
  ];
};