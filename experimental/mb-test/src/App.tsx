import { useEffect, useRef, useState, type ReactElement } from "react";
import { useFileSystem, type mbfs } from "mb-fs2";
import { useShell } from "mb-shell";
import "./app.css";
const Browser=({scope,fsMod,directoryTree}:{
  scope:mbfs.Directory;
  fsMod:ReturnType<typeof useFileSystem>[3];
  directoryTree:string[];
}):ReactElement=>{
  const[openFile,setOpenFile]=useState<mbfs.File|null>(null);
  return(<><div className="browser">
    <div className="nav">
      <span>browser</span>
      <div className="hrv"/>
      <button onClick={()=>{fsMod.enterParentDirectory();}}>^parent dir</button>
      <button onClick={()=>{
        fsMod.createFile(directoryTree,{
          name:"New File",
          type:"txt",
          data:"new file",
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
        });
      }}>+file</button>
      <button onClick={()=>{
        fsMod.createDirectory(directoryTree,{
          name:"New Dir",
          data:{},
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
        });
      }}>+dir</button>
    </div>
    {Object.keys(scope.data).map(x=>{
      const n=scope.data[x],m=n.metadata as {typeof?:{directory?:boolean}}|undefined;
      return(<div className="child" key={x} onClick={()=>{
        if(m?.typeof?.directory)fsMod.enterDirectoryFromScope(x);
        else setOpenFile(n as mbfs.File);
      }}>
        <span>{n.name as string}</span>
        <span>{(m?.typeof?.directory?"[dir]":`.${(scope.data[x]as mbfs.File).type}`)as string}</span>
        <div className="hrv"/>
        <span style={{fontSize:".5rem",opacity:".75"}}>uuid:{x}</span>
        <div className="hrv"/>
        <button onClick={(e)=>{
          e.preventDefault();
          e.stopPropagation();
          fsMod.deleteFilesystemObject(directoryTree,x);
        }}>delete</button>
        <button onClick={(e)=>{
          e.preventDefault();
          e.stopPropagation();
          fsMod.modifyFilesysteObjectAttributes(directoryTree,x,{name:prompt("new name?")||n.name});
        }}>rename</button>
        {!m?.typeof?.directory?
        <button onClick={(e)=>{
          e.preventDefault();
          e.stopPropagation();
          //@ts-expect-error
          fsMod.modifyFilesysteObjectAttributes(directoryTree,x,{type:prompt("new type?")||n.type});
        }}>change type</button>:null}
      </div>);
    })}
  </div><br/>
  {openFile?<div className="openFile">
    <div style={{marginBottom:"2px"}} className="nav">
      {`${openFile.name}.${openFile.type}`}
      <div className="hrv"/>
      <button onClick={()=>setOpenFile(null)}>close file</button>
    </div>
    {openFile.data as string}
  </div>:null}<br/></>);
};
const Shell=({logs,setLogs,interpreter}:{
  logs:ReturnType<typeof useShell>[0];
  setLogs:ReturnType<typeof useShell>[1];
  interpreter:ReturnType<typeof useShell>[2];
}):ReactElement=>{
  const scrollContainerRef=useRef<HTMLDivElement|null>(null);
  useEffect(()=>{
    if(scrollContainerRef.current) 
      scrollContainerRef.current.scrollTo({
        top:scrollContainerRef.current.scrollHeight,
        behavior:'smooth',
      });
  },[logs]);
  return<><div ref={scrollContainerRef} className="shell">
    {logs.map((x,i)=><span key={i}>{x}</span>)}
  </div><textarea onKeyDown={(e)=>{
    if(e.key==="Enter"&&!e.shiftKey){
      interpreter(e.currentTarget.value);
      e.currentTarget.value="";
    }
  }}/></>;
};
export const App=({}):ReactElement=>{
  const[
    logs,
    setLogs,
    interpreter,
    filesystem,
    scope,
    directoryTree,
    fsMod,
  ]=useShell();
  const[tab,setTab]=useState<number>(0);
  return<>
    <h1>mb-fs2 test</h1>
    <Browser {...{scope,fsMod,directoryTree}}/>
    <Shell {...{logs,setLogs,interpreter}}/>
    <hr/>
    <span style={{minHeight:"1rem !important",display:"block"}}>
      dir tree: {fsMod.getNamesFromUuids(directoryTree).join("/")||"(empty...)"}
    </span>
    <hr/>
    <button className={tab===0?"active":""} onClick={()=>setTab(0)}>Current Scope</button>
    <button className={tab===1?"active":""} onClick={()=>setTab(1)}>Full Filesystem</button><br/>
    {tab===0?JSON.stringify(scope,null,"  "):null}
    {tab===1?JSON.stringify(filesystem,null,"  "):null}
    <h1>mb-fs2 test</h1>
  </>;
}