import { Provider } from "jotai/react";
import { store } from "./store.js";
export const LogsProvider=({children}:{children:React.ReactNode})=>
  <Provider {...{store}}>{children}</Provider>;