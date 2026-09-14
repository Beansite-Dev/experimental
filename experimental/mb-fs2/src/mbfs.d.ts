declare namespace mbfs {
  declare interface userPerms {
    administrators:boolean;
    users:boolean;
    guests:boolean;
  }
  declare interface metadata {
    access:{
      read:userPerms;
      write:userPerm;
    }
    date:{
      created:Date;
      modified:Date;
      accessed:Date;
    }
    originalCreator:string;
    typeof:{
      system:boolean;
      directory:boolean;
      executable:boolean;
    }
  }
  declare interface Object {
    name:string;
    metadata:metadata;
  }
  declare interface File extends Object {
    type:string;
    data:Blob|string|number|boolean;
  }
  declare interface Directory extends Object {
    data:{
      [key:string]:File|Directory,
    };
  }
}