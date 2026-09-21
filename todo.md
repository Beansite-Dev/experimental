# Plans
## general
- add comments you bum (denial said so)


## mb-fs2
#### todo
- implement more functions in mb-fs2/hook.ts
- Possibly implement a built in version of the file explorer thats style can be modified  

#### done
- implement functions in mb-fs2/hook.ts
  - Name getter for dir tree (which takes the files uuids and turns it into an array of names of them instead)
  - Function (internal maybe) for browsing thru the filesystem like setting scope (review mb8.1 codebase for ref)
  - Implement a file getter


## mb-shell2
- build commands/libs/init systems into the filesystem directly be linking their scripts to files and create a sandboxed environment where lack of those files would throw errors
  - idea is all inits and other systems would require a filesystem pointer, and will cease to work if that pointer is missing.
  - I intend to make all app actually exist as files (under the `exe` type with `object.metadata.typeof.executable` as `true`)
    - These apps will have special metadata which i will add to the file types in mb-fs2 and will be likely be able to store data in the filesystem


## beansite 8.2 (placeholder name)
- make filesystem persistent