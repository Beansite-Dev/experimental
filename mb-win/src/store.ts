import { atom } from "jotai";
import type { mbwin } from "./types";
// idea is, the window class atom defines the actual properties for windows to follow
// windows in the instances atom will then cross refrence with the class atom when actually used in the winhost
// standard window classes will exist, but apps will be able to make their own and deifne them in /.classes
export const windowClassDefAtom=atom<{[key:string]:mbwin.WindowClassDef}>({
  StandardWindow:{
    minSize:{w:100,h:100},
    defaultSize:{w:320,h:240},
    singleton:false,
  }
});