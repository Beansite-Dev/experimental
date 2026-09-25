Idea:
- use javascript objects with a hook that is based on jotai atoms. Zod schemas should be utilized to verify that modified data is valid. Here is how a file should look
```typescript
//for files
"asBG2348dddf":{//object name. this will be the id in the filesystem. It should be a randomized string
  name:"File1",//recognized name in fs
  type:"txt",
  data:"string or blob go here",
  metadata:{//file policies
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
      created:"*datetime*",
      modified:"*datetime*",
      accessed:"*datetime*",
    },
    originalCreator:"*username*",
    typeof:{
      system:false,
      directory:false,
    }
  },
}
//for diretories
"asBG2348dddf":{//object name. this will be the id in the filesystem. It should be a randomized string
  name:"Directory1",//recognized name in fs
  data:{//as oppose to a string, another nested children object would go here instead

  },
  metadata:{//file policies
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
      created:"*datetime*",
      modified:"*datetime*",
      accessed:"*datetime*",
    },
    originalCreator:"*username*",
    typeof:{
      system:false,
      directory:true,
    }
  },
}
```
