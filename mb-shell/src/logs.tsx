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
    }
  }
}
export const Log=({logObject}:{
  logObject:logs.LogMessage|logs.Icon|logs.NewLine
}):ReactElement=>{
  switch(logObject.t){
    case "l":return<span className={`logMessage bg${logObject.bg} clr${logObject.clr}`}>{logObject.m}</span>;
    case "nl":return<br/>;
    case "i":return<FontAwesomeIcon icon={logObject.i} className={`logMessage icon bg${logObject.bg} clr${logObject.clr}`}/>;
    default:throw new InvalidLogObjectError("Invalid log object type");
  };
};