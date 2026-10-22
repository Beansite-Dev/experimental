# Plans
## general
- add comments you bum (denial said so)
- add git submodules for mb-fs2

## mb-fs2
- make function to move files and swap file uuids (should be easy)
- block 2 files with the same name in same dir: file.txt file (1).txt
- Add function to get file contents from a uuid getFileContentsFromUuid
- Add function to get file contents from file name getFileContentsFromFileName 
- Fix file querying functions (like getUuidsFromFileNames) 


## mb-shell
- FIX RM !!
- Add interactable text support using `<button/>`
- Add text inputs using `<input/>`
- Add keyboard support to send keyboard inputs as text characters
- Allow commands to receive keyboard shortcuts like ctrl+c to quit
- use `.toml` files under `/.config` or `~/.config`
- implement commands
  - grep
  - rmdir
  - mv
- implement more directory functions to existing commands like ls to list other directories while not having to be inside of them
- Scope also is not persistent for chained commands (such as `cd Programs; mkdir blah`) but this doesnt matter
- Add to mkdir to allow it to create directories from anywhere
- shell file scripts will not properly use redirect operators

## mb-win2
- this will likely not be reliant on the new shell or filesystem implementation, so proceed with it
- I want to not have to rely on a system like react-rnd for dragging or anything since maximization was a pain, but if im forced to, ill make it work better hopefully idk


## beansite 8.2 (placeholder name)
- make filesystem persistent