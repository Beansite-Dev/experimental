import { useEffect, useState, type ReactElement } from "react";
import { useFileSystem, type mbfs } from "mb-fs2";
import "./app.css";
export const App=({}):ReactElement=>{
  const[
    filesystem,
    scope,
    directoryTree,
    fsMod,
  ]=useFileSystem();
  const[tab,setTab]=useState<number>(0);
  useEffect(()=>{
    
  });
  const Browser=():ReactElement=>{
    const[openFile,setOpenFile]=useState<mbfs.File|null>(null);
    return(<><div className="browser">
      <div className="nav">
        <span>browser</span>
        <div className="hrv"/>
        <button onClick={()=>{
          fsMod.enterParentDirectory();
        }}>^parent dir</button>
      </div>
      {Object.keys(scope.data).map(x=>{
        const n=scope.data[x],m=n.metadata as {typeof?:{directory?:boolean}}|undefined;
        return(<div className="child" key={x} onClick={(e)=>{
          if(m?.typeof?.directory)fsMod.enterDirectoryFromScope(x);
          else setOpenFile(n as mbfs.File);
        }}>
          <span>{n.name as string}</span>
          <span>{(m?.typeof?.directory?"[dir]":`.${(scope.data[x]as mbfs.File).type}`)as string}</span>
          <div className="hrv"/>
          <span style={{fontSize:".5rem",opacity:".75"}}>uuid:{x}</span>
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
  }
  return<>
    <h1>mb-fs2 test</h1>
    <Browser/>
    <hr/>
    <span style={{minHeight:"1rem !important",display:"block"}}>
      dir tree: {fsMod.getDirTree().join("/")||"(empty...)"}
    </span>
    <hr/>
    <button className={tab===0?"active":""} onClick={()=>setTab(0)}>Current Scope</button>
    <button className={tab===1?"active":""} onClick={()=>setTab(1)}>Full Filesystem</button><br/>
    {tab===0?JSON.stringify(scope,null,"  "):null}
    {tab===1?JSON.stringify(filesystem,null,"  "):null}
  </>;
}