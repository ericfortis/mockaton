# Mockaton Architecture

## Overview
Mockaton is a small program with no dependencies. Including
tests, the server is 2.7KLoC, and the web client is 2KLoC.

### Server
Mockaton is a Node.js HTTP Server. You can
think of it as the router of a web-framework.

### Clients
Mockaton can be controlled via the **Web Dashboard UI** or **HTTP API**.

### Data Sources
`config.mocksDir` is required, while `config.staticDir` is optional.
The HTTP API provides real-time updates to indicate when a mock has been
added, deleted, or renamed. For real-time updates we use long polling.

In addition, Mockaton can be a reverse-proxy, so it can fetch from a real-backend.
That can be done by route, or for routes users have no mocks for.

### Browser Extension
There’s a companion Chrome DevTools extension for scraping APIs
and saving their responses following the filename convention.

### Tests
- Utilities are unit-tested.
- Mockaton server is integration tested. Except for file watching, you could 
 write Mockaton in another language and run our test suite against it.
- UI is pixel-diff tested with `pixaton`, which is a sister project of Puppeteer utilities.


## Entry Point
`npx mockaton --port 4040`

The NPM binary points to [cli.js](src/server/cli.js), which instantiates
the server. End users are allowed to do that too as follows:

```shell
import { Mockaton } from 'mockaton'

const server = await Mockaton(opts)
```

## Router
Routes under `/mockaton/*` are reserved for the HTTP API and dashboard.
The router first checks for those, and then checks for GET requests on `config.staticDir`.
Lastly, if there’s no previous match, [MockDispatcher.js](src/server/MockDispatcher.js) handles
the resource (or the 404).


## Mock Dispatcher
`dispatchMock(req, response)` first checks if the route can be proxied.
Otherwise, it applies the matching plugin and ends the response.

### Plugins
There are two plugins by default. One runs for `.js` or `.ts` files
(`jsToJsonPlugin`). The other one simply reads from the file-system
and adds the corresponding `Content-Type` header. 








