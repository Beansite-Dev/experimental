# Plans
## general
- add comments you bum (denial said so)
- add git submodules for mb-fs2

## mb-fs2
#### todo
- make function to move files and swap file uuids (should be easy)

#### done
- implement functions in mb-fs2/hook.ts
  - Name getter for dir tree (which takes the files uuids and turns it into an array of names of them instead)
  - Function (internal maybe) for browsing thru the filesystem like setting scope (review mb8.1 codebase for ref)
  - Implement a file getter
  - File creation
  - File Deletion
  - File modification
- Possibly implement a built in version of the file explorer thats style can be modified  


## mb-shell
#### todo
- build commands/libs/init systems into the filesystem directly be linking their scripts to files and create a sandboxed environment where lack of those files would throw errors
  - idea is all inits and other systems would require a filesystem pointer, and will cease to work if that pointer is missing.
  - I intend to make all app actually exist as files (under the `exe` type with `object.metadata.typeof.executable` as `true`)
    - These apps will have special metadata which i will add to the file types in mb-fs2 and will be likely be able to store data in the filesystem
- I want there to also be an interpreted shell system
  - every line in beanshell code should check if the command exists in bin
    - the command should point to the function in lib via searching for strings in an object
- add a text color interpreter to allow results from the shell logs to return as full color
  - We can do this by making logs be able to be of type string|ReactNode which should allow us to include spans with classes. I also want to include a bundle css wrapper that include the color styling.
- implement commands
  - cd
  - mkdir
  - cat
  - grep
  - echo
  - rm
  - rmdir
  - touch
- ability to "ex" > file.txt 

#### done
- added a simple ls command

## mb-win2
- this will likely not be reliant on the new shell or filesystem implementation, so proceed with it
- I want to not have to rely on a system like react-rnd for dragging or anything since maximization was a pain, but if im forced to, ill make it work better hopefully idk


## beansite 8.2 (placeholder name)
- make filesystem persistent