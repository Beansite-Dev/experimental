import { atom } from 'jotai';
import { v4 as uuidv4 } from 'uuid';
import * as z from "zod";
import { fa } from 'zod/locales';
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
export const dir=obj.extend({get data():z.ZodRecord<z.ZodUUID,z.ZodUnion<[typeof file,typeof dir]>>{return z.record(z.uuidv4(),z.union([file,dir]))},});
export namespace mbfs {
  export type userPerms=UserPermsT;
  export type date=z.infer<typeof date>;
  export type metadata=z.infer<typeof metadata>;
  export type obj=z.infer<typeof obj>;
  export type File=z.infer<typeof file>
  export type Directory=z.infer<typeof dir>
}
const formatMs=(ms:number)=>`${String(Math.floor(ms / 3600000)).padStart(2, '0')} hours, ${String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0')} minutes`;
export const fsAtom=atom<mbfs.Directory>({
  name:"root",
  data:{
    [uuidv4()]:{
      name:"bin",
      data:{
        [uuidv4()]:{
          name:"neofetch",
          type:"bat",
          data:`
echo "         \\Red%%%%%\\End       \\Cyanadminstrator\\End@\\Cyanlocalhost\\End\\n";
echo "        \\Red% %%%%%\\End      ----------------------\\n";
echo "  \\Cyan%%%%%%\\End\\Red%% %%%%%\\End     \\CyanOS: \\EndBeansite Experimental Project 9.0\\n";
echo " \\Cyan%%%%% %%\\End\\Red%%%%%%%%\\End    \\CyanHost: \\EndWeb\\n";
echo "\\Cyan%%%%% %%\\End  \\Red%%%%%%%\\End    \\CyanKernal: \\End9.14-zen\\n";
echo "\\Cyan%%%%%%\\End    \\Red%%%%%%\\End     \\CyanUptime: \\End${formatMs(performance.now())}\\n";
echo "\\Cyan%%%%%%\\End \\Green%%%%\\End\\Red%%%%\\End      \\CyanPackages: \\End122 (beanman)\\n";
echo "  \\Cyan%%%\\End \\Green%   %%%%%%%\\End    \\CyanShell: \\EndMbsh 7.2\\n";
echo "      \\Green%    %%    %\\End   \\CyanDE: \\EndBeansite Test Gui\\n";
echo "      \\Green%%%       %\\End    \\CyanCPU: \\EndIntel Celeron N4020 (2) @ 2.800GHz\\n";
echo "        \\Green%%%%%%%%\\End     \\CyanMemory: \\End2058MiB / 3805MiB\\n";
echo "\\n";
echo "${" ".repeat(21)}";
echo "\\bgBrightGray   \\End";
echo "\\bgBlack   \\End";
echo "\\bgRed   \\End";
echo "\\bgOrange   \\End";
echo "\\bgYellow   \\End";
echo "\\bgGreen   \\End";
echo "\\bgCyan   \\End";
echo "\\bgBlue   \\End";
echo "\\bgMagenta   \\End";
echo "\\n";
echo "${" ".repeat(21)}";
echo "\\bgWhite   \\End";
echo "\\bgBrightBlack   \\End";
echo "\\bgBrightRed   \\End";
echo "\\bgBrightOrange   \\End";
echo "\\bgBrightYellow   \\End";
echo "\\bgBrightGreen   \\End";
echo "\\bgBrightCyan   \\End";
echo "\\bgBrightBlue   \\End";
echo "\\bgBrightMagenta   \\End";
echo "\\n";
          `,
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
            originalCreator:"root",
            typeof:{
              system:false,
              directory:false,
              executable:true,
            }
          },
        },   
      },
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
        originalCreator:"root",
        typeof:{
          system:true,
          directory:true,
          executable:false,
        }
      },
    },
    [uuidv4()]:{
      name:"home",
      data:{
        [uuidv4()]:{
          name:"administrator",
          data:{
            [uuidv4()]:{
              name:".config",
              data:{
              },
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
                originalCreator:"root",
                typeof:{
                  system:true,
                  directory:true,
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
              directory:true,
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
        originalCreator:"root",
        typeof:{
          system:true,
          directory:true,
          executable:false,
        }
      },
    },
    [uuidv4()]:{
      name:"README",
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
//!incorrect code: directory tree should be based in separate calls to the hook, not global
// export const directoryTreeAtom=atom<string[]>([]);uuidv4