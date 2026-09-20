import type { ReactElement } from "react";
import { useFileSystem } from "mb-fs2";
import "./app.css";
export const App=({}):ReactElement=>{
  const[
    filesystem,
    directoryTree,
    fsMod,
  ]=useFileSystem();
  return<>
    <hr/>
    <span style={{minHeight:"1rem !important",display:"block"}}>
      {directoryTree.join("/")||"(empty...)"}
    </span>
    <hr/>
    {JSON.stringify(filesystem,null,"  ")}
  </>;
}