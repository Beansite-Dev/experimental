import { useAtom, useStore } from "jotai/react";
import { logAtom } from "./store";
import { ReactNode } from "react";
import { mbfs, useFileSystem } from "mb-fs2";
import { getDefaultStore, SetStateAction } from "jotai";
// idea is, a person would wrap their function in the provider
// and then use the useShell hook. Then the user can run the
// interpreter function and it will interpret their shell
// input
export const useShell=():[
  string[],//logs
  ((update: SetStateAction<string[]>)=>void),//logs setter
  (code:string)=>void,//interpreter
  ReturnType<typeof useFileSystem>[0],
  ReturnType<typeof useFileSystem>[1],
  ReturnType<typeof useFileSystem>[2],
  ReturnType<typeof useFileSystem>[3],
]=>{
  const[logs,setLogs]=useAtom(logAtom);
  const[
    filesystem,
    scope,
    dirTree,
    mods,
    filesystemAtom
  ]=useFileSystem();
  const store=getDefaultStore();
  //filesystem is persistent but scope is not. Perfect for this 
  const interpreter=(code:string)=>{
    const commands=code.split(/;|\r?\n/);
    for(const command of commands){
      const parseCommand=command.trim().split(" ");
      const functionMapBase:{[key:string]:(dirTree:string[],...args:string[])=>void}={
        cd:(dirTree:string[],x:string):void=>{
          // Format of paths:
          // C:/users/admin/dir1/dir2/file.txt
          //   /users/admin/dir1/dir2/file.txt
          //              ~/dir1/dir2/file.txt
          //           (~)./dir1/dir2/file.txt
          // ..
          // (dir2)../dir1/dir3/file2.txt
          // these should be converted to the first kind and
          // passed as an array to the filesystem hook
          // -> mods.enterDirectoryFromPath(newArrOfUuids);
        },
        ls:(dirTree:string[]):void=>{
          // just list directory contents
          mods.enterDirectoryFromPath(mods.getUuidsFromNames(dirTree));
          const freshScope=store.get(filesystemAtom) // not the stale closure `scope`
          setLogs(x=>[...x,
            `contents of /${dirTree.join("/")}`,
            ...Object.keys(freshScope.data).map((key)=>`  ${freshScope.data[key].name}${freshScope.data[key].metadata.typeof.directory?"/":`.${(freshScope.data[key]as mbfs.File).type}`} (${key})`),
          ]);
        },
      };
      // aliases go here. You can take function from the base function map and just set them to each other
      const functionMap:(typeof functionMapBase)={
        ...functionMapBase, 
        dir:functionMapBase.ls,//<- like this
      };
      setLogs(x=>[...x,`> ${command}`]);//temp, will likely add custom feature here instead. maybe even be like ohmyposh
      if(functionMap[parseCommand[0]])functionMap[parseCommand[0]](dirTree,...parseCommand.slice(1));
      else setLogs(x=>[...x,
        `command not found: ${parseCommand[0]}`
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