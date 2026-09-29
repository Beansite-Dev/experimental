import { DirectoryNotFoundError } from "mb-fs2";
const parsePath=(inputPath:string,currentWorkingDirectory:string[]):string[]=>{
  if(!inputPath||inputPath.length < 1)throw new DirectoryNotFoundError(`Invalid directory string passed to parser`);
  else if(inputPath.startsWith("C:/")||inputPath.startsWith("c:/"))return[...inputPath.slice(3).split("/")];
  else if(inputPath.startsWith("./"))return[...currentWorkingDirectory,...inputPath.split("/").slice(1)];
  else if(inputPath.startsWith("~"))return["users","admin",...inputPath.split("/").slice(1)]; 
  else if(inputPath.startsWith("..")){
    const segments=inputPath.split("/").filter(s=>s.length>0);
    let cwd=[...currentWorkingDirectory];
    let i=0;
    for(;i<segments.length&&segments[i]==="..";i++){
      if(!cwd.length)throw new DirectoryNotFoundError(`cannot go above root`);
      cwd=cwd.slice(0,-1);
    }
    return[...cwd,...segments.slice(i)];
  }
  else if(inputPath.startsWith("/"))return[...inputPath.split("/")];
  else return[...currentWorkingDirectory,...inputPath.split("/")];
}
export const parseError=(command:string,name:string,message:string):logs.LogType[]=>{
  return[
    {t:"l",m:`${message}`,clr:"Red",bg:"Black"},{t:"nl"},
    {t:"l",m:`At line:1 char:1`,clr:"Red",bg:"Black"},{t:"nl"},
    {t:"l",m:`+ ${command}`,clr:"Red",bg:"Black"},{t:"nl"},
    {t:"l",m:`+ ${"~".repeat(command.length)}`,clr:"Red",bg:"Black"},{t:"nl"},
    {t:"l",m:`    + FullyQualifiedErrorId: ${name}`,clr:"Red",bg:"Black"},{t:"nl"},
  ];
}
export { parsePath };