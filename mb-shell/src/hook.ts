import { useAtom, useStore } from "jotai/react";
import { logAtom } from "./store";
import { ReactNode } from "react";
import { FilesystemObjectTypeError, FileNotFoundError, DirectoryNotFoundError, mbfs, useFileSystem } from "mb-fs2";
import { getDefaultStore, SetStateAction } from "jotai";
import { parsePath } from "./lib";
// idea is, a person would wrap their function in the provider
// and then use the useShell hook. Then the user can run the
// interpreter function and it will interpret their shell
// input
export const useShell=():[
  string[],//logs
  ((update: SetStateAction<string[]>)=>void),//logs setter
  (code:string)=>void,//interpreter
  ReturnType<typeof useFileSystem>[0],//filesystem
  ReturnType<typeof useFileSystem>[1],//scope
  ReturnType<typeof useFileSystem>[2],//dirTree (in uuids)
  ReturnType<typeof useFileSystem>[3],//modifier functions
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
      const functionMapBase:{[key:string]:((dirTree:string[],...args:string[])=>void)|void}={
        cd:(dirTree:string[],inputPath:string):void=>{
          let arrOfFileNames:string[]|{name:string;message:string;};
          try{arrOfFileNames=parsePath(inputPath,dirTree);}catch(e){arrOfFileNames=e as {name:string;message:string;}}
          if(Array.isArray(arrOfFileNames))mods.enterDirectoryFromPath(mods.getUuidsFromDirectoryNames(arrOfFileNames as string[]));
          else setLogs(x=>[...x,
            arrOfFileNames.name,
            arrOfFileNames.message,
          ]);
          // ..
          // (dir2)../dir1/dir3/file2.txt
          // these should be converted to the first kind and
          // passed as an array to the filesystem hook
          // -> mods.enterDirectoryFromPath(newArrOfUuids);
        },
        ls:(dirTree:string[]):void=>{
          // just list directory contents
          mods.enterDirectoryFromPath(mods.getUuidsFromDirectoryNames(dirTree));
          const freshScope=store.get(filesystemAtom);//fixes the issue of scope not updating in time
          setLogs(x=>[...x,
            `contents of /${dirTree.join("/")}`,
            ...Object.keys(freshScope.data).map((key)=>`  ${freshScope.data[key].name}${freshScope.data[key].metadata.typeof.directory?"/":`.${(freshScope.data[key]as mbfs.File).type}`} (${key})`),
          ]);
        },
        cls:():void=>{
          setLogs([]);
        },
        touch:(dirTree:string[],fileName:string):void=>{
          const name=fileName.split(".")[0];
          const type=fileName.split(".")[1]||"txt";
          mods.createFile(dirTree,{
            name,
            type,
            data:"",
            metadata:{
              access:{
                read:{
                  administrators:true,
                  users:true,
                  guests:false
                },
                write:{
                  administrators:true,
                  users:false,
                  guests:false
                }
              },
              date:{
                created:new Date(),
                modified:new Date(),
                accessed:new Date()
              },
              originalCreator:"administrator",
              typeof:{
                system:false,
                directory:false,
                executable:false
              }
            }
          });
        },
        rm:(dirTree:string[],fileName:string):void=>{
          const trimmedFileName:string=fileName.split(".")[0];
          try{
            mods.deleteFilesystemObject(dirTree,mods.getUuidsFromFileNames([...dirTree,trimmedFileName]).slice(-1)[0]);
          } catch (error:FileNotFoundError|DirectoryNotFoundError|FilesystemObjectTypeError|any) {
            setLogs(x=>[...x, `Error occurred while deleting file: ${error.message}`]);
          }
        },
        mkdir:(dirTree:string[],name:string):void=>{
          mods.createDirectory(dirTree,{
            name,
            data:{},
            metadata:{
              access:{
                read:{
                  administrators:true,
                  users:true,
                  guests:false
                },
                write:{
                  administrators:true,
                  users:false,
                  guests:false
                }
              },
              date:{
                created:new Date(),
                modified:new Date(),
                accessed:new Date()
              },
              originalCreator:"administrator",
              typeof:{
                system:false,
                directory:true,
                executable:false
              }
            }
          });
        },
        whoami:(dirTree:string[]):void=>{
          setLogs(x=>[...x,`beansite/administrator`]);
        },
        echo:(dirTree:string[], ...args:string[]):void=>{
          const message=args.join(" ").trim().replace(/\s+/g," "); // Remove redundant spaces
          setLogs(x=>[...x, message]);
        }
      };
      // aliases go here. You can take function from the base function map and just set them to each other
      const functionMap:Record<string,(dirTree:string[],...args:string[])=>void>={
        ...functionMapBase,
        dir: functionMapBase.ls!,
        clear: functionMapBase.cls!,
        "cd..":(dirTree:string[])=>functionMapBase.cd?.(dirTree,".."),
      };
      setLogs(x=>[...x,`c:/${mods.getNamesFromUuids(dirTree).join("/")} > ${command}`]);//temp, will likely add custom feature here instead. maybe even be like ohmyposh
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