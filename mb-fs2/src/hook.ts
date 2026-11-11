import { useAtom } from 'jotai';
import { dir, file, fsAtom, type mbfs } from './atom.js';
import { useMemo, useState } from "react";
import { DirectoryNotFoundError, DuplicateEntryError, FileNotFoundError, FilesystemObjectTypeError, InvalidMoveError } from './exceptions.js';
import { v4 as uuidv4 } from 'uuid';
export type modTypes={
  enterDirectoryFromScope:(uuid:string)=>void;
  enterParentDirectory:()=>void;
  enterDirectoryFromPath:(path:string[])=>void;
  getFilesystemObjectInfo:(path:string[],childName:string)=>mbfs.File|mbfs.Directory;
  getUuidsFromDirectoryNames:(names:string[])=>string[];
  getUuidsFromFileNames:(names:string[])=>string[];
  getNamesFromUuids:(uuids:string[])=>string[];
  getFileSystem:()=>mbfs.Directory;
  getDirectoryContents:(path:string[])=>mbfs.Directory;
  createFile:(path:string[],fileData:mbfs.File)=>string;
  createDirectory:(path:string[],dirData:mbfs.Directory)=>string;
  createFsObject:(path:string[],fileData:mbfs.File|mbfs.Directory)=>string;
  deleteFilesystemObject:(path:string[],uuidOfFile:string)=>void;
  modifyFilesysteObjectAttributes:(path:string[],uuidOfFile:string,newAttributes:Partial<mbfs.File>|Partial<mbfs.Directory>)=>void;
  moveFilesystemObject:(fromPath:string[],uuidOfObject:string,toPath:string[],newAttributes?:Partial<mbfs.File>|Partial<mbfs.Directory>)=>void;
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
  mbfs.Directory,
  mbfs.Directory,
  string[],
  modTypes,
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
    getFilesystemObjectInfo:(path:string[],uuid:string):mbfs.File|mbfs.Directory=>{
      const d=resolve(fs,path);
      const n=d.data[uuid];
      if(!n)throw new FileNotFoundError(`no entry with uuid ${uuid} in "${d.name}"`);
      return n;
    },
    getUuidsFromDirectoryNames:(names:string[]):string[]=>uuidsByName(fs,names,true),
    getUuidsFromFileNames:(names:string[]):string[]=>uuidsByName(fs,names,false),
    getNamesFromUuids:(uuids:string[]):string[]=>trail(fs,uuids).map(d=>d.name),
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
        if(hasEntry(d,parsed,uuidOfObject))throw new DuplicateEntryError(`"${d.name}" already has a ${isDir(parsed)?'directory':'file'} named "${label(parsed)}"`);
        return{...d,data:{...d.data,[uuidOfObject]:parsed}};
      }));
    },
    moveFilesystemObject:(fromPath:string[],uuidOfObject:string,toPath:string[],newAttributes?:Partial<mbfs.File>|Partial<mbfs.Directory>):void=>{
      const src=resolve(fs,fromPath);
      const found=src.data[uuidOfObject];
      if(!found)throw new FileNotFoundError(`no entry with uuid ${uuidOfObject} in "${src.name}"`);
      const entry=newAttributes===undefined
        ?found
        :isDir(found)
          ?dir.parse({...found,...newAttributes})
          :file.parse({...found,...newAttributes});
      const dest=resolve(fs,toPath);
      if(isDir(entry)&&toPath.length>fromPath.length&&fromPath.every((u,i)=>toPath[i]===u)&&toPath[fromPath.length]===uuidOfObject)throw new InvalidMoveError(`cannot move "${entry.name}" into itself or one of its own subdirectories`);
      if(entry===found&&fromPath.length===toPath.length&&fromPath.every((u,i)=>toPath[i]===u))return;
      if(hasEntry(dest,entry,uuidOfObject))throw new DuplicateEntryError(`"${dest.name}" already has a ${isDir(entry)?'directory':'file'} named "${label(entry)}"`);
      const removed=updateAt(fs,fromPath,d=>withoutEntry(d,uuidOfObject));
      commit(updateAt(removed,toPath,d=>({...d,data:{...d.data,[uuidOfObject]:entry}})));
    },
  };
  return[fs,tree.length?scope:fs,tree,mods];
}