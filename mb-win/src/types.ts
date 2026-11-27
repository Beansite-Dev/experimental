import type { ComponentType } from 'react';
import z from 'zod';
export const WindowDimension=z.object({
  w:z.number().default(100),
  h:z.number().default(100),
});
export const WindowRect=WindowDimension.extend({
  x:z.number().default(0),
  y:z.number().default(0),
});
export const WindowMeta=z.object({
  title:z.string().default(""),
  icon:z.string().default(""),
});
export const WindowClassDef=z.object({
  minSize:WindowDimension,
  defaultSize:WindowDimension,
  singleton:z.boolean().default(false),
  buttons:z.object({
    maximize:z.boolean(),
    minimize:z.boolean(),
    close:z.boolean(),
  }).default({
    maximize:true,
    minimize:true,
    close:true,
  }),
  ability:z.object({
    maximize:z.boolean(),
    minimize:z.boolean(),
    close:z.boolean(),
  }).default({
    maximize:true,
    minimize:true,
    close:true,
  }),
});
export const WindowBase=z.object({
  class:z.string(),
  id:z.string(),
  uuid:z.uuidv4(),
  component:z.custom<ComponentType<any>>(),
});
export declare namespace mbwin{
  type WindowDimension=z.infer<typeof WindowDimension>;
  type WindowClassDef=z.infer<typeof WindowClassDef>;
  type WindowMeta=z.infer<typeof WindowMeta>;
  type WindowRect=z.infer<typeof WindowRect>;
  type WindowBase=z.infer<typeof WindowBase>;
};