import { useSetAtom } from "jotai";
import { openWindowAtom, closeWindowAtom, focusWindowAtom } from "./store";
export const useWindows=()=>({
  open:useSetAtom(openWindowAtom),
  close:useSetAtom(closeWindowAtom),
  focus:useSetAtom(focusWindowAtom),
});