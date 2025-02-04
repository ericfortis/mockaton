# Mockaton Colors App Demo

This a minimal React + Vite + Mockaton app you can play with.

<img src="./pixaton-tests/pic-for-readme.vp500x800.light.gold.png" alt="Mockaton Demo App Screenshot" width="500" />


## Install Dependencies
```
cd demo-app-vite
npm install
```


## Start Mockaton and Vite
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


## vite.config.js

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
