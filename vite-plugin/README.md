# Mockaton Vite Plugin

Vite plugin to start Mockaton along with Vite dev server.

## Installation

```sh
npm install mockaton --save-dev
```

## Usage

In your `vite.config.js`:

```ts
import { defineConfig } from 'vite'
import mockatonPlugin from 'mockaton/vite'

export default defineConfig({
  plugins: [
    // …other plugins
    mockatonPlugin({
      port: 4040,
      mocksDir: './mockaton-mocks',
    })
  ]
})
```

