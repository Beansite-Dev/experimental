import { atom } from 'jotai';
import { v4 as uuidv4 } from 'uuid';
import * as z from "zod";
//S=schema => only if name without s is taken
export const userPermsS=z.object({
  administrators:z.boolean().default(false),
  users:z.boolean().default(false),
  guests:z.boolean().default(false),
});
export const date=z.object({
  created:z.date().default(new Date()).optional(),
  modified:z.date().default(new Date()).optional(),
  accessed:z.date().default(new Date()).optional(),
});
export type userPerms=z.infer<typeof userPermsS>;
export const defaultUserPerms=(x:boolean[]=[]):userPerms=>userPermsS.keyof().options.reduce((o,k,i)=>({...o,[k]:x[i]}),{})as userPerms;
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
  data:z.union([
    z.instanceof(Blob),
    z.string(),
    z.boolean().transform(String),
    z.number().transform(String),
  ]),
});
export const dir=obj.extend({get data(){return z.record(z.uuidv4(),z.union([file,dir]))},});
export const fsAtom=atom<mbfs.Directory>({
  name:"root",
  data:{
    [uuidv4()]:{
      name:"File1",
      type:"txt",
      data:"string or blob go here",
      metadata:{
        access:{
          read:{
            administrators:true,
            users:true,
            guests:false,
          },
          write:{
            administrators:true,
            users:false,
            guests:false,
          },
        },
        date:{
          created:new Date(),
          modified:new Date(),
          accessed:new Date(),
        },
        originalCreator:"administrator",
        typeof:{
          system:false,
          directory:false,
          executable:false,
        }
      },
    },
  },
  metadata:{
    access:{
      read:{
        administrators:true,
        users:true,
        guests:true,
      },
      write:{
        administrators:true,
        users:false,
        guests:false,
      },
    },
    date:{
      created:new Date(),
      modified:new Date(),
      accessed:new Date(),
    },
    originalCreator:"system",
    typeof:{
      system:true,
      directory:true,
      executable:false,
    },
  },
});
export const directoryTreeAtom=atom<string[]>(["root"]);