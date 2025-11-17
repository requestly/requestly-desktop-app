This is the source code for the desktop app of Requestly. It is an electron app

# Parts of App
This primarily has two render processes:
1. App Renderer: 
    - The UI of the app that is visible to the user
    - held by the `webAppWindow` variable in `src/main.ts`
    - loads the UI from `localhost:3000` during developement. The code of which can be found outside this repo at `../requestly/app`. This is the same code as the one that is loaded for the web version of requestly (although the code there is written in a way to recognise and adapt based on whether the website loads inside the web browser or the electron app here)
    - this loads a react app
    - this process has `nodeIntegration: false` and `sandbox: false`. and this is made to be a frameless window
    - loads preload from `./preload.js`

2. Background Renderer:
    - The process for all the background stuff. Major responsibilities include:
        - running the requestly proxy (whose code can be found inside `../requestly-proxy`) for providing interception functionality and everything related to that
        - an abstract FS service for managing access to local files as and when needed - primarily used to provide the capability have "workspaces" that store data fully locally
    - held by the `backgroundWindow` variable in `src/main.ts`
    - this has `nodeIntegration: true`, `contextIsolation: false` and has remote module enabled. 
    - this renderer does not load any preload script

3. Main process:
    - entry point of the app, hence takes care of core important things like
        - all the other parts of the app spawn on launch
        - initiator for all essential services and major IPC handlers
    - Critical place for all the IPC infrastructure that we have here (explained later)
    - handles custom system specific app integrations like:
        - handling the custom protocol that the app registers for deep link integrations
        - handling the files for which this becomes a default client (`.har` and `.rqly` files)
    - Autoupdates - code related to that should be very carefully updated as any issues there would be very hard to resolve (as they would make it difficult to make the fixed release reach affected users)
    - this is the node environment where the actual request is made for the Requestly API client
    - creates the tray menu to expose basic touch points
    - quitting and its related cleanup
    - some other basic helpers like:
        - preserving cookies
        - loading some stored user configs


# IPC infrastructure
- Electron specific constraints: 
    - IPC can only send serializable data. Objects with functions, circular references, or complex types cannot be transmitted.
    - renderers can only talk to the main process and not directly to each other


The code here has several tooling built to make the developer experience of working with IPC a lot easier

1. IPC.js via preload
In the app renderer, there are special wrapper functions for the IPC tooling that expose easy functions for the app renderer to communicate and listen to events from both main and the background renderer

2. IPC forwarding:
there are special IPC channels setup in main process to forward messages from app renderer to background renderer and vice versa (along with replies)
these are exposed via the IPC service through the preload as well

3. `RPCServiceOverIPC` on top of IPC forwarding. 
This class in the background process provides a way to create services in the background renderer and consume them inside the app renderer through *"adapters"* that expose easy to consume methods for these services


# Bundling / Packaging nuances
- the code here uses `electron-builder` and `@electron/notarize` and custom webpack scripts to build the final build
- the configs for those are in the package.json
- dependencies that have native code are installed through a postInstall step. and are hence separately mentioned in `release/app/package.json`