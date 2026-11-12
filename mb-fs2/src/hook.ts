import { useAtom } from 'jotai';
import { dir, file, fsAtom, type mbfs } from './atom.js';
import { useMemo, useRef, useState } from "react";
import { DirectoryNotFoundError, FileNotFoundError, FilesystemObjectTypeError } from './exceptions.js';
import { v4 as uuidv4 } from 'uuid';
//new errors, move these into exceptions.ts if you want them alongside the others
export class DuplicateEntryError extends Error{
  constructor(message:string){
    super(message);
    this.name='DuplicateEntryError';
  }
}
export class InvalidMoveError extends Error{
  constructor(message:string){
    super(message);
    this.name='InvalidMoveError';
  }
}
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
  //always the newest scope/tree (uuids), even between a mods call and the re-render it causes
  getCurrentScope:()=>mbfs.Directory;
  getCurrentDirTree:()=>string[];
  //modifiers (create* return the uuid of the new entry)
  createFile:(path:string[],fileData:mbfs.File)=>string;
  createDirectory:(path:string[],dirData:mbfs.Directory)=>string;
  createFsObject:(path:string[],fileData:mbfs.File|mbfs.Directory)=>string;
  deleteFilesystemObject:(path:string[],uuidOfFile:string)=>void;
  modifyFilesysteObjectAttributes:(path:string[],uuidOfFile:string,newAttributes:Partial<mbfs.File>|Partial<mbfs.Directory>)=>void;
  moveFilesystemObject:(fromPath:string[],uuidOfObject:string,toPath:string[],newAttributes?:Partial<mbfs.File>|Partial<mbfs.Directory>)=>void;
};
//pure helpers
const isDir=(n:mbfs.File|mbfs.Directory):n is mbfs.Directory=>!!n.metadata.typeof.directory;
//one step down into a directory
const child=(d:mbfs.Directory,uuid:string):mbfs.Directory=>{
  const n=d.data[uuid];
  if(!n)throw new DirectoryNotFoundError(`no entry with uuid ${uuid} in "${d.name}"`);
  if(!isDir(n))throw new FilesystemObjectTypeError(`"${n.name}" (${uuid}) is a file, not a directory`);
  return n;
};
//every directory visited while following path (root excluded)
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
//longest part of path that still exists in root, same reference back when nothing was cut
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
//immutably rebuild root with fn applied to the directory at path
const updateAt=(root:mbfs.Directory,path:string[],fn:(d:mbfs.Directory)=>mbfs.Directory):mbfs.Directory=>{
  const go=(d:mbfs.Directory,i:number):mbfs.Directory=>{
    const u=path[i];
    if(u===undefined)return fn(d);
    return{...d,data:{...d.data,[u]:go(child(d,u),i+1)}};
  };
  return go(root,0);
};
//files are told apart by name AND type (a.txt and a.md can coexist), directories by name only
const sameEntry=(a:mbfs.File|mbfs.Directory,b:mbfs.File|mbfs.Directory):boolean=>isDir(a)===isDir(b)&&a.name===b.name&&(isDir(a)||(a as mbfs.File).type===(b as mbfs.File).type);
const hasEntry=(d:mbfs.Directory,entry:mbfs.File|mbfs.Directory,ignoreUuid?:string):boolean=>Object.entries(d.data).some(([k,v])=>k!==ignoreUuid&&sameEntry(v,entry));
const label=(e:mbfs.File|mbfs.Directory):string=>isDir(e)?e.name:`${e.name}.${(e as mbfs.File).type}`;
const withEntry=(d:mbfs.Directory,uuid:string,entry:mbfs.File|mbfs.Directory):mbfs.Directory=>{
  if(hasEntry(d,entry))throw new DuplicateEntryError(`"${d.name}" already has a ${isDir(entry)?'directory':'file'} named "${label(entry)}"`);
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
  //refs hold the newest values even before the re-render a mods call causes, so chained calls (cd a && ls) never see stale state
  const fsRef=useRef(fs);
  const dirTreeRef=useRef(dirTree);
  fsRef.current=fs;
  //scope is derived so it can never go stale, and a deleted/moved directory falls back to its nearest surviving ancestor
  const tree=useMemo(()=>validPrefix(fs,dirTree),[fs,dirTree]);
  const scope=useMemo(()=>resolve(fs,tree),[fs,tree]);
  const treeNow=():string[]=>validPrefix(fsRef.current,dirTreeRef.current);
  const setTree=(t:string[]):void=>{
    dirTreeRef.current=t;
    setDirTree(t);
  };
  const commit=(next:mbfs.Directory):void=>{
    fsRef.current=next;
    setFs(next);
    setTree(validPrefix(next,dirTreeRef.current));
  };
  const add=(path:string[],entry:mbfs.File|mbfs.Directory):string=>{
    const uuid=uuidv4();
    commit(updateAt(fsRef.current,path,d=>withEntry(d,uuid,entry)));
    return uuid;
  };
  const mods:modTypes={
    enterDirectoryFromScope:(uuid:string):void=>{
      const current=resolve(fsRef.current,treeNow());
      const node=current.data[uuid];
      if(!node)throw new DirectoryNotFoundError(`no entry with uuid ${uuid} in "${current.name}"`);
      if(!isDir(node))throw new FilesystemObjectTypeError(`"${node.name}" (${uuid}) is a file, not a directory`);
      setTree([...treeNow(),uuid]);
    },
    enterParentDirectory:():void=>{
      const t=treeNow();
      if(!t.length)throw new DirectoryNotFoundError(`"${fsRef.current.name}" is the root and has no parent directory`);
      mods.enterDirectoryFromPath(t.slice(0,-1));
    },
    enterDirectoryFromPath:(path:string[]):void=>{
      resolve(fsRef.current,path);
      setTree([...path]);
    },
    //!redundant
    // getDirTree:():string[]=>mods.getNamesFromUuids(dirTree),
    getFilesystemObjectInfo:(path:string[],uuid:string):mbfs.File|mbfs.Directory=>{
      const d=resolve(fsRef.current,path);
      const n=d.data[uuid];
      if(!n)throw new FileNotFoundError(`no entry with uuid ${uuid} in "${d.name}"`);
      return n;
    },
    getUuidsFromDirectoryNames:(names:string[]):string[]=>uuidsByName(fsRef.current,names,true),
    getUuidsFromFileNames:(names:string[]):string[]=>uuidsByName(fsRef.current,names,false),
    getNamesFromUuids:(uuids:string[]):string[]=>trail(fsRef.current,uuids).map(d=>d.name),
    //js incase only mods is provided
    getFileSystem:():mbfs.Directory=>fsRef.current,
    getDirectoryContents:(path:string[]):mbfs.Directory=>resolve(fsRef.current,path),
    getCurrentScope:():mbfs.Directory=>resolve(fsRef.current,treeNow()),
    getCurrentDirTree:():string[]=>treeNow(),
    createFile:(path:string[],fileData:mbfs.File):string=>add(path,file.parse(fileData)),
    createFsObject:(path:string[],fileData:mbfs.File|mbfs.Directory):string=>add(path,isDir(fileData)?dir.parse(fileData):file.parse(fileData)),
    createDirectory:(path:string[],dirData:mbfs.Directory):string=>{
      const parsed=dir.parse(dirData);
      if(!parsed.metadata.typeof.directory)throw new TypeError(`"${parsed.name}" must have metadata.typeof.directory set to true`);
      return add(path,parsed);
    },
    deleteFilesystemObject:(path:string[],uuidOfFile:string):void=>{
      // replace with deleteFile and deleteDirectory and make deleteFile account for types -Zach
      commit(updateAt(fsRef.current,path,d=>{
        if(!d.data[uuidOfFile])throw new FileNotFoundError(`No present entry with uuid ${uuidOfFile} in "${d.name}"`);
        return withoutEntry(d,uuidOfFile);
      }));
    },
    modifyFilesysteObjectAttributes:(path:string[],uuidOfObject:string,newAttributes:Partial<mbfs.File>|Partial<mbfs.Directory>):void=>{
      commit(updateAt(fsRef.current,path,d=>{
        const existing=d.data[uuidOfObject];
        if(!existing)throw new FileNotFoundError(`no entry with uuid ${uuidOfObject} in "${d.name}"`);
        const parsed=isDir(existing)
          ?dir.parse({...existing,...newAttributes})
          :file.parse({...existing,...newAttributes});
        if(hasEntry(d,parsed,uuidOfObject))throw new DuplicateEntryError(`"${d.name}" already has a ${isDir(parsed)?'directory':'file'} named "${label(parsed)}"`);
        return{...d,data:{...d.data,[uuidOfObject]:parsed}};
      }));
    },
    //keeps the uuid, so anything referencing the entry stays valid
    //newAttributes (name/type) are applied in the same commit as the move
    moveFilesystemObject:(fromPath:string[],uuidOfObject:string,toPath:string[],newAttributes?:Partial<mbfs.File>|Partial<mbfs.Directory>):void=>{
      const root=fsRef.current;
      const src=resolve(root,fromPath);
      const found=src.data[uuidOfObject];
      if(!found)throw new FileNotFoundError(`no entry with uuid ${uuidOfObject} in "${src.name}"`);
      const entry=newAttributes===undefined
        ?found
        :isDir(found)
          ?dir.parse({...found,...newAttributes})
          :file.parse({...found,...newAttributes});
      const dest=resolve(root,toPath);
      if(isDir(entry)&&toPath.length>fromPath.length&&fromPath.every((u,i)=>toPath[i]===u)&&toPath[fromPath.length]===uuidOfObject)throw new InvalidMoveError(`cannot move "${entry.name}" into itself or one of its own subdirectories`);
      if(entry===found&&fromPath.length===toPath.length&&fromPath.every((u,i)=>toPath[i]===u))return;
      if(hasEntry(dest,entry,uuidOfObject))throw new DuplicateEntryError(`"${dest.name}" already has a ${isDir(entry)?'directory':'file'} named "${label(entry)}"`);
      const removed=updateAt(root,fromPath,d=>withoutEntry(d,uuidOfObject));
      commit(updateAt(removed,toPath,d=>({...d,data:{...d.data,[uuidOfObject]:entry}})));
    },
  };
  return[fs,scope,tree,mods];
}