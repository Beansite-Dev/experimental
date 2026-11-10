import { mbfs, metadata, modTypes } from "mb-fs2";
import { clamp, getMinLength, lslFormatDateTime, parsePath } from "./lib";
import { SetStateAction } from "jotai/vanilla";
import { parseLog } from "./logs";
import { InvalidArgumentsError, OperationRequiresRecursiveFlagError, OperationRequiresRootError } from "./exceptions";
import { mbsh } from "./store";
type shellFunction=(
  command:string,
  scope:mbfs.Directory,
  mods:modTypes,
  setLogs:((update:SetStateAction<logs.LogType[]>)=>void),
  promise:[(value:boolean|PromiseLike<boolean>)=>void,(reason?:any)=>void],
  dirTree:string[],
  sudo:boolean,
  vars:mbsh.ShellVariable[],
  setVars:(update:SetStateAction<mbsh.ShellVariable[]>)=>void,
  keyboardInputBuffer:{getValue:()=>string[]},
  signal:AbortSignal,
  ...args:string[]
)=>void;
export const functionMapBase:{[key:string]:shellFunction|void;}={
  cd:(command,_scope,mods,setLogs,promise,dirTree:string[],sudo,vars,setVars,keyboardInputBuffer,signal,inputPath:string):void=>{
    //f=arrOfFileNames (shortened cuz my keyboard is ass)
    let parsed:string[];
    let f:string[]=parsePath(inputPath,mods.getNamesFromUuids(dirTree));
    console.log(f)
    mods.enterDirectoryFromPath(mods.getUuidsFromDirectoryNames(f));
    setLogs(x=>[...x.slice(0,-2),
      {t:"l",m:`/${f.join("/")} > ${command}`},{t:"nl"},
    ]);
    promise[0](true);
  },
  wait:(command,scope,mods,setLogs,promise,dirTree,sudo,vars,setVars,keyboardInputBuffer,signal,time)=>{
    const t=setTimeout(()=>promise[0](true),parseInt(time));
    signal.addEventListener("abort",()=>clearTimeout(t),{once:true});
  },
  cp:(command,scope,mods,setLogs,promise,dirTree,sudo,shellVars,setVars,keyboardInputBuffer,signal,...args)=>{
    const filePath:string[]=args.filter(x=>!x.startsWith("-"));
    if(filePath.length<2)return promise[1]({
      name:"InvalidArgumentsError",
      message:"not enough arguments passed",
    });
    const flags=new Set(args.filter(x=>x.startsWith("-")).flatMap(x=>x.startsWith("--")?[x.slice(2)]:x.slice(1).split("")));
    const recursive=flags.has("r")||flags.has("R")||flags.has("recursive");
    const splitName=(n:string)=>{
      const i=n.lastIndexOf(".");
      return i>0?[n.slice(0,i),n.slice(i+1)]:[n,""];
    };
    const parsedPathOfOriginal:string[]=parsePath(filePath[0],mods.getNamesFromUuids(dirTree));
    const parsedPathOfCopy:string[]=parsePath(filePath[1],mods.getNamesFromUuids(dirTree));
    const parentOfOriginalName=parsedPathOfOriginal.slice(0,-1);
    const parentOfCopyName=parsedPathOfCopy.slice(0,-1);
    const [originalName,originalType]=splitName(parsedPathOfOriginal.at(-1)!);
    const [copyName,copyType]=splitName(parsedPathOfCopy.at(-1)!);
    const parentOfOriginalUuids=mods.getUuidsFromDirectoryNames(parentOfOriginalName);
    const parentOfCopyUuids=mods.getUuidsFromDirectoryNames(parentOfCopyName);
    const parentOfOriginal=mods.getDirectoryContents(parentOfOriginalUuids).data;
    const original=Object.values(parentOfOriginal).find(x=>
      x.name===originalName
      &&(!originalType||(x as mbfs.File).type===originalType)
    );
    if(!original)return promise[1]({
      name:"NotFoundError",
      message:`cannot stat '${filePath[0]}': No such file or directory`,
    });
    const isDir=original.metadata.typeof.directory;
    if(isDir&&!recursive)return promise[1]({
      name:"InvalidArgumentsError",
      message:`-r not specified; omitting directory '${filePath[0]}'`,
    });
    const now=new Date();
    const cloneObject=(o:mbfs.File|mbfs.Directory,name:string,type?:string):mbfs.File|mbfs.Directory=>{
      const metadata={
        ...structuredClone(o.metadata),
        date:{
          created:now,
          modified:now,
          accessed:now,
        },
      };
      if(o.metadata.typeof.directory)return{
        name,
        data:Object.fromEntries(Object.values(o.data as Record<string,mbfs.File|mbfs.Directory>).map(c=>[crypto.randomUUID(),cloneObject(c,c.name,(c as mbfs.File).type)])),
        metadata,
      }as mbfs.Directory;
      return{
        name,
        type:type||(o as mbfs.File).type,
        data:structuredClone(o.data),
        metadata,
      }as mbfs.File;
    };
    const copy=cloneObject(original,copyName,copyType);
    if(isDir)mods.createDirectory(parentOfCopyUuids,copy as mbfs.Directory);
    else mods.createFile(parentOfCopyUuids,copy as mbfs.File);
    promise[0](true);
  },
  mv:(command,scope,mods,setLogs,promise,dirTree,sudo,shellVars,setVars,keyboardInputBuffer,signal,...args)=>{

  },
  read:(command,scope,mods,setLogs,promise,dirTree,sudo,vars,setVars,keyboardInputBuffer,signal,...args:string[])=>{
    // > potential usage
    // read -p "Enter your name: " user_name
    // echo "Hello, $user_name!"
    
  },
  ls:(_command,scope,mods,setLogs,promise,dirTree:string[],sudo,vars,setVars,keyboardInputBuffer,signal,...args:string[]):void=>{
    // new ls post rework
    const filePath:string=args.filter(x=>!x.startsWith("-"))[0]||"./";
    const flags:string[]=args.filter(x=>x.startsWith("-")).map(x=>x.replace("-","").split("")).flat();
    const path:string[]=parsePath(filePath,mods.getNamesFromUuids(dirTree));
    const dir=mods.getDirectoryContents(mods.getUuidsFromDirectoryNames(path));
    const minObjLen:number=getMinLength(Object.keys(dir.data).map(x=>`${dir.data[x].name}${!dir.data[x].metadata.typeof.directory?"."+(dir.data[x] as mbfs.File).type:""}`),1);
    const lMinNameLen:number=getMinLength(Object.keys(dir.data).map(x=>dir.data[x].metadata.originalCreator),1);
    if(flags.length==0){setLogs(x=>[...x,
      ...Object.keys(dir.data).map((key):logs.LogType=>({
        t:"l",
        ...dir.data[key].metadata.typeof.directory
            ?{clr:"Cyan",bold:true}
          :dir.data[key].metadata.typeof.executable
            ?{clr:"BrightGreen",bold:true}
          :{},
        m:`${dir.data[key].name}${dir.data[key].metadata.typeof.directory?"":`.${(dir.data[key]as mbfs.File).type}`}`.padEnd(minObjLen),
      })),
    ]);promise[0](true);}
    if(flags.includes("l")){setLogs(x=>[...x,
      {t:"l",m:`total ${JSON.stringify(dir).length} bytes`},{t:"nl"},
      ...Object.keys(dir.data).map((key,i):logs.LogType[]=>([
        {t:"l",
          m:[//rwx
            dir.data[key].metadata.typeof.directory?"d":"-",
            dir.data[key].metadata.access.read.administrators?"r":"-",
            dir.data[key].metadata.access.write.administrators?"w":"-","x",
            dir.data[key].metadata.access.read.users?"r":"-",
            dir.data[key].metadata.access.write.users?"w":"-","x",
            dir.data[key].metadata.access.read.guests?"r":"-",
            dir.data[key].metadata.access.write.guests?"w":"-",
            dir.data[key].metadata.typeof.directory||dir.data[key].metadata.typeof.executable?"x":"-","."
          ].join(""),
        },{t:"l",m:`1 `,},
        {t:"l",m:`${dir.data[key].metadata.originalCreator}`.padEnd(lMinNameLen),},
        {t:"l",m:`${dir.data[key].metadata.originalCreator}`.padEnd(lMinNameLen),},
        {t:"l",m:`${String(clamp(JSON.stringify(dir.data[key]).length,0,4096))}`.padEnd(5),},
        {t:"l",m:lslFormatDateTime(dir.data[key].metadata.date.modified).padEnd(13),},
        {
          t:"l",
          ...dir.data[key].metadata.typeof.directory?{clr:"Cyan",bold:true}
            :dir.data[key].metadata.typeof.executable?{clr:"BrightGreen",bold:true}:{},
          m:`${dir.data[key].name}${dir.data[key].metadata.typeof.directory?"":`.${(dir.data[key]as mbfs.File).type}`}`,
        },
        ...(Object.keys(dir.data).length-1>i?[{t:"nl"}as logs.LogType]:[])
      ])).flat(),
    ]);promise[0](true);}
  },
  cls:(_command,_scope,_mods,setLogs,promise,):void=>{setLogs([]);promise[0](true);},
  touch:(_command,_scope,mods,_setLogs,promise,dirTree:string[],sudo,vars,setVars,keyboardInputBuffer,signal,fileName:string):void=>{
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
    promise[0](true);
  },
  cat:(command,scope,mods,setLogs,promise,dirTree,sudo,vars,setVars,keyboardInputBuffer,signal,filePath):void=>{
    const parsedPath:string[]=parsePath(filePath,mods.getNamesFromUuids(dirTree));
    const parent=parsedPath.slice(0,-1);
    const name=parsedPath.slice(-1)[0];
    const parentUuids=mods.getUuidsFromDirectoryNames(parent);
    const dir=mods.getDirectoryContents(parentUuids).data;
    const m=String(dir[Object.keys(dir).filter(x=>
       dir[x].name===name.split(".")[0]
       &&(name.split(".")[1]?
        (dir[x] as mbfs.File).type===name.split(".")[1]
        :true)
    )[0]].data);
    setLogs(x=>[...x,{t:"l",m}]);
    promise[0](true);
  },
  tac:(command,scope,mods,setLogs,promise,dirTree,sudo,vars,setVars,keyboardInputBuffer,signal,filePath):void=>{
    const parsedPath:string[]=parsePath(filePath,mods.getNamesFromUuids(dirTree));
    if(parsedPath){
      const newFilePath=parsedPath.slice(0,-1);
      const newFileName=parsedPath.slice(-1)[0];
      const newFilePathUUIDs=mods.getUuidsFromDirectoryNames(newFilePath);
      const dir=mods.getDirectoryContents(newFilePathUUIDs).data;
      const m=String(dir[Object.keys(dir).filter(x=>
         dir[x].name===newFileName.split(".")[0]
         &&(newFileName.split(".")[1]?
          (dir[x] as mbfs.File).type===newFileName.split(".")[1]
          :true)
      )[0]].data).split('\n').reverse().join('');
      setLogs(x=>[...x,{t:"l",m}]);
      promise[0](true);
    }
  },
  chmod:(command,scope,mods,setLogs,promise,dirTree,sudo,vars,setVars,keyboardInputBuffer,signal,newval,file)=>{
    const parsedPath:string[]=parsePath(file,mods.getNamesFromUuids(dirTree));
    const newFilePath=parsedPath.slice(0,-1);
    const newFileName=parsedPath.slice(-1)[0];
    const newFilePathUUIDs=mods.getUuidsFromDirectoryNames(newFilePath);
    const dir=mods.getDirectoryContents(newFilePathUUIDs).data;
    const uuid:string=String(Object.keys(dir).find(x=>
      dir[x].name===newFileName.split(".")[0]
      &&(newFileName.split(".")[1]
        ?(dir[x] as mbfs.File).type==newFileName.split(".")[1]
        :true)));
    //mod parsing
    if(!dir[uuid])promise[1]({
      name:"FileNotFoundError",
      message:`file ${newFileName} as not found in /${newFilePath.join("/")}`
    });
    let metadata={...dir[uuid].metadata,};
    const indexOfType:number=newval.indexOf("+")<0?newval.indexOf("-"):newval.indexOf("+");
    const groupArr:string[]=newval[indexOfType]=="+"?newval.split("+"):newval.split("-")[0].split("");
    const guestMod:boolean=groupArr.includes("g");
    const userMod:boolean=groupArr.includes("u");
    const adminMod:boolean=groupArr.includes("a");
    console.log(groupArr,indexOfType)
    if(newval[indexOfType]=="+"||newval[indexOfType]=="-"){
      newval.split("").slice(indexOfType).forEach((x)=>{
        switch(x){
          case"r":
            if(userMod)metadata.access.read.users=newval[indexOfType]=="+";
            if(guestMod)metadata.access.read.guests=newval[indexOfType]=="+";
            if(adminMod)metadata.access.read.administrators=newval[indexOfType]=="+";
          break;
          case"w":
            if(userMod)metadata.access.write.users=newval[indexOfType]=="+";
            if(guestMod)metadata.access.write.guests=newval[indexOfType]=="+";
            if(adminMod)metadata.access.write.administrators=newval[indexOfType]=="+";
          break;
          case"x":metadata.typeof.executable=newval[indexOfType]=="+";break;
          default:console.log("unknown param for chmod: "+x);
        }
      });
    }
    mods.modifyFilesysteObjectAttributes(newFilePathUUIDs,uuid,{metadata});
    promise[0](true);
  },
  rm:(_command,_scope,mods,_setLogs,promise,dirTree:string[],sudo,vars,setVars,keyboardInputBuffer,signal,...args:string[]):void=>{
    const filePath:string=args.filter(x=>!x.startsWith("-"))[0];
    const flags:string[]=args.filter(x=>x.startsWith("-")).map(x=>x.replace("-","").split("")).flat();
    const path:string[]=parsePath(filePath,mods.getNamesFromUuids(dirTree));
    const parentName:string[]=path.slice(0,-1);
    const childName:string=path.slice(-1)[0];
    const parent=mods.getDirectoryContents(mods.getUuidsFromDirectoryNames(parentName));
    const childUuid=Object.keys(parent.data).filter(x=>parent.data[x].name===childName)[0];
    if((!parent.data[childUuid].metadata.access.write.users
    ||parent.data[childUuid].metadata.typeof.system)&&!sudo)
      throw new OperationRequiresRootError(`Operation requires root`);
    if(parent.data[childUuid].metadata.typeof.directory&&!flags.includes("r"))
      throw new OperationRequiresRecursiveFlagError(`Operation requires a recursive flags`);
    mods.deleteFilesystemObject(mods.getUuidsFromDirectoryNames(parentName),childUuid);
    promise[0](true);
  },
  mkdir:(_command,_scope,mods,_setLogs,promise,dirTree:string[],sudo,vars,setVars,keyboardInputBuffer,signal,name:string):void=>{
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
    promise[0](true);
  },
  whoami:(_command,_scope,_mods,setLogs,promise,):void=>{setLogs(x=>[...x, {t:"l",m:`beansite/administrator`},]);promise[0](true)},
  echo:(_command,_scope,_mods,setLogs,promise,_dirTree:string[],sudo,vars,setVars,keyboardInputBuffer,signal,...args:string[]):void=>{
    setLogs(x=>[...x,...parseLog(args.join(" "))]);
    promise[0](true);
  }
};
// aliases go here. You can take function from the base function map and just set them to each other
export const functionMap:Record<string,shellFunction>={
  ...functionMapBase,
  "":()=>{},
  dir: functionMapBase.ls!,
  clear: functionMapBase.cls!,
  "ll":(command,scope,mods,setLogs,promise,dirTree:string[],sudo,vars,setVars,keyboardInputBuffer,signal,)=>functionMapBase.ls?.(command,scope,mods,setLogs,promise,dirTree,sudo,vars,setVars,keyboardInputBuffer,signal,"-l"),
  "cd..":(command,scope,mods,setLogs,promise,dirTree:string[],sudo,vars,setVars,keyboardInputBuffer,signal,)=>functionMapBase.cd?.(command,scope,mods,setLogs,promise,dirTree,sudo,vars,setVars,keyboardInputBuffer,signal,".."),
};