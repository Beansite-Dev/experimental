import type { ComponentType } from 'react';
export declare namespace mbwin {
  interface WindowMeta{
    title:string;
    icon?:string;
    size:{w:number,h:number};
    minSize?:{w:number,h:number};
    singleton?:boolean;
  }
  interface Window{
    id:string;
    meta:WindowMeta,
    component:ComponentType<any>;
  }
};