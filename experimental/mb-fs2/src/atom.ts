import { atom } from 'jotai';
import { v4 as uuidv4 } from 'uuid';
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
        administrator:true,
        user:true,
        guest:true,
      },
      write:{
        administrator:true,
        user:false,
        guest:false,
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
export const directoryTreeAtom=atom<string[]>([]);