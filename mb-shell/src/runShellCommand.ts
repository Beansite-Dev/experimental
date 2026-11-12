import { mbfs, modTypes } from "mb-fs2";
import { parseError, parsePath } from "./lib";
import { SetStateAction } from "jotai";
import { useShell } from "./hook";
import { mbsh } from "./store";
import { functionMap } from "./interpreterFunctionMap";
export const runShellCommand=(
  command:mbsh.ShellCommand,
  scope:mbfs.Directory,
  mods:modTypes,
  logs:logs.LogType[],
  setLogs:(update:SetStateAction<logs.LogType[]>)=>void,
  dirTree:string[],
  interpreter:ReturnType<typeof useShell>[2],
  vars:mbsh.ShellVariable[],
  setVars:(update:SetStateAction<mbsh.ShellVariable[]>)=>void,
  keyboardInputBuffer:{getValue:()=>string[]},
  signal:AbortSignal
):Promise<boolean>=>{
  const parsedCommand:string[]=(command.subcommand.trim().match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\S+/g)||[]).map(s=>/^["']/.test(s)?s.slice(1,-1).replace(/\\(["'])/g,"$1"):s);
  const iOfRedirOp:number=parsedCommand.indexOf(">");
  let args:string[]=iOfRedirOp>0?parsedCommand.slice(0,iOfRedirOp):parsedCommand;
  let sudo:boolean=false;
  if(args[0]=="sudo"){args=args.slice(1);sudo=true;}
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
  let onAbort:(()=>void)|undefined;
  return new Promise<boolean>((resolve,reject)=>{
    const abortError={name:"AbortError",message:"interrupted"};
    if(signal.aborted)return reject(abortError);
    onAbort=()=>reject(abortError);
    signal.addEventListener("abort",onAbort,{once:true});
    if(!args[0])return resolve(true);
    // > ex usage of keyboardInputBuffer getter func
    // console.log("recieved value from promise",keyboardInputBuffer.getValue());
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
    console.log(args[0],args[0][0],args[0][0]=="$");
    const fn=Object.hasOwn(functionMap,args[0])?functionMap[args[0]]:undefined;
    if(!fn){
      if(args[0][0]=="$"){
        if(vars.map(x=>x.name).includes(args[0].slice(1))){
          setLogs(x=>[...x,
            {t:"l",m:vars.filter(x=>x.name==args[0].slice(1))[0].value},
          ]);
          return resolve(true);
        }else{
          return reject({
            name:"VariableNotFoundError",
            message:`Variable ${args[0].slice(1)} is not defined. Check ~/.mbshrc to see if it is defined`
          });
        }
      }
      if(args.join(" ").match(/^[^=\s]+=.+$/)){
        const eq:number=args[0].indexOf("=");
        const name:string=args[0].slice(0,eq);
        const raw:string=[args[0].slice(eq+1),...args.slice(1)].join(" ");
        const subs:RegExpMatchArray[]=[...raw.matchAll(/\$\(([^)]+)\)/g)];
        Promise.all(subs.map(m=>{
          const out:string[]=[];
          let cur:string="";
          let seen:logs.LogType[]=logs;
          return runShellCommand({
            commandOfOrigin:command.commandOfOrigin,
            subcommand:m[1],
            invoker:"substitution",
          },scope,mods,logs,u=>{
            const next=typeof u==="function"?u(seen):u;
            for(const e of next.slice(seen.length)){
              if(e.t==="nl"){out.push(cur);cur="";}
              else if("m" in e)cur+=e.m??"";
            }
            seen=next;
          },dirTree,interpreter,vars,setVars,keyboardInputBuffer,signal).then(()=>{
            out.push(cur);
            return out.join("\n").trimEnd();
          });
        })).then(outs=>{
          let i:number=0;
          const value:string=raw.replace(/\$\(([^)]+)\)/g,()=>outs[i++]);
          setVars(x=>[...x.filter(v=>v.name!==name),{name,value}]);
          resolve(true);
        });
        return;
      }
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
      if(
        binCommandPointer
        &&binCommandPointer.metadata.typeof.executable
      ){
        console.log(`found pointer for command ${binCommandPointer.name} in "/bin"`);
        if(["bat","sh"].includes(binCommandPointer.type))
          return interpreter(String(binCommandPointer.data),false).then(()=>resolve(true),reject);
        return resolve(true);
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
          if(["bat","sh"].includes((filePointer as mbfs.File).type))
            return interpreter(String(filePointer.data),false).then(()=>resolve(true),reject);
          return resolve(true);
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
    fn(
      command.subcommand,
      scope,
      mods,
      setLogsWithLogger,
      [resolve,reject],
      dirTree,
      sudo,
      vars,
      setVars,
      keyboardInputBuffer,
      signal,
      ...args.slice(1)
    );
  }).then(()=>{
    if(!outputPath)return true;
    if(line)captured.push(line);
    const now=new Date();
    const cwdNames=mods.getNamesFromUuids(dirTree);
    const path=parsePath(outputPath,cwdNames);
    const newFilePath=mods.getUuidsFromDirectoryNames(path.slice(0,-1));
    const name=path.slice(-1)[0].split(".")[0];
    const type=path.slice(-1)[0].split(".")[1]||"";
    const existing=Object.entries(mods.getDirectoryContents(newFilePath).data).find(([,x])=>!x.metadata.typeof.directory&&x.name===name&&(x as mbfs.File).type===type);
    if(existing)mods.modifyFilesysteObjectAttributes(newFilePath,existing[0],{
      data:captured.join("\n"),
      metadata:{...existing[1].metadata,date:{...existing[1].metadata.date,modified:now,},},
    });
    else mods.createFile(newFilePath,{
      name,type,
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
    return true;
  }).catch(e=>{
    if(signal.aborted)return false;
    const err=e as {name:string;message:string};
    setLogs(x=>[...x,{t:"nl"},...parseError(command.commandOfOrigin,err.name,err.message),]);
    return false;
  }).finally(()=>{
    if(onAbort)signal.removeEventListener("abort",onAbort);
  });
};