import { DirectoryNotFoundError } from "mb-fs2";
import { mbsh } from "./store";
const parsePathSub=(inputPath:string,currentWorkingDirectory:string[]):string[]=>{
  if(!inputPath||inputPath.length<1||!inputPath.split("/"))throw new DirectoryNotFoundError(`Invalid directory string passed to parser`);
  // else if(inputPath.startsWith("C:/")||inputPath.startsWith("c:/"))return inputPath.slice(3).split("/");
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
  else if(inputPath.startsWith("./"))return[...currentWorkingDirectory,...inputPath.split("/").slice(1)];
  else if(inputPath.startsWith("/"))return inputPath.split("/");
  else return[...currentWorkingDirectory,...inputPath.split("/")];
};
export const parsePath=(inputPath:string,currentWorkingDirectory:string[]):string[]=>{
  return parsePathSub(inputPath,currentWorkingDirectory).filter(x=>x!=="");
};
export const parseError=(command:string,name:string,message:string):logs.LogType[]=>{
  return[
    {t:"l",m:`${message}`,clr:"Red",bg:"Black"},{t:"nl"},
    {t:"l",m:`At line:1 char:1`,clr:"Red",bg:"Black"},{t:"nl"},
    {t:"l",m:`+ ${command}`,clr:"Red",bg:"Black"},{t:"nl"},
    {t:"l",m:`+ ${"~".repeat(command.length)}`,clr:"Red",bg:"Black"},{t:"nl"},
    {t:"l",m:`    + FullyQualifiedErrorId: ${name}`,clr:"Red",bg:"Black"},{t:"nl"},
  ];
};
export const getMinLength=(map:string[],pad:number):number=>{
  if(map.length==0)return 0;
  return map.sort((a:string,b:string)=>{return b.length-a.length;})[0].length+pad;
};
export const clamp=(val:number,min:number,max:number)=>Math.min(Math.max(val,min),max);
export const lslFormatDateTime=(date:Date|undefined):string=>{
  if(!date)return"";
  const options:Intl.DateTimeFormatOptions={
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  return new Intl.DateTimeFormat('en-US',options).format(date).replace(',','');
}
const splitOutsideQuotes=(src:string,getBreak:(src:string,k:number)=>{sep:string;len:number}|null):{text:string;sep:string;}[]=>{
  const out:{text:string;sep:string;}[]=[];
  let cur:string="";
  let sep:string="";
  let quote:string|null=null;
  for(let k=0;k<src.length;k++){
    const c=src[k];
    if(quote){
      cur+=c;
      if(c==="\\"&&k+1<src.length)cur+=src[++k];
      else if(c===quote)quote=null;
      continue;
    }
    if(c==='"'||c==="'"){quote=c;cur+=c;continue;}
    const brk=getBreak(src,k);
    if(brk){
      out.push({text:cur,sep});
      cur="";
      sep=brk.sep;
      k+=brk.len-1;
      continue;
    }
    cur+=c;
  }
  out.push({text:cur,sep});
  return out;
};
export const parseShell=(code:string):mbsh.ShellCommand[][]=>
  splitOutsideQuotes(code,(s,k)=>
    s[k]===";"?{sep:";",len:1}
    :s[k]==="\r"&&s[k+1]==="\n"?{sep:"newline",len:2}
    :s[k]==="\n"?{sep:"newline",len:1}
    :null
  )
    .map(l=>({text:l.text.trim(),sep:l.sep}))
    .filter(l=>l.text)
    .map((l,li)=>{
      const line=l.text;
      const parts:{subcommand:string;invoker:string;}[]=[];
      let buffer:string="";
      let quote:string|null=null;
      for(let k=0;k<line.length;k++){
        const c=line[k];
        if(quote){
          buffer+=c;
          if(c==="\\"&&k+1<line.length)buffer+=line[++k];
          else if(c===quote)quote=null;
          continue;
        }
        if(c==='"'||c==="'"){quote=c;buffer+=c;continue;}
        if(c==="&"){
          const invoker=line[k+1]==="&"?"&&":"&";
          if(invoker==="&&")k++;
          parts.push({subcommand:buffer.trim(),invoker});
          buffer="";
          continue;
        }
        buffer+=c;
      }
      parts.push({subcommand:buffer.trim(),invoker:""});
      const real=parts.filter(p=>p.subcommand);
      return real.map((p,k)=>({
        commandOfOrigin:line,
        subcommand:p.subcommand,
        invoker:k===0?(li===0?"":l.sep):real[k-1].invoker,
        ...(real.length>1?{i:k}:{}),
      }) as mbsh.ShellCommand);
    });