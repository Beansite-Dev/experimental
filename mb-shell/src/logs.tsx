// this is where I want to handle the components for converting log objects to components that can be passed to the user
// this is a draft of the object format I have in mind:
/*
{
  t:"l"|"nl"|"i" <- l=logs;nl=newlines;i=icons;
  m:string <- on i, this will be an icon id, but typically a string
  clr:string
  bg:string
}
*/
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { ReactElement } from 'react';
import { InvalidLogObjectError } from './exceptions';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
//@ts-ignore
import "./logStyles.scss";
declare global{
  namespace logs{
    interface LogBase{t:"l"|"nl"|"i";}
    type Color="Black"|"BrightBlack"|"Gray"|"DarkGray"|"BrightGray"|
      "White"|"BrightWhite"|"Blue"|"DarkBlue"|"BrightBlue"|
      "Green"|"DarkGreen"|"BrightGreen"|"Cyan"|"DarkCyan"|"BrightCyan"|
      "Red"|"DarkRed"|"BrightRed"|"Orange"|"DarkOrange"|"BrightOrange"|
      "Magenta"|"DarkMagenta"|"BrightMagenta"|"Yellow"|"DarkYellow"|"BrightYellow"|
      "Transparent"
    interface LogMessageBase extends LogBase{
      clr?:Color;
      bg?:Color;
    }
    interface Icon extends LogMessageBase {
      t:"i";
      i:IconDefinition;
    }
    interface NewLine extends LogBase {t:"nl";}
    interface LogMessage extends LogMessageBase {
      t:"l";
      m:string;
      bold?:boolean;
      italic?:boolean;
      underline?:boolean;
    }
    type LogType=logs.LogMessage|logs.Icon|logs.NewLine;
  }
};
const colorMap:Record<logs.Color,true>={
  Black:true,BrightBlack:true,Gray:true,DarkGray:true,BrightGray:true,
  White:true,BrightWhite:true,Blue:true,DarkBlue:true,BrightBlue:true,
  Green:true,DarkGreen:true,BrightGreen:true,Cyan:true,DarkCyan:true,BrightCyan:true,
  Red:true,DarkRed:true,BrightRed:true,Orange:true,DarkOrange:true,BrightOrange:true,
  Magenta:true,DarkMagenta:true,BrightMagenta:true,Yellow:true,DarkYellow:true,BrightYellow:true,
  Transparent:true,
};
const colors=Object.keys(colorMap) as logs.Color[];
type Style={clr?:logs.Color,bg?:logs.Color,bold?:boolean,italic?:boolean,underline?:boolean};
const tags:{name:string,style:Style}[]=[
  ...colors.map(c=>({name:c,style:{clr:c}})),
  ...colors.map(c=>({name:`bg${c}`,style:{bg:c}})),
  {name:"Bold",style:{bold:true}},
  {name:"Italic",style:{italic:true}},
  {name:"Underline",style:{underline:true}},
].sort((a,b)=>b.name.length-a.name.length);//longest first so prefixes can't shadow each other
export const parseLog=(src:string):logs.LogType[]=>{
  const out:logs.LogType[]=[];
  const stack:Style[]=[];
  let buf="";
  const flush=()=>{
    if(!buf)return;
    out.push({t:"l",m:buf,...stack.reduce((a,s)=>({...a,...s}),{} as Style)});
    buf="";
  };
  for(let i=0;i<src.length;){
    const ch=src[i];
    if(ch==="\n"){flush();out.push({t:"nl"});i++;continue;}
    if(ch==="\\"){
      const rest=src.slice(i+1);
      if(rest.startsWith("End")){flush();stack.pop();i+=4;continue;}
      if(rest.startsWith("n")){flush();out.push({t:"nl"});i+=2;continue;}
      if(rest.startsWith("\\")){buf+="\\";i+=2;continue;}
      const tag=tags.find(t=>rest.startsWith(t.name));
      if(tag){flush();stack.push(tag.style);i+=1+tag.name.length;continue;}
    }
    buf+=ch;i++;
  }
  flush();
  return out;
};
export const Log=({logObject}:{
  logObject:logs.LogType;
}):ReactElement=>{
  switch(logObject.t){
    case "l":return<span 
      className={`
        logMessage 
        ${logObject.bold?"bold":""}
        ${logObject.italic?"italic":""}
        ${logObject.underline?"underline":""}
        bg${logObject.bg||"Transparent"} 
        clr${logObject.clr||"White"}
      `.replaceAll("\n"," ")}>{logObject.m}</span>;
    case "nl":return<br/>;
    case "i":return<FontAwesomeIcon 
      icon={logObject.i} 
      className={`
        logMessage 
        icon 
        bg${logObject.bg||"Transparent"} 
        clr${logObject.clr||"White"}
      `.replaceAll("\n"," ")}/>;
    default:throw new InvalidLogObjectError("Invalid log object type");
  };
};