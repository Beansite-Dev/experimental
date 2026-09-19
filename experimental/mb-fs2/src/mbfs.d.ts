import * as z from "zod";
import{ 
  type userPerms as UserPermsT, 
  date, 
  metadata, 
  obj,
  file,
  dir,
}from"./atom.js";
declare global {
  namespace mbfs {
    type userPerms=UserPermsT;
    type date=z.infer<typeof date>;
    type metadata=z.infer<typeof metadata>;
    type obj=z.infer<typeof obj>;
    type File=z.infer<typeof file>
    type Directory=z.infer<typeof dir>
  }
}
export {}