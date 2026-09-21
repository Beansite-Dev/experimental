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
  getUuidsFromNames:(names:string[])=>string[];
  getNamesFromUuids:(uuids:string[])=>string[];
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
      if(!node)throw new DirectoryNotFoundError(`no entry with uuid ${uuid} in "${scope.name}"`);
      if(!node.metadata.typeof.directory)throw new DirectoryNotFoundError(`"${node.name}" (${uuid}) is a file, not a directory`);
      setScope(node as mbfs.Directory);
      setDirTree(t=>[...t,uuid]);
    },
    enterParentDirectory:():void=>{
      if(!dirTree.length)throw new DirectoryNotFoundError(`"${fs.name}" is the root and has no parent directory`);
      mods.enterDirectoryFromPath(dirTree.slice(0,-1));
    },
    enterDirectoryFromPath:(path:string[]):void=>{
      let d:mbfs.Directory=fs;
      for(const u of path){
        const n=d.data[u];
        if(!n)throw new DirectoryNotFoundError(`no entry with uuid ${u} in "${d.name}"`);
        if(!n.metadata.typeof.directory)throw new DirectoryNotFoundError(`"${n.name}" (${u}) is a file, not a directory`);
        d=n as mbfs.Directory;
      }
      setScope(d);
      setDirTree([...path]);
    },
    getDirTree:():string[]=>mods.getNamesFromUuids(dirTree),
    getFilesystemObjectInfo:(path:string[],uuid:string):mbfs.File|mbfs.Directory=>{
      let d:mbfs.Directory=fs;
      for(const u of path){
        const n=d.data[u];
        if(!n)throw new DirectoryNotFoundError(`no entry with uuid ${u} in "${d.name}"`);
        if(!n.metadata.typeof.directory)throw new DirectoryNotFoundError(`"${n.name}" (${u}) is a file, not a directory`);
        d=n as mbfs.Directory;
      }
      const n=d.data[uuid];
      if(!n)throw new FileNotFoundError(`no entry with uuid ${uuid} in "${d.name}"`);
      return n;
    },
    getUuidsFromNames:(names:string[]):string[]=>{
      let d:mbfs.Directory=fs;
      const uuids:string[]=[];
      for(const name of names){
        const e=Object.entries(d.data).find(([,v])=>v.metadata.typeof.directory&&v.name===name);
        if(!e)throw new DirectoryNotFoundError(`no directory named "${name}" in "${d.name}"`);
        uuids.push(e[0]);
        d=e[1] as mbfs.Directory;
      }
      return uuids;
    },
    getNamesFromUuids:(uuids:string[]):string[]=>{
      let d:mbfs.Directory=fs;
      const names:string[]=[];
      for(const u of uuids){
        const n=d.data[u];
        if(!n)throw new DirectoryNotFoundError(`no entry with uuid ${u} in "${d.name}"`);
        if(!n.metadata.typeof.directory)throw new DirectoryNotFoundError(`"${n.name}" (${u}) is a file, not a directory`);
        names.push(n.name);
        d=n as mbfs.Directory;
      }
      return names;
    },
  };
  return[fs,scope,dirTree,mods];
}