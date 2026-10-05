import { mbfs, modTypes } from "mb-fs2";
import { parseError, parsePath } from "./lib";
import { SetStateAction } from "jotai/vanilla";
export const functionMapBase:{
  [key:string]:((
    command:string,
    scope:mbfs.Directory,
    mods:modTypes,
    setLogs:((update: SetStateAction<logs.LogType[]>)=>void),
    dirTree:string[],
    ...args:string[]
  )=>void)|void;
}={
  cd:(command,_scope,mods,setLogs,dirTree:string[],...inputPath:string[]):void=>{
    let arrOfFileNames:string[]|{name:string;message:string;};
    try{arrOfFileNames=parsePath(inputPath.join("/"),dirTree);}catch(e){arrOfFileNames=e as {name:string;message:string;}}
    console.warn("cd res: ",arrOfFileNames,mods.getUuidsFromDirectoryNames(arrOfFileNames as string[]));
    if(Array.isArray(arrOfFileNames)){try{
      mods.enterDirectoryFromPath(mods.getUuidsFromDirectoryNames(arrOfFileNames));
      setLogs(x=>[...x.slice(0,-2),
        {t:"l",m:`c:/${arrOfFileNames.join("/")} > ${command}`},
        {t:"nl"},
      ]);
    }catch(e){setLogs(x=>[...x,...parseError(
      command,
      (e as {name:string}).name,
      (e as {message:string}).message,
    ),]);}}
    else setLogs(x=>[...x,...parseError(
      command,
      arrOfFileNames.name,
      arrOfFileNames.message,
    ),]);
  },
  ls:(_command,scope,_mods,setLogs,dirTree:string[]):void=>{
    // just list directory contents
    setLogs(x=>[...x,
      {t:"l",m:`contents of /${dirTree.join("/")}`},{t:"nl"},
      ...(Object.keys(scope.data).map((key)=>{return[{
        t:"l",
        m:`  ${scope.data[key].name}${scope.data[key].metadata.typeof.directory?"/":`.${(scope.data[key]as mbfs.File).type}`} (${key})`
      },{t:"nl"}]}).flat()as logs.LogType[]),
    ]);
  },
  cls:(_command,_scope,_mods,setLogs,):void=>{setLogs([]);},
  touch:(_command,_scope,mods,_setLogs,dirTree:string[],fileName:string):void=>{
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
  rm:(_command,_scope,_mods,_setLogs,_dirTree:string[],_filePath:string):void=>{
    
    //!old rm, fileName => filePath now
    // const trimmedFileName:string=fileName.split(".")[0];
    // try{
    //   mods.deleteFilesystemObject(dirTree,mods.getUuidsFromFileNames([...dirTree,trimmedFileName]).slice(-1)[0]);
    // }catch(error:FileNotFoundError|DirectoryNotFoundError|FilesystemObjectTypeError|any) {
    //   setLogs(x=>[...x,...parseError(command,error.name,error.message)]);
    // }
  },
  mkdir:(_command,_scope,mods,_setLogs,dirTree:string[],name:string):void=>{
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
  whoami:(_command,_scope,_mods,setLogs,_dirTree:string[]):void=>{setLogs(x=>[...x, {t:"l",m:`beansite/administrator`},{t:"nl"}]);},
  echo:(_command,_scope,_mods,setLogs,_dirTree:string[],...args:string[]):void=>{
    const message=args.join(" ").trim().replace(/\s+/g," "); // Remove redundant spaces
    setLogs(x=>[...x, { t:"l", m:message },{t:"nl"}]);
  }
};
// aliases go here. You can take function from the base function map and just set them to each other
export const functionMap:Record<string,(command:string, scope:mbfs.Directory, mods:modTypes, setLogs:((update: SetStateAction<logs.LogType[]>)=>void), dirTree:string[], ...args:string[])=>void>={
  ...functionMapBase,
  "":()=>{},
  dir: functionMapBase.ls!,
  clear: functionMapBase.cls!,
  "cd..":(command,scope,mods,setLogs,dirTree:string[])=>functionMapBase.cd?.(command,scope,mods,setLogs,dirTree,".."),
};