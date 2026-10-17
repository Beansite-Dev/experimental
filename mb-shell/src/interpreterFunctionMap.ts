import { DirectoryNotFoundError, mbfs, modTypes } from "mb-fs2";
import { clamp, getMinLength, lslFormatDateTime, parseError, parsePath } from "./lib";
import { SetStateAction } from "jotai/vanilla";
export const functionMapBase:{
  [key:string]:((
    command:string,
    scope:mbfs.Directory,
    mods:modTypes,
    setLogs:((update:SetStateAction<logs.LogType[]>)=>void),
    promise:[(value:number|PromiseLike<number>)=>void,(reason?:any)=>void],
    dirTree:string[],
    ...args:string[]
  )=>void)|void;
}={
  cd:(command,_scope,mods,setLogs,promise,dirTree:string[],inputPath:string):void=>{
    //f=arrOfFileNames (shortened cuz my keyboard is ass)
    let f:string[]=[];
    let parsed:string[];
    let debug:boolean=true;
    try{//checker step (for both syntax and validity)
      if(debug)console.log("running cd path parser");
      f=parsePath(inputPath,mods.getNamesFromUuids(dirTree));
      parsed=mods.getUuidsFromDirectoryNames(f);
      mods.enterDirectoryFromPath(parsed);
      if(debug)console.warn("=> cd res: ",f,parsed);
      mods.enterDirectoryFromPath(parsed);
      setLogs(x=>[...x.slice(0,-2),
        {t:"l",m:`c:/${f.join("/")} > ${command}`},
        {t:"nl"},
      ]);
      promise[0](0);
    }catch(e){
      if(debug)console.error("=> cd failed",e);
      promise[1](e);
    };
  },
  ls:(_command,scope,_mods,setLogs,promise,dirTree:string[],...args:string[]):void=>{
    // new ls post rework
    const minObjLen:number=getMinLength(Object.keys(scope.data).map(x=>`${scope.data[x].name}${!scope.data[x].metadata.typeof.directory?"."+(scope.data[x] as mbfs.File).type:""}`),1);
    const lMinNameLen:number=getMinLength(Object.keys(scope.data).map(x=>scope.data[x].metadata.originalCreator),1);
    if(args.length==0){setLogs(x=>[...x,
      ...Object.keys(scope.data).map((key):logs.LogType=>({
        t:"l",
        ...scope.data[key].metadata.typeof.directory
            ?{clr:"Cyan",bold:true}
          :scope.data[key].metadata.typeof.executable
            ?{clr:"BrightGreen",bold:true}
          :{},
        m:`${scope.data[key].name}${scope.data[key].metadata.typeof.directory?"":`.${(scope.data[key]as mbfs.File).type}`}`.padEnd(minObjLen),
      })),
      {t:"nl"},{t:"nl"},
    ]);promise[0](0);}
    if(args.includes("-l")){setLogs(x=>[...x,
      ...Object.keys(scope.data).map((key):logs.LogType[]=>([
        {t:"l",
          m:`${scope.data[key].metadata.typeof.directory?"d":"-"}rwxr-xr-x. `,
        },{t:"l",
          m:`1 `,
        },{t:"l",
          m:`${scope.data[key].metadata.originalCreator}`.padEnd(lMinNameLen),
        },{t:"l",
          m:`${scope.data[key].metadata.originalCreator}`.padEnd(lMinNameLen),
        },{t:"l",
          m:`${String(clamp(JSON.stringify(scope.data[key]).length,0,4096))}`.padEnd(5),
        },{t:"l",
          m:lslFormatDateTime(scope.data[key].metadata.date.modified).padEnd(13),
        },{
        t:"l",
          ...scope.data[key].metadata.typeof.directory
              ?{clr:"Cyan",bold:true}
            :scope.data[key].metadata.typeof.executable
              ?{clr:"BrightGreen",bold:true}
            :{},
          m:`${scope.data[key].name}${scope.data[key].metadata.typeof.directory?"":`.${(scope.data[key]as mbfs.File).type}`}`,
        },
        {t:"nl"}
      ])).flat(),
      {t:"nl"}
    ]);promise[0](0);}
  },
  cls:(_command,_scope,_mods,setLogs,promise,):void=>{setLogs([]);},
  touch:(_command,_scope,mods,_setLogs,promise,dirTree:string[],fileName:string):void=>{
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
    promise[0](0);
  },
  rm:(_command,_scope,_mods,_setLogs,promise,_dirTree:string[],_filePath:string):void=>{
    promise[0](0);
    
    //!old rm, fileName => filePath now
    // const trimmedFileName:string=fileName.split(".")[0];
    // try{
    //   mods.deleteFilesystemObject(dirTree,mods.getUuidsFromFileNames([...dirTree,trimmedFileName]).slice(-1)[0]);
    // }catch(error:FileNotFoundError|DirectoryNotFoundError|FilesystemObjectTypeError|any) {
    //   setLogs(x=>[...x,...parseError(command,error.name,error.message)]);
    // }
  },
  mkdir:(_command,_scope,mods,_setLogs,promise,dirTree:string[],name:string):void=>{
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
    promise[0](0);
  },
  whoami:(_command,_scope,_mods,setLogs,promise,_dirTree:string[]):void=>{setLogs(x=>[...x, {t:"l",m:`beansite/administrator`},{t:"nl"}]);promise[0](0)},
  echo:(_command,_scope,_mods,setLogs,promise,_dirTree:string[],...args:string[]):void=>{
    const message=args.join(" ").trim().replace(/\s+/g," "); // Remove redundant spaces
    setLogs(x=>[...x, { t:"l", m:message },{t:"nl"}]);
    promise[0](0);
  }
};
// aliases go here. You can take function from the base function map and just set them to each other
export const functionMap:Record<string,(
  command:string,
  scope:mbfs.Directory,
  mods:modTypes,
  setLogs:((update: SetStateAction<logs.LogType[]>)=>void),
  promise:[(value:number|PromiseLike<number>)=>void,(reason?:any)=>void],
  dirTree:string[],
  ...args:string[]
)=>void>={
  ...functionMapBase,
  "":()=>{},
  dir: functionMapBase.ls!,
  clear: functionMapBase.cls!,
  "ll":(command,scope,mods,setLogs,promise,dirTree:string[])=>functionMapBase.ls?.(command,scope,mods,setLogs,promise,dirTree,"-l"),
  "cd..":(command,scope,mods,setLogs,promise,dirTree:string[])=>functionMapBase.cd?.(command,scope,mods,setLogs,promise,dirTree,".."),
};
export const runShellComand=(
  command:string,
  // command:keyof typeof functionMap,
  scope:mbfs.Directory,
  mods:modTypes,
  setLogs:((update: SetStateAction<logs.LogType[]>)=>void),
  dirTree:string[]
):Promise<number|{name:string,message:string}>=>{
  const parsedCommand:any[]=command.trim().split(" ");
  return new Promise((resolve,reject)=>{
    if(functionMap[parsedCommand[0]])functionMap[parsedCommand[0]](
      command,
      scope,
      mods,
      setLogs,
      [resolve,reject],
      dirTree,
      ...parsedCommand.slice(1)
    );
    else setLogs(x=>[...x,
      ...parseError(
        command,
        "CommandNotFoundError",
        `${parsedCommand[0]} : the term '${parsedCommand[0]}' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again.`
      ),
    ]);
  });
}