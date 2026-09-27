const parsePath = (inputPath:string):string[]=>{
  if(!inputPath || inputPath.length < 1) throw "Invalid Input Path";
  if(inputPath.startsWith("/")) return ["C:", ...inputPath.split("/")];
  if(inputPath.startsWith("~")) return ["C:", "users", "admin", ...inputPath.split("/").slice(1)]; 
  return inputPath.split("/");
}

export { parsePath };