import { DirectoryNotFoundError, mbfs, modTypes } from "mb-fs2";
import { clamp, getMinLength, lslFormatDateTime, parseError, parsePath } from "./lib";
import { getDefaultStore, SetStateAction } from "jotai/vanilla";
import { logAtom } from "./store";
import { useShell } from "./hook";
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
export const runShellCommand=(
  command:string,
  scope:mbfs.Directory,
  mods:modTypes,
  logs:logs.LogType[],
  setLogs:(update:SetStateAction<logs.LogType[]>)=>void,
  dirTree:string[],
  interpreter:ReturnType<typeof useShell>[2],
  echo:boolean,
  // sandboxedShell_mods:ReturnType<typeof useShell>[6],
):Promise<void>=>{
  const parsedCommand:string[]=command.trim().split(/\s+/);
  const iOfRedirOp:number=parsedCommand.indexOf(">");
  const args:string[]=iOfRedirOp>0?parsedCommand.slice(0,iOfRedirOp):parsedCommand;
  let outputPath:string|undefined;
  const captured:string[]=[];
  let mirror:logs.LogType[]=logs;
  let line:string="";
  const setLogsWithLogger=(update:SetStateAction<logs.LogType[]>):void=>{
    const next=typeof update==="function"?update(mirror):update;
    for(const entry of next.slice(mirror.length)){
      if(entry.t==="nl"){captured.push(line);line="";}
      else if("m" in entry)line+=entry.m??"";
    };
    mirror=next;
    setLogs(update);
  };
  return new Promise<unknown>((resolve,reject)=>{
    if(iOfRedirOp===0)return reject({
      name:"InvalidRedirectOperatorUsage",
      message:"blank commands cannot be passed to redirect operators",
    });
    if(iOfRedirOp>0){
      outputPath=parsedCommand[iOfRedirOp+1];
      if(!outputPath)return reject({
        name:"InvalidRedirectOperatorUsage",
        message:"redirect operator cannot point to nothing",
      });
    }
    const fn=Object.hasOwn(functionMap,args[0])?functionMap[args[0]]:undefined;
    if(!fn){
      const bin:mbfs.Directory=mods.getDirectoryContents(mods.getUuidsFromDirectoryNames(["bin"]));
      const binCommandPointer:mbfs.File|undefined=bin.data[Object.keys(bin.data)
        .filter(x=>
          bin.data[x].name===args[0].split(".")[0]
          &&(args[0].split(".")[1]
            ?(bin.data[x] as mbfs.File).type===args[0].split(".")[1]
            :true)
        )[0]]as mbfs.File|undefined;
      let parsedPath:{name:string;message:string;}|string[];
      try{parsedPath=parsePath(args[0],dirTree);}
      catch(e){parsedPath=e as {name:string;message:string;};}
      console.warn(bin,"\,",binCommandPointer,"\n",parsedPath);
      if(
        binCommandPointer
        &&binCommandPointer.metadata.typeof.executable
      ){
        console.log(`found pointer for command ${binCommandPointer.name} in "/bin"`);
        //running file goes here
        //does not work
        // sandboxedShell_mods.enterDirectoryFromPath(dirTree);
        // if(["bat","sh"].includes(binCommandPointer.type))sandboxedShell_interpreter(String(binCommandPointer.data));
        if(["bat","sh"].includes(binCommandPointer.type))
          interpreter(String(binCommandPointer.data),false)
        return resolve(0);
      }else if(Array.isArray(parsedPath)){
        const pathOfInput:string[]=parsedPath.slice(0,-1);
        const possibleFileName:string=parsedPath.slice(-1)[0];
        const contentsOfParseInputPath:mbfs.Directory=mods.getDirectoryContents(mods.getUuidsFromDirectoryNames(pathOfInput));
        const filePointer=contentsOfParseInputPath.data[
          Object.keys(contentsOfParseInputPath.data).filter(
            x=>contentsOfParseInputPath.data[x].name===possibleFileName.split(".")[0]
            &&(possibleFileName.split(".")[1]
              ?(contentsOfParseInputPath.data[x]as mbfs.File).type===possibleFileName.split(".")[1]
              :true)
          )[0]];
        if(filePointer&&filePointer.metadata.typeof.executable){
          console.log(`found pointer for command ${possibleFileName}||${filePointer.name} in relatively in ${pathOfInput}`);
          //running file goes here
          if(["bat","sh"].includes((filePointer as mbfs.File).type))
            interpreter(String(filePointer.data),false);
          return resolve(0);
        }else return reject({
          name:"CommandNotFoundError",
          message:`${args[0]} : the term '${args[0]}' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again.`,
        });
      }
      else return reject({
        name:"CommandNotFoundError",
        message:`${args[0]} : the term '${args[0]}' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again.`,
      });
    }
    fn(command,scope,mods,setLogsWithLogger,[resolve,reject],dirTree,...args.slice(1));
  }).then(r=>{
    if(!outputPath)return;
    if(line)captured.push(line);
    const slash=outputPath.lastIndexOf("/");
    const dir=slash===0?"/":slash>0?outputPath.slice(0,slash):"";
    const file=outputPath.slice(slash+1);
    const dot=file.lastIndexOf(".");
    const now=new Date();
    const cwdNames=mods.getNamesFromUuids(dirTree);
    const dirPath=dir===""||dir==="."?cwdNames:parsePath(dir,cwdNames);
    mods.createFile(dirPath,{
      name:dot>0?file.slice(0,dot):file,
      type:dot>0?file.slice(dot+1):"",
      data:captured.join("\n"),
      metadata:{
        access:{
          read:{administrators:true,users:true,guests:false,},
          write:{administrators:true,users:false,guests:false,},
        },
        date:{created:now,modified:now,accessed:now,},
        originalCreator:"administrator",
        typeof:{system:false,directory:false,executable:false,},
      },
    });
  }).catch(e=>{
    const err=e as {name:string;message:string};
    setLogs(x=>[...x,...parseError(command,err.name,err.message),]);
  });
};