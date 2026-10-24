import { mbfs, modTypes } from "mb-fs2";
import { clamp, getMinLength, lslFormatDateTime, parsePath } from "./lib";
import { SetStateAction } from "jotai/vanilla";
import { parseLog } from "./logs";
export const functionMapBase:{
  [key:string]:((
    command:string,
    scope:mbfs.Directory,
    mods:modTypes,
    setLogs:((update:SetStateAction<logs.LogType[]>)=>void),
    promise:[(value:number|PromiseLike<number>)=>void,(reason?:any)=>void],
    dirTree:string[],
    sudo:boolean,
    ...args:string[]
  )=>void)|void;
}={
  cd:(command,_scope,mods,setLogs,promise,dirTree:string[],sudo,inputPath:string):void=>{
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
        {t:"l",m:`c:/${f.join("/")} > ${command}`},{t:"nl"},
      ]);
      promise[0](0);
    }catch(e){
      if(debug)console.error("=> cd failed",e);
      promise[1](e);
    };
  },
  ls:(_command,scope,_mods,setLogs,promise,dirTree:string[],sudo,...args:string[]):void=>{
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
    ]);promise[0](0);}
    if(args.includes("-l")){setLogs(x=>[...x,
      {t:"l",m:`total ${JSON.stringify(scope).length} bytes`},{t:"nl"},
      ...Object.keys(scope.data).map((key,i):logs.LogType[]=>([
        {t:"l",
          m:`${scope.data[key].metadata.typeof.directory?"d":"-"}rwxr-xr-${
            scope.data[key].metadata.typeof.directory
            ||scope.data[key].metadata.typeof.executable?"x":"-"}. `,
        },{t:"l",m:`1 `,},
        {t:"l",m:`${scope.data[key].metadata.originalCreator}`.padEnd(lMinNameLen),},
        {t:"l",m:`${scope.data[key].metadata.originalCreator}`.padEnd(lMinNameLen),},
        {t:"l",m:`${String(clamp(JSON.stringify(scope.data[key]).length,0,4096))}`.padEnd(5),},
        {t:"l",m:lslFormatDateTime(scope.data[key].metadata.date.modified).padEnd(13),},
        {
          t:"l",
          ...scope.data[key].metadata.typeof.directory?{clr:"Cyan",bold:true}
            :scope.data[key].metadata.typeof.executable?{clr:"BrightGreen",bold:true}:{},
          m:`${scope.data[key].name}${scope.data[key].metadata.typeof.directory?"":`.${(scope.data[key]as mbfs.File).type}`}`,
        },
        ...(Object.keys(scope.data).length-1>i?[{t:"nl"}as logs.LogType]:[])
      ])).flat(),
    ]);promise[0](0);}
  },
  cls:(_command,_scope,_mods,setLogs,promise,):void=>{setLogs([]);promise[0](0);},
  touch:(_command,_scope,mods,_setLogs,promise,dirTree:string[],sudo,fileName:string):void=>{
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
  cat:(command,scope,mods,setLogs,promise,dirTree,sudo,filePath):void=>{
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
      promise[0](0);
    }
  },
  tac:(command,scope,mods,setLogs,promise,dirTree,sudo,filePath):void=>{
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
      promise[0](0);
    }
  },
  chmod:(command,scope,mods,setLogs,promise,dirTree,sudo,newval,file)=>{
    const parsedPath:string[]=parsePath(file,mods.getNamesFromUuids(dirTree));
    if(parsedPath){
      //path parsing
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
    }
  },
  rm:(_command,_scope,_mods,_setLogs,promise,_dirTree:string[],sudo,filePath:string):void=>{
    promise[0](0);
    
    //!old rm, fileName => filePath now
    // const trimmedFileName:string=fileName.split(".")[0];
    // try{
    //   mods.deleteFilesystemObject(dirTree,mods.getUuidsFromFileNames([...dirTree,trimmedFileName]).slice(-1)[0]);
    // }catch(error:FileNotFoundError|DirectoryNotFoundError|FilesystemObjectTypeError|any) {
    //   setLogs(x=>[...x,...parseError(command,error.name,error.message)]);
    // }
  },
  mkdir:(_command,_scope,mods,_setLogs,promise,dirTree:string[],sudo,name:string):void=>{
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
  whoami:(_command,_scope,_mods,setLogs,promise,_dirTree:string[],_sudo):void=>{setLogs(x=>[...x, {t:"l",m:`beansite/administrator`},]);promise[0](0)},
  echo:(_command,_scope,_mods,setLogs,promise,_dirTree:string[],sudo,...args:string[]):void=>{
    setLogs(x=>[...x,...parseLog(args.join(" "))]);
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
  sudo:boolean,
  ...args:string[]
)=>void>={
  ...functionMapBase,
  "":()=>{},
  dir: functionMapBase.ls!,
  clear: functionMapBase.cls!,
  "ll":(command,scope,mods,setLogs,promise,dirTree:string[],sudo)=>functionMapBase.ls?.(command,scope,mods,setLogs,promise,dirTree,sudo,"-l"),
  "cd..":(command,scope,mods,setLogs,promise,dirTree:string[],sudo)=>functionMapBase.cd?.(command,scope,mods,setLogs,promise,dirTree,sudo,".."),
};