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
      switch(parseCommand[0]){
        
      }
    };
  };
  return[logs,setLogs,interpreter];
};