// this is where I want to handle the components for converting log objects to components that can be passed to the user
// this is a draft of the object format I have in mind:
/*
{
  t:"l"|"nl"|"i" <- l=logs;nl=newlines;i=icons;
  m:string <- on i, this will be an icon id, but typically a string
  clr:string
  bg:string
}
*/