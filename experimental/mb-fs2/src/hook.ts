import { useAtom } from 'jotai';
import { directoryTreeAtom, fsAtom } from './atom.js'
export const useFileSystem=():[
  mbfs.Directory,string[]
]=>{
  const[fs,setFs]=useAtom(fsAtom);
  const[dirTree,setDirTree]=useAtom(directoryTreeAtom);

  return[fs,dirTree];
}