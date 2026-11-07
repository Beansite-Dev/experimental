import { mbfs, modTypes } from "mb-fs2";
import { clamp, getMinLength, lslFormatDateTime, parsePath } from "./lib";
import { SetStateAction } from "jotai/vanilla";
import { parseLog } from "./logs";
import { OperationRequiresRecursiveFlagError, OperationRequiresRootError } from "./exceptions";
import { mbsh } from "./store";
export const functionMapBase:{
  [key:string]:((
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
    ...args:string[]
  )=>void)|void;
}={
  cd:(command,_scope,mods,setLogs,promise,dirTree:string[],sudo,vars,setVars,keyboardInputBuffer,inputPath:string):void=>{
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
  wait:(command,scope,mods,setLogs,promise,dirTree,sudo,vars,setVars,keyboardInputBuffer,time)=>{
    setTimeout(()=>promise[0](true),parseInt(time));
  },
  read:(command,scope,mods,setLogs,promise,dirTree,sudo,vars,setVars,keyboardInputBuffer,...args:string[])=>{
    // > potential usage
    // read -p "Enter your name: " user_name
    // echo "Hello, $user_name!"
    
  },
  ls:(_command,scope,mods,setLogs,promise,dirTree:string[],sudo,vars,setVars,keyboardInputBuffer,...args:string[]):void=>{
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
          m:`${dir.data[key].metadata.typeof.directory?"d":"-"}rwxr-xr-${
            dir.data[key].metadata.typeof.directory
            ||dir.data[key].metadata.typeof.executable?"x":"-"}. `,
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
  touch:(_command,_scope,mods,_setLogs,promise,dirTree:string[],sudo,vars,setVars,keyboardInputBuffer,fileName:string):void=>{
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
  cat:(command,scope,mods,setLogs,promise,dirTree,sudo,vars,setVars,keyboardInputBuffer,filePath):void=>{
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
      )[0]].data);
      setLogs(x=>[...x,{t:"l",m}]);
      promise[0](true);
    }
  },
  tac:(command,scope,mods,setLogs,promise,dirTree,sudo,vars,setVars,keyboardInputBuffer,filePath):void=>{
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
  chmod:(command,scope,mods,setLogs,promise,dirTree,sudo,vars,setVars,keyboardInputBuffer,newval,file)=>{
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
  rm:(_command,_scope,mods,_setLogs,promise,dirTree:string[],sudo,vars,setVars,keyboardInputBuffer,...args:string[]):void=>{
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
  mkdir:(_command,_scope,mods,_setLogs,promise,dirTree:string[],sudo,vars,setVars,keyboardInputBuffer,name:string):void=>{
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
  echo:(_command,_scope,_mods,setLogs,promise,_dirTree:string[],sudo,vars,setVars,keyboardInputBuffer,...args:string[]):void=>{
    setLogs(x=>[...x,...parseLog(args.join(" "))]);
    promise[0](true);
  }
};
// aliases go here. You can take function from the base function map and just set them to each other
export const functionMap:Record<string,(
  command:string,
  scope:mbfs.Directory,
  mods:modTypes,
  setLogs:((update: SetStateAction<logs.LogType[]>)=>void),
  promise:[(value:boolean|PromiseLike<boolean>)=>void,(reason?:any)=>void],
  dirTree:string[],
  sudo:boolean,
  vars:mbsh.ShellVariable[],
  setVars:(update:SetStateAction<mbsh.ShellVariable[]>)=>void,
  keyboardInputBuffer:{getValue:()=>string[]},
  ...args:string[]
)=>void>={
  ...functionMapBase,
  "":()=>{},
  dir: functionMapBase.ls!,
  clear: functionMapBase.cls!,
  "ll":(command,scope,mods,setLogs,promise,dirTree:string[],sudo,vars,setVars,keyboardInputBuffer)=>functionMapBase.ls?.(command,scope,mods,setLogs,promise,dirTree,sudo,vars,setVars,keyboardInputBuffer,"-l"),
  "cd..":(command,scope,mods,setLogs,promise,dirTree:string[],sudo,vars,setVars,keyboardInputBuffer)=>functionMapBase.cd?.(command,scope,mods,setLogs,promise,dirTree,sudo,vars,setVars,keyboardInputBuffer,".."),
};