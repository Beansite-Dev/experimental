//this is where the log store should be used.
import {atom,createStore} from 'jotai';
export const logAtom=atom<logs.LogType[]>([]);
export const store=createStore();
const unsub=store.sub(logAtom,()=>{
console.log('logs',store.get(logAtom));});
unsub();