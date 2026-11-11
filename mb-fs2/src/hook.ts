import { useAtom } from 'jotai';
import { dir, file, fsAtom, type mbfs } from './atom.js';
import { useMemo, useState } from "react";
import { DirectoryNotFoundError, DuplicateEntryError, FileNotFoundError, FilesystemObjectTypeError, InvalidMoveError } from './exceptions.js';
import { v4 as uuidv4 } from 'uuid';
export type modTypes={
  //directory movement
  enterDirectoryFromScope:(uuid:string)=>void;
  enterParentDirectory:()=>void;
  enterDirectoryFromPath:(path:string[])=>void;
  //getters
  getFilesystemObjectInfo:(path:string[],childName:string)=>mbfs.File|mbfs.Directory;
  getUuidsFromDirectoryNames:(names:string[])=>string[];
  getUuidsFromFileNames:(names:string[])=>string[];
  getNamesFromUuids:(uuids:string[])=>string[];
  getFileSystem:()=>mbfs.Directory;
  getDirectoryContents:(path:string[])=>mbfs.Directory;
  //modifiers (create* return the uuid of the new entry)
  createFile:(path:string[],fileData:mbfs.File)=>string;
  createDirectory:(path:string[],dirData:mbfs.Directory)=>string;
  createFsObject:(path:string[],fileData:mbfs.File|mbfs.Directory)=>string;
  deleteFilesystemObject:(path:string[],uuidOfFile:string)=>void;
  modifyFilesysteObjectAttributes:(path:string[],uuidOfFile:string,newAttributes:Partial<mbfs.File>|Partial<mbfs.Directory>)=>void;
  moveFilesystemObject:(fromPath:string[],uuidOfObject:string,toPath:string[])=>void;
};
const isDir=(n:mbfs.File|mbfs.Directory):n is mbfs.Directory=>!!n.metadata.typeof.directory;
const child=(d:mbfs.Directory,uuid:string):mbfs.Directory=>{
  const n=d.data[uuid];
  if(!n)throw new DirectoryNotFoundError(`no entry with uuid ${uuid} in "${d.name}"`);
  if(!isDir(n))throw new FilesystemObjectTypeError(`"${n.name}" (${uuid}) is a file, not a directory`);
  return n;
};
const trail=(root:mbfs.Directory,path:string[]):mbfs.Directory[]=>{
  const out:mbfs.Directory[]=[];
  let d=root;
  for(const u of path){
    d=child(d,u);
    out.push(d);
  }
  return out;
};
const resolve=(root:mbfs.Directory,path:string[]):mbfs.Directory=>path.reduce((d,u)=>child(d,u),root);
const validPrefix=(root:mbfs.Directory,path:string[]):string[]=>{
  const out:string[]=[];
  let d=root;
  for(const u of path){
    const n=d.data[u];
    if(!n||!isDir(n))break;
    out.push(u);
    d=n;
  }
  return out.length===path.length?path:out;
};
const updateAt=(root:mbfs.Directory,path:string[],fn:(d:mbfs.Directory)=>mbfs.Directory):mbfs.Directory=>{
  const go=(d:mbfs.Directory,i:number):mbfs.Directory=>{
    const u=path[i];
    if(u===undefined)return fn(d);
    return{...d,data:{...d.data,[u]:go(child(d,u),i+1)}};
  };
  return go(root,0);
};
const hasName=(d:mbfs.Directory,name:string,directory:boolean,ignoreUuid?:string):boolean=>Object.entries(d.data).some(([k,v])=>k!==ignoreUuid&&isDir(v)===directory&&v.name===name);
const withEntry=(d:mbfs.Directory,uuid:string,entry:mbfs.File|mbfs.Directory):mbfs.Directory=>{
  if(hasName(d,entry.name,isDir(entry)))throw new DuplicateEntryError(`"${d.name}" already has a ${isDir(entry)?'directory':'file'} named "${entry.name}"`);
  return{...d,data:{...d.data,[uuid]:entry}};
};
const withoutEntry=(d:mbfs.Directory,uuid:string):mbfs.Directory=>({...d,data:Object.fromEntries(Object.entries(d.data).filter(([k])=>k!==uuid))});
const uuidsByName=(root:mbfs.Directory,names:string[],wantDir:boolean):string[]=>{
  let d=root;
  const uuids:string[]=[];
  for(const name of names){
    const e=Object.entries(d.data).find(([,v])=>isDir(v)===wantDir&&v.name===name);
    if(!e)throw wantDir?new DirectoryNotFoundError(`no directory named "${name}" in "${d.name}"`):new FileNotFoundError(`no file named "${name}" in "${d.name}"`);
    uuids.push(e[0]);
    d=e[1] as mbfs.Directory;
  }
  return uuids;
};
export const useFileSystem=():[
  mbfs.Directory,//full filesystem
  mbfs.Directory,//currnet scope
  string[],//tree of directory uuids
  modTypes,//functions for mod 
  // PrimitiveAtom<mbfs.Directory>,//atom for filesystem
]=>{
  const[fs,setFs]=useAtom(fsAtom);
  const[dirTree,setDirTree]=useState<string[]>([]);
  const tree=useMemo(()=>validPrefix(fs,dirTree),[fs,dirTree]);
  const scope=useMemo(()=>resolve(fs,tree),[fs,tree]);
  const commit=(next:mbfs.Directory):void=>{
    setFs(next);
    setDirTree(validPrefix(next,tree));
  };
  const add=(path:string[],entry:mbfs.File|mbfs.Directory):string=>{
    const uuid=uuidv4();
    commit(updateAt(fs,path,d=>withEntry(d,uuid,entry)));
    return uuid;
  };
  const mods:modTypes={
    enterDirectoryFromScope:(uuid:string):void=>{
      const node=scope.data[uuid];
      if(!node)throw new DirectoryNotFoundError(`no entry with uuid ${uuid} in "${scope.name}"`);
      if(!isDir(node))throw new FilesystemObjectTypeError(`"${node.name}" (${uuid}) is a file, not a directory`);
      setDirTree([...tree,uuid]);
    },
    enterParentDirectory:():void=>{
      if(!tree.length)throw new DirectoryNotFoundError(`"${fs.name}" is the root and has no parent directory`);
      mods.enterDirectoryFromPath(tree.slice(0,-1));
    },
    enterDirectoryFromPath:(path:string[]):void=>{
      resolve(fs,path);
      setDirTree([...path]);
    },
    //!redundant
    // getDirTree:():string[]=>mods.getNamesFromUuids(dirTree),
    getFilesystemObjectInfo:(path:string[],uuid:string):mbfs.File|mbfs.Directory=>{
      const d=resolve(fs,path);
      const n=d.data[uuid];
      if(!n)throw new FileNotFoundError(`no entry with uuid ${uuid} in "${d.name}"`);
      return n;
    },
    getUuidsFromDirectoryNames:(names:string[]):string[]=>uuidsByName(fs,names,true),
    getUuidsFromFileNames:(names:string[]):string[]=>uuidsByName(fs,names,false),
    getNamesFromUuids:(uuids:string[]):string[]=>trail(fs,uuids).map(d=>d.name),
    //js incase only mods is provided
    getFileSystem:():mbfs.Directory=>fs,
    getDirectoryContents:(path:string[]):mbfs.Directory=>resolve(fs,path),
    createFile:(path:string[],fileData:mbfs.File):string=>add(path,file.parse(fileData)),
    createFsObject:(path:string[],fileData:mbfs.File|mbfs.Directory):string=>add(path,isDir(fileData)?dir.parse(fileData):file.parse(fileData)),
    createDirectory:(path:string[],dirData:mbfs.Directory):string=>{
      const parsed=dir.parse(dirData);
      if(!parsed.metadata.typeof.directory)throw new TypeError(`"${parsed.name}" must have metadata.typeof.directory set to true`);
      return add(path,parsed);
    },
    deleteFilesystemObject:(path:string[],uuidOfFile:string):void=>{
      commit(updateAt(fs,path,d=>{
        if(!d.data[uuidOfFile])throw new FileNotFoundError(`No present entry with uuid ${uuidOfFile} in "${d.name}"`);
        return withoutEntry(d,uuidOfFile);
      }));
    },
    modifyFilesysteObjectAttributes:(path:string[],uuidOfObject:string,newAttributes:Partial<mbfs.File>|Partial<mbfs.Directory>):void=>{
      commit(updateAt(fs,path,d=>{
        const existing=d.data[uuidOfObject];
        if(!existing)throw new FileNotFoundError(`no entry with uuid ${uuidOfObject} in "${d.name}"`);
        const parsed=isDir(existing)
          ?dir.parse({...existing,...newAttributes})
          :file.parse({...existing,...newAttributes});
        if(parsed.name!==existing.name&&hasName(d,parsed.name,isDir(parsed),uuidOfObject))throw new DuplicateEntryError(`"${d.name}" already has a ${isDir(parsed)?'directory':'file'} named "${parsed.name}"`);
        return{...d,data:{...d.data,[uuidOfObject]:parsed}};
      }));
    },
    moveFilesystemObject:(fromPath:string[],uuidOfObject:string,toPath:string[]):void=>{
      const entry=resolve(fs,fromPath).data[uuidOfObject];
      if(!entry)throw new FileNotFoundError(`no entry with uuid ${uuidOfObject} in "${resolve(fs,fromPath).name}"`);
      const dest=resolve(fs,toPath);
      if(isDir(entry)&&toPath.length>fromPath.length&&fromPath.every((u,i)=>toPath[i]===u)&&toPath[fromPath.length]===uuidOfObject)
        throw new InvalidMoveError(`cannot move "${entry.name}" into itself or one of its own subdirectories`);
      if(fromPath.length===toPath.length&&fromPath.every((u,i)=>toPath[i]===u))return;
      if(hasName(dest,entry.name,isDir(entry)))throw new DuplicateEntryError(`"${dest.name}" already has a ${isDir(entry)?'directory':'file'} named "${entry.name}"`);
      const removed=updateAt(fs,fromPath,d=>withoutEntry(d,uuidOfObject));
      commit(updateAt(removed,toPath,d=>({...d,data:{...d.data,[uuidOfObject]:entry}})));
    },
  };
  return[fs,tree.length?scope:fs,tree,mods];
}