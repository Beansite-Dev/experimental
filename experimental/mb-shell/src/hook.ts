import { useStore } from "jotai/react";
import { logAtom } from "./store";
import { ReactNode } from "react";
//overcomplicated ass jotai atom lmao
export const useLogs=():[
  ()=>(string[]),//logs getter
  (...x:string[])=>void,//logs setter
]=>{
  const store=useStore()
  const logs=()=>store.get(logAtom);
  const setLogs=(...x:string[])=>store.set(logAtom,[...logs(),...x]);
  return[logs,setLogs];
};
// idea is, a person would wrap thier function in the provider
// and then use the useShell hook. Then the user can run the
// interpreter function and it will inerpret their shell
// input
export const useShell=():[
  ()=>(string[]),//logs getter
  (...x:string[])=>void,//logs setter
  (code:string)=>void,//interpreter
]=>{
  const[logs,setLogs]=useLogs();
  const interpreter=(code:string)=>{
    const commands=code.split(/;|\r?\n/);
    for(const command of commands){
      const parseCommand=command.trim().split(" ");
      const functionMap:{[key:string]:(dirTree:string[],...args:string[])=>void}={
        cd:(dirTree:string[],x:string):void=>{
          // Format of paths:
          // /root/home/dir1/dir2/file.txt
          //      /home/dir1/dir2/file.txt
          //          ~/dir1/dir2/file.txt
          //          ./dir1/dir2/file.txt
          // these should be converted to the first kind and
          // passed as an array to the filesystem hook
          
        },

      };
      const dirTree:string[]=["root"];//temporary, filesys hook should replace
      setLogs(`> ${command}`);
      if(functionMap[parseCommand[0]])
        functionMap[parseCommand[0]](dirTree,...parseCommand.slice(1));
      else setLogs(
        `command not found: ${parseCommand[0]}`
      );
    };
  };
  return[logs,setLogs,interpreter];
};