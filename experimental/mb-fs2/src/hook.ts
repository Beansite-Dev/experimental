import { useAtom } from 'jotai';
import { directoryTreeAtom, fsAtom, type mbfs } from './atom.js';
import { useState } from "react";
export const useFileSystem=():[
  mbfs.Directory,//full filesystem
  mbfs.Directory,//currnet scope
  string[],//tree of directory uuids
  {
    enterDirectoryFromScope:(uuid:string)=>void;
    stringifyDirTree:()=>string[];
    goToParentDirectory:()=>void;
    goToDirectoryFromPath:(path:string[])=>void;
  }//functions for mod
]=>{
  const[fs,setFs]=useAtom(fsAtom);
  const[dirTree,setDirTree]=useAtom(directoryTreeAtom);
  const[scope,setScope]=useState<mbfs.Directory>(fs);//init with root as scope
  const mods={
    enterDirectoryFromScope:(uuid:string):void=>{
      const node=scope.data[uuid];
      if(!node?.metadata.typeof.directory)return;
      setScope(node as mbfs.Directory);
      setDirTree(t=>[...t,uuid]);
    },
    goToParentDirectory:():void=>{
      if(!dirTree.length)return;
      mods.goToDirectoryFromPath(dirTree.slice(0,-1));
    },
    goToDirectoryFromPath:(path:string[]):void=>{
      const target=path.reduce<mbfs.Directory|undefined>((d,u)=>{
        const n=d?.data[u];
        return n?.metadata.typeof.directory?n as mbfs.Directory:undefined;
      },fs);
      if(!target)return;
      setScope(target);
      setDirTree([...path]);
    },
    stringifyDirTree:():string[]=>{
      let d:mbfs.Directory|undefined=fs;
      return dirTree.map(u=>{
        d=d?.data[u] as mbfs.Directory|undefined;
        return d?.name??u;
      });
    }
  }
  return[fs,scope,dirTree,mods];
}