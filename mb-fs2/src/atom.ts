import { atom } from 'jotai';
import { v4 as uuidv4 } from 'uuid';
import * as z from "zod";
import { applications } from './applications.js';
//S=schema => only if name without s is taken
export const userPermsS=z.object({
  administrators:z.boolean().default(false),
  users:z.boolean().default(false),
  guests:z.boolean().default(false),
});
export const date=z.object({
  created:z.date().default(()=>new Date()).optional(),
  modified:z.date().default(()=>new Date()).optional(),
  accessed:z.date().default(()=>new Date()).optional(),
});
export type UserPermsT=z.infer<typeof userPermsS>;
export const defaultUserPerms=(x:boolean[]=[]):UserPermsT=>userPermsS.keyof().options.reduce((o,k,i)=>({...o,[k]:x[i]}),{})as UserPermsT;
export const userPermsWithDefault=userPermsS.default(defaultUserPerms([false,false,false]));
export const metadata=z.object({
  access:z.object({
    read:userPermsWithDefault,
    write:userPermsWithDefault,
  }),
  date,
  originalCreator:z.string().default("root"),
  typeof:z.object({
    system:z.boolean().default(false),
    directory:z.boolean().default(false),
    executable:z.boolean().default(false),
  }),
});
export const obj=z.object({
  name:z.string(),
  metadata,
});
export const file=obj.extend({
  type:z.string(),
  typeExclusiveMetadata:z.any().optional(),
  data:z.union([
    z.instanceof(Blob),
    z.string(),
    z.boolean().transform(String),
    z.number().transform(String),
  ]),
});
export const dir:z.ZodType<mbfs.Directory,any>=obj.extend({get data(){return z.record(z.uuidv4(),z.union([file,dir]))},});
export namespace mbfs {
  export type userPerms=UserPermsT;
  export type date=z.infer<typeof date>;
  export type metadata=z.infer<typeof metadata>;
  export type obj=z.infer<typeof obj>;
  export type File=z.infer<typeof file>;
  export type Directory=obj&{data:Record<string,File|Directory>};
}
const perms=(administrators:boolean,users:boolean,guests:boolean):mbfs.userPerms=>({administrators,users,guests,});
const meta=(originalCreator:string,system:boolean,directory:boolean,executable=false,guestRead=false):mbfs.metadata=>({
  access:{
    read:perms(true,true,guestRead),
    write:perms(true,false,false),
  },
  date:{
    created:new Date(),
    modified:new Date(),
    accessed:new Date(),
  },
  originalCreator,
  typeof:{system,directory,executable,},
});
const mkDir=(name:string,data:Record<string,mbfs.File|mbfs.Directory>,metadata:mbfs.metadata):mbfs.Directory=>({name,data,metadata,});
const mkFile=(name:string,type:string,data:string|Blob,metadata:mbfs.metadata):mbfs.File=>({name,type,data,metadata,});
export const fsAtom=atom<mbfs.Directory>(mkDir("root",{
  [uuidv4()]:mkDir("bin",{
    [uuidv4()]:applications.neofetch,
  },meta("root",true,true)),
  [uuidv4()]:mkDir("home",{
    [uuidv4()]:mkDir("administrator",{
      [uuidv4()]:mkDir(".config",{},meta("root",true,true)),
    },meta("administrator",false,true)),
  },meta("root",true,true)),
  [uuidv4()]:mkFile("README","txt","string or blob go here",meta("administrator",false,false)),
},meta("system",true,true,false,true)));
//!incorrect code: directory tree should be based in separate calls to the hook, not global
// export const directoryTreeAtom=atom<string[]>([]);