import { useAtom } from 'jotai';
import { fsAtom, type mbfs } from './atom.js';
import { useState } from "react";
import { DirectoryNotFoundError, FileNotFoundError } from './exceptions.js';
type modTypes={
  //directory movement
  enterDirectoryFromScope:(uuid:string)=>void;
  enterParentDirectory:()=>void;
  enterDirectoryFromPath:(path:string[])=>void;
  //getters
  getDirTree:()=>string[];
  getFilesystemObjectInfo:(path:string[],childName:string)=>mbfs.File|mbfs.Directory;
  getUuidsFromNames:(names:string[])=>string[]|undefined;
};
export const useFileSystem=():[
  mbfs.Directory,//full filesystem
  mbfs.Directory,//currnet scope
  string[],//tree of directory uuids
  modTypes,//functions for mod 
]=>{
  const[fs,setFs]=useAtom(fsAtom);
  const[dirTree,setDirTree]=useState<string[]>([]);
  const[scope,setScope]=useState<mbfs.Directory>(fs);//init with root as scope
  const mods:modTypes={
    enterDirectoryFromScope:(uuid:string):void=>{
      const node=scope.data[uuid];
      if(!node?.metadata.typeof.directory)return;
      setScope(node as mbfs.Directory);
      setDirTree(t=>[...t,uuid]);
    },
    enterParentDirectory:():void=>{
      if(!dirTree.length)return;
      mods.enterDirectoryFromPath(dirTree.slice(0,-1));
    },
    enterDirectoryFromPath:(path:string[]):void=>{
      const target=path.reduce<mbfs.Directory|undefined>((d,u)=>{
        const n=d?.data[u];
        return n?.metadata.typeof.directory?n as mbfs.Directory:undefined;
      },fs);
      if(!target)throw new DirectoryNotFoundError("directory tree does not exist");
      setScope(target);
      setDirTree([...path]);
    },
    getDirTree:():string[]=>{
      let d:mbfs.Directory|undefined=fs;
      return dirTree.map(u=>{
        d=d?.data[u] as mbfs.Directory|undefined;
        return d?.name??u;
      });
    },
    getFilesystemObjectInfo:(path:string[],uuid:string):mbfs.File|mbfs.Directory=>{
      const target=path.reduce<mbfs.Directory|undefined>((d,u)=>{
        const n=d?.data[u];
        return n?.metadata.typeof.directory?n as mbfs.Directory:undefined;
      },fs);
      if(!target)throw new DirectoryNotFoundError("directory tree does not exist");
      if(target.metadata.typeof.directory&&target.data[uuid])return target.data[uuid];
      else throw new FileNotFoundError("directory tree does not exist");
    },
    getUuidsFromNames:(names:string[]):string[]|undefined=>{
      let d:mbfs.Directory=fs;
      const uuids:string[]=[];
      for(const name of names){
        const e=Object.entries(d.data).find(([,v])=>v.metadata.typeof.directory&&v.name===name);
        if(!e)return;
        uuids.push(e[0]);
        d=e[1] as mbfs.Directory;
      }
      return uuids;
    },
  };
  return[fs,scope,dirTree,mods];
}