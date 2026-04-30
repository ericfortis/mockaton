# Mockaton Architecture

Mockaton is a small client-server program with no dependencies.

## Server
It’s a Node.js HTTP Server. Think of it as filesystem-based router.

## Clients
Mockaton can be controlled via the **Web Dashboard UI**, or **HTTP API**.

## Data Sources
- The `config` object lives in-memory and it's not persisted.
- `config.mocksDir` must exist.
- In addition, Mockaton can be a reverse-proxy, so it can fetch from a real-backend.
That can be done by route, or for routes users have no mocks for.
- Browser Extension. There’s a companion Chrome DevTools extension for scraping APIs
  and saving their responses following the filename convention.

The HTTP API provides real-time updates (SSE) to indicate when a
mock has been added, deleted, or renamed. Also, when config changes.

## Tests
- Utilities are unit-tested.
- Mockaton server is integration tested. e.g., you could write Mockaton in another
 language and run our test suite against it.
- UI is pixel-diff tested with `pixaton`, which is a sister project of Puppeteer utilities.


## Entry Point
`npx mockaton --port 4040 my-mocks-dir`

The NPM binary points to [cli.js](src/server/cli.js), which instantiates
the server. End users are allowed to do that too as follows:

```shell
import { Mockaton } from 'mockaton'

const server = await Mockaton({
  mocksDir: 'my-dir',
  // …other config options
})
```

## Router
Routes under `/mockaton/*` are reserved for the HTTP API and dashboard.
The router first checks for those, and if there's no match, it delegates routing
to [MockDispatcher.js](src/server/MockDispatcher.js).


### Mock Dispatcher
`dispatchMock(req, response)` first checks if the route can be proxied.
Otherwise, it applies the matching plugin and ends the response.

### Plugins
There are two plugins by default. One runs for `.js` or `.ts` files
(`jsToJsonPlugin`). The other one simply reads from the file-system
and adds the corresponding `Content-Type` header. 








