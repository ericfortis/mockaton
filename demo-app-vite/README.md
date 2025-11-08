# Mockaton Colors App Demo

This a minimal React + Vite + Mockaton app you can play with.

<img src="./pixaton-tests/pic-for-readme.vp740x880.light.gold.png" alt="Mockaton Demo App Screenshot" width="740" />


## Dev Setup
### Install Dependencies
```
cd demo-app-vite
npm install
```


### Start Mockaton and Vite
```sh
npm run mockaton
```

On another terminal:
```sh
npm run start  
```

Alternatively, you can start Mockaton and Vite in one command:

```sh
./start-mockaton-and-vite-macos
# or
./start-mockaton-and-vite-tmux
```


### vite.config.js

For proxying Mockaton we pass its address as an environment variable:

```js 
server: {
  proxy: {
    '/api': {
      target: process.env.BACKEND,
      changeOrigin: true
    }
}
```

---

## Standalone Demo Server
This will build the frontend SPA, and start a docker container
with Mockaton serving that SPA.

```sh
cd demo-app-vite
make
```
