import { useSetAtom } from "jotai";
import { openWindowAtom, closeWindowAtom, focusWindowAtom, registerWindowClassAtom } from "./store";
export const useWindows=()=>({
  open:useSetAtom(openWindowAtom),
  close:useSetAtom(closeWindowAtom),
  focus:useSetAtom(focusWindowAtom),
  registerClass:useSetAtom(registerWindowClassAtom),
});