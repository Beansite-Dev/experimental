import { useAtom } from 'jotai';
import { dir, file, fsAtom, type mbfs } from './atom.js';
import { useState } from "react";
import { DirectoryNotFoundError, FileNotFoundError } from './exceptions.js';
import { v4 as uuidv4 } from 'uuid';
type modTypes={
  //directory movement
  enterDirectoryFromScope:(uuid:string)=>void;
  enterParentDirectory:()=>void;
  enterDirectoryFromPath:(path:string[])=>void;
  //getters
  getFilesystemObjectInfo:(path:string[],childName:string)=>mbfs.File|mbfs.Directory;
  getUuidsFromNames:(names:string[])=>string[];
  getNamesFromUuids:(uuids:string[])=>string[];
  //modifiers
  createFile:(path:string[],fileData:mbfs.File)=>void;
  createDirectory:(path:string[],dirData:mbfs.Directory)=>void;
  deleteFilesystemObject:(path:string[],uuidOfFile:string)=>void;
  modifyFileAttributes:(path:string[],uuidOfFile:string,newAttributes:Partial<mbfs.File>)=>void;
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
    //!redundant
    // getDirTree:():string[]=>mods.getNamesFromUuids(dirTree),
    getFilesystemObjectInfo:(path:string[],uuid:string):mbfs.File|mbfs.Directory=>{
      let d:mbfs.Directory=fs;
      for(const uuid of path){
        const node=d.data[uuid];
        if(!node)throw new DirectoryNotFoundError(`no entry with uuid ${uuid} in "${d.name}"`);
        if(!node.metadata.typeof.directory)throw new DirectoryNotFoundError(`"${node.name}" (${uuid}) is a file, not a directory`);
        d=node as mbfs.Directory;
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
      for(const uuid of uuids){
        const node=d.data[uuid];
        if(!node)throw new DirectoryNotFoundError(`no entry with uuid ${uuid} in "${d.name}"`);
        if(!node.metadata.typeof.directory)throw new DirectoryNotFoundError(`"${node.name}" (${uuid}) is a file, not a directory`);
        names.push(node.name);
        d=node as mbfs.Directory;
      }
      return names;
    },
    createFile:(path:string[],fileData:mbfs.File):void=>{
      const parsed=file.parse(fileData);
      const uuidOfNewFile=uuidv4();
      const insert=(currentDirectory:mbfs.Directory,i:number):mbfs.Directory=>{
        const uuidOfStep=path[i];
        if(uuidOfStep===undefined)return{...currentDirectory,data:{...currentDirectory.data,[uuidOfNewFile]:parsed}};
        const node=currentDirectory.data[uuidOfStep];
        if(!node)throw new DirectoryNotFoundError(`no entry with uuid ${uuidOfStep} in "${currentDirectory.name}"`);
        if(!node.metadata.typeof.directory)throw new DirectoryNotFoundError(`"${node.name}" (${uuidOfStep}) is a file, not a directory`);
        return{...currentDirectory,data:{...currentDirectory.data,[uuidOfStep]:insert(node as mbfs.Directory,i+1)}};
      };
      const next=insert(fs,0);
      setFs(next);
      setScope(dirTree.reduce((x,u)=>x.data[u] as mbfs.Directory,next));
    },
    createDirectory:(path:string[],dirData:mbfs.Directory):void=>{
      const parsed=dir.parse(dirData);
      if(!parsed.metadata.typeof.directory)throw new TypeError(`"${parsed.name}" must have metadata.typeof.directory set to true`);
      const uuidOfNewDir=uuidv4();
      const insert=(currentDirectory:mbfs.Directory,i:number):mbfs.Directory=>{
        const uuidOfCurrent=path[i];
        if(uuidOfCurrent===undefined)return{...currentDirectory,data:{...currentDirectory.data,[uuidOfNewDir]:parsed}};
        const node=currentDirectory.data[uuidOfCurrent];
        if(!node)throw new DirectoryNotFoundError(`no entry with uuid ${uuidOfCurrent} in "${currentDirectory.name}"`);
        if(!node.metadata.typeof.directory)throw new DirectoryNotFoundError(`"${node.name}" (${uuidOfCurrent}) is a file, not a directory`);
        return{...currentDirectory,data:{...currentDirectory.data,[uuidOfCurrent]:insert(node as mbfs.Directory,i+1)}};
      };
      const next=insert(fs,0);
      setFs(next);
      setScope(dirTree.reduce((x,u)=>x.data[u] as mbfs.Directory,next));
    },
    deleteFilesystemObject:(path:string[],uuidOfFile:string):void=>{
      const remove=(currentDirectory:mbfs.Directory,i:number):mbfs.Directory=>{
        const node=currentDirectory.data[uuidOfFile];
        const uuidOfStep=path[i];
        if(uuidOfStep===undefined)return{...currentDirectory,data:Object.fromEntries(Object.entries(currentDirectory.data).filter(([k])=>k!==uuidOfFile))};
        if(!node)throw new FileNotFoundError(`No present entry with uuid ${uuidOfFile} in "${currentDirectory.name}"`);
        return{...currentDirectory,data:{...currentDirectory.data,[uuidOfStep]:remove(currentDirectory.data[uuidOfStep] as mbfs.Directory,i+1)}};
      };
      const next=remove(fs,0);
      setFs(next);
      setScope(dirTree.reduce((x,u)=>x.data[u] as mbfs.Directory,next));
    },
    modifyFileAttributes:(path:string[],uuidOfFile:string,newAttributes:Partial<mbfs.File>):void=>{

    }
  };
  return[fs,scope,dirTree,mods];
}