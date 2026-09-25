//this is where the log store should be used.
import {atom,createStore} from 'jotai';
export const logAtom=atom<string[]>([]);
export const store=createStore();
const unsub=store.sub(logAtom,()=>{
console.log('logs',store.get(logAtom));});
unsub();
//use (wrap component in this)
// <Provider store={store}>{/*...*/}</Provider>