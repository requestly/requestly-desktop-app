### Project Structure

# Installation

```
./install.sh
```

- src
  - ## main : Electron Main Process
  - renderer : RQ Background Renderer Process
    - types : Typescript types
    - lib : Libraries/helpers that can be reused within renderer
    - listeners : Controller Layer. Contains all the IPC
    - services : Business Layer.
    - utils
    - index.js
  - lib : Libraries that can be shared within processes
  - packages : Packages that can be reused (Electron/CLI...)
  - utils
