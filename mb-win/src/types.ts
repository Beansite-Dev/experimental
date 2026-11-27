import type { ComponentType } from 'react';
import z from 'zod';
export const WindowDimension=z.object({
  w:z.number().default(100),
  h:z.number().default(100),
});
export const WindowMetaBase=z.object({
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
export const WindowMeta=WindowMetaBase.extend({size:WindowDimension});
export const Window=z.object({
  class:z.string(),
  id:z.string(),
  meta:WindowMeta,
  component:z.custom<ComponentType<any>>(),
});
export declare namespace mbwin{
  type WindowDimension=z.infer<typeof WindowDimension>;
  type WindowMetaBase=z.infer<typeof WindowMetaBase>;
  type WindowClassDef=z.infer<typeof WindowClassDef>;
  type WindowMeta=z.infer<typeof WindowMeta>;
  type Window=z.infer<typeof Window>;
};