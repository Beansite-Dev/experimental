import { motion } from "motion/react";
import type { ReactElement, ReactNode } from "react";
import { Rnd } from "react-rnd";
import type { mbwin } from "../types";
//@ts-ignore
import "./Window.scss";
type WindowProps={
  rect:mbwin.WindowRect,
  meta:mbwin.WindowMeta,
  z:number,
  minSize:mbwin.WindowDimension,
  onFocus:()=>void,
  onRectChange:(patch:Partial<mbwin.WindowRect>)=>void,
  children?:ReactNode,
};
export const Window=({
  rect,
  meta,
  z,
  minSize,
  onFocus,
  onRectChange,
  children
}:WindowProps):ReactElement=>{
  return<Rnd
    position={{x:rect.x,y:rect.y}}
    size={{width:rect.w,height:rect.h}}
    minWidth={minSize.w}
    minHeight={minSize.h}
    bounds="parent"
    dragHandleClassName="mb-titlebar"
    className="Window"
    style={{zIndex:z}}
    onMouseDown={onFocus}
    onDragStop={(_e,d)=>onRectChange({x:d.x,y:d.y})}
    onResizeStop={(_e,_dir,el,_delta,pos)=>onRectChange({x:pos.x,y:pos.y,w:el.offsetWidth,h:el.offsetHeight})}>
      <motion.div className="mb-titlebar">
        <motion.span className="title">{meta.title}</motion.span>
      </motion.div>
      <motion.div className="Contents">{children}</motion.div>
  </Rnd>;
}