import { useAtom, useStore } from "jotai/react";
import { logAtom } from "./store";
import { ReactNode } from "react";
import { FilesystemObjectTypeError, FileNotFoundError, DirectoryNotFoundError, mbfs, useFileSystem, fsAtom as filesystemAtom } from "mb-fs2";
import { getDefaultStore, SetStateAction } from "jotai";
import { parseError, parsePath } from "./lib";
import { functionMap } from "./interpreterFunctionMap";
// idea is, a person would wrap their function in the provider
// and then use the useShell hook. Then the user can run the
// interpreter function and it will interpret their shell
// input
export const useShell=():[
  logs.LogType[],//logs
  ((update: SetStateAction<logs.LogType[]>)=>void),//logs setter
  (code:string)=>void,//interpreter
  ReturnType<typeof useFileSystem>[0],//filesystem
  ReturnType<typeof useFileSystem>[1],//scope
  ReturnType<typeof useFileSystem>[2],//dirTree (in uuids)
  ReturnType<typeof useFileSystem>[3],//modifier functions
]=>{
  const[logs,setLogs]=useAtom(logAtom);
  const[
    filesystem,
    scope,
    dirTree,
    mods,
  ]=useFileSystem();
  // const store=getDefaultStore();//no longer needed
  //filesystem is persistent but scope is not. Perfect for this 
  const interpreter=(code:string)=>{
    const commands=code.split(/;|\r?\n/);
    for(const command of commands){
      const parseCommand=command.trim().split(" ");
      setLogs(x=>[...x, {t:"l",m:`c:/${mods.getNamesFromUuids(dirTree).join("/")} > ${command}`},{t:"nl"}]); //temp, will likely add custom feature here instead. maybe even be like ohmyposh
      if(functionMap[parseCommand[0]])
        functionMap[parseCommand[0]](command,scope,mods,setLogs,dirTree,...parseCommand.slice(1));
      else setLogs(x=>[...x,
        ...parseError(
          command,
          "CommandNotFoundError",
          `${parseCommand[0]} : the term '${parseCommand[0]}' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again.`
        ),
      ]);
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
  ];
};