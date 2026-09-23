//this is where the log store should be used.
import {atom,createStore} from 'jotai';
const logAtom=atom<string[]>([]);
const store=createStore();
const unsub=store.sub(logAtom,()=>{
  console.log('count',store.get(logAtom))
});
unsub();
//use (wrap component in this)
// <Provider store={store}>{/*...*/}</Provider>