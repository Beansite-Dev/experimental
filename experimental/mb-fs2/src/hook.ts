import { useAtom } from 'jotai';
import { directoryTreeAtom, fsAtom, type mbfs } from './atom.js'
export const useFileSystem=():[
  mbfs.Directory,string[],{[key:string]:()=>any}
]=>{
  const[fs,setFs]=useAtom(fsAtom);
  const[dirTree,setDirTree]=useAtom(directoryTreeAtom);
  const mods:{[key:string]:()=>any|void}={
    stringifyDirTree:()=>{
      
    }
  }
  return[fs,dirTree,mods];
}