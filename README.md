<img src="src/mockaton-logo.svg" alt="Mockaton Logo" width="210" style="margin-top: 30px"/>

_Mockaton_ is a mock server for developing and testing frontends.

The mock filename convention is similar to the URL paths. For
example, the following file will be served on `/api/user/1234`
```
my-mocks-dir/api/user/[user-id].GET.200.json
```

By the way, [this browser
extension](https://github.com/ericfortis/devtools-ext-tar-http-requests)
can create a TAR of your XHR requests following that convention.

### Dashboard Example

<picture>
  <source media="(prefers-color-scheme: light)" srcset="./README-dashboard-light.png">
  <source media="(prefers-color-scheme: dark)" srcset="./README-dashboard-dark.png">
  <img alt="Mockaton Dashboard Demo" src="./README-dashboard-light.png" style="max-width: 860px">
</picture>


## Basic Usage
`tsx` is only needed if you want to write mocks in TypeScript
```
npm install mockaton tsx
```

Create a `my-mockaton.js` file
```js
import { resolve } from 'node:path'
import { Mockaton } from 'mockaton'


// The Config options are explained in a section below
Mockaton({
  mocksDir: resolve('my-mocks-dir'),
  port: 2345
})
```

```sh
node --import=tsx my-mockaton.js
```


## Running the Example Demo
This demo uses the [sample-mocks/](./sample-mocks) directory of this repository.

- Checkout this repo
  - `git clone https://github.com/ericfortis/mockaton.git`
  - `cd mockaton`
- `npm install tsx` (optional)
- `npm run demo:ts` it will open a dashboard

Experiment with the Dashboard:

- Pick a mock variant from the Mock dropdown (we’ll discuss
  them later)
- Toggle the 🕓 Clock button, which _Delays_ responses (e.g. for testing spinners)
- Toggle the _500_ button, which sends and _Internal Server Error_ on that endpoint

Finally, edit a mock file. You don’t need to restart Mockaton for that. The
_Reset_ button is for registering newly added, removed, or renamed mocks.


## Use Cases
- Test empty responses
- Test spinners by delaying responses
- Test errors such as _Bad Request_ and _Internal Server Error_
- Trigger notifications and alerts
- Prototyping before the backend API is developed
- Setting up tests
- As API documentation
- If you commit the mocks in the repo, when bisecting a bug, you don’t
  have to sync the frontend with many backend repos
  - Similarly, it allows for checking out long-lived branches that have old API contracts

## Motivation
- Avoids spinning up and maintaining hefty backends when developing UIs.
- For a deterministic and comprehensive backend state. For example, having all the possible
  state variants of a collection helps for spotting inadvertent bugs.

## Alternatives
- Chrome DevTools allows for [overriding responses](https://developer.chrome.com/docs/devtools/overrides)
- Reverse Proxies such as [Burp](https://portswigger.net/burp) are also handy for overriding responses.
- [Mock Server Worker](https://mswjs.io)

---

## Mock Variants
Each route can have many mocks, which could either be:
- Different response __status code__. For example, for testing error responses.
- __Comment__ on the filename, which is anything within parentheses.
  - e.g. `api/user(my-comment).POST.201.json`

Those alternatives can be manually selected in the dashboard
UI, or programmatically, for instance, for setting up tests.

### Default Mock for a Route
You can add the comment: `(default)` to a filename.
Otherwise, the first file in **alphabetical order** wins.

```
api/user(default).GET.200.json
```

---

## You can write JSON mocks in JavaScript or TypeScript

**Option A:** An Object, Array, or String is sent as JSON.

`api/foo.GET.200.js`
```js
export default [
  { id: 0 }
]
```

**Option B:** Function

Think of this as an HTTP handler. You can read or write to a
database, or pull data from a backend.

Don’t call `response.end()`, just return a `string | Buffer | Uint8Array`.

```js
export default function optionalName(request, response) {
  globalThis.myDatabase ??= { count: 0 }
  globalThis.myDatabase.count++

  // Optinally, you can override these two:
  repsonse.statusCode = 200
  response.setHeader('Content-Type', 'application/json')

  return JSON.stringify({ a: 1 })
}
```

If you need to serve a static `.js` file, put it in your
`Config.staticDir` without the mock filename convention.

---

## Mock File Name Convention

### Extension

The last 3 dots are reserved for the HTTP Method,
Response Status Code, and the File Extension.

```
api/user.GET.200.json
```


### Dynamic Parameters
Anything within square brackets. For example:
<pre>
api/user/<b>[id]</b>/<b>[age]</b>.GET.200.json
</pre>

### Comments
Comments are anything within parentheses, including them.
They are ignored for URL purposes, so they have no effect
on the URL mask. For example, these two are for `/api/foo`
<pre>
api/foo<b>(my comment)</b>.GET.200.json
api/foo.GET.200.json
</pre>

### Query String Params
<pre>
api/video<b>?limit=[limit]</b>.GET.200.json
</pre>

The query string is ignored when routing to it. In other words, it’s
only used for documenting the URL contract.

Speaking of which, in Windows, filenames containing "?" are [not
permitted](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file),
but since that’s part of the query string, it’s ignored anyway.


### Index-like route
For instance, let’s say you have `api/foo/bar`, and
`api/foo`. For the latter you have two options:

**Option A.** Place it outside the directory:
```
api/foo/
api/foo.GET.200.json
```

**Option B.** Omit the filename:
```text
api/foo/.GET.200.json
```

---
## Config
### `mocksDir: string`
This is the only required field

### `host?: string`
Defaults to `'localhost'`

### `port?: number`
Defaults to `0`, which means auto-assigned


### `ignore?: RegExp`
Defaults to `/(\.DS_Store|~)$/`


### `delay?: number` 🕓
The clock icon next to the mock selector is a checkbox for delaying a
particular response. They are handy for testing spinners.

The delay is globally configurable via `Config.delay = 1200` (milliseconds).


### `proxyFallback?: string`
Lets you specify a target server for serving routes you don’t have mocks for.
For example, `Config.proxyFallback = 'http://example.com:8080'`


### `staticDir?: string`
Files under `Config.staticDir` don’t use the filename convention.
Also, they take precedence over the `GET` mocks in `Config.mockDir`.

For example, if you have two files for `GET /foo/bar.jpg`
```
my-static-dir/foo/bar.jpg
my-mocks-dir/foo/bar.jpg.GET.200.jpg // Unreacheable
```

Use Case 1: If you have a bunch of static assets you don’t want to add `.GET.200.ext`

Use Case 2: For a standalone demo server. For example,
build your frontend bundle, and serve it from Mockaton.


### `cookies?: { [label: string]: string }`
The selected cookie is sent in every response in the `Set-Cookie` header.

The key is just a label used for selecting a particular cookie in the
dashboard. In the dashboard, only one cookie can be selected. If you need
more cookies you can inject additional cookies globally in `Config.extraHeaders`.

`jwtCookie` has a hardcoded header and signature. In other
words, it’s useful if you only care about its payload.

```js
import { jwtCookie } from 'mockaton'


Config.cookies = {
  'My Admin User': 'my-cookie=1;Path=/;SameSite=strict',
  'My Normal User': 'my-cookie=0;Path=/;SameSite=strict',
  'My JWT': jwtCookie('my-cookie', {
    email: 'john.doe@example.com',
    picture: 'https://cdn.auth0.com/avatars/jd.png'
  })
}
```

### `extraHeaders?: string[]`
Note it’s a unidimensional array. The header name goes at even indices.

```js
Config.extraHeaders = [
  'Server', 'Mockaton',
  'Set-Cookie', 'foo=FOO;Path=/;SameSite=strict',
  'Set-Cookie', 'bar=BAR;Path=/;SameSite=strict'
]
```

### `extraMimes?: { [fileExt: string]: string }`
```js
Config.extraMimes = {
  jpg: 'application/jpeg'
}
```

### `plugins?: [filenameTester: RegExp, plugin: Plugin][]`
```ts
type Plugin = (
  filePath: string,
  request: IncomingMessage,
  response: OutgoingMessage
) => Promise<{
  mime: string,
  body: string | Uint8Array
}>
```
Plugins are for processing mocks before sending them.

Note: don’t call `response.end()`


#### Plugin Examples
```shell
npm install yaml
```
```js
import { parse } from 'yaml'
import { readFileSync } from 'node:js'
import { jsToJsonPlugin } from 'mockaton'


Config.plugins = [
  [/\.(js|ts)$/, jsToJsonPlugin], // Default 
  [/\.yml$/, yamlToJsonPlugin],
  [/foo\.GET\.200\.txt$/, capitalizePlugin], // e.g. GET /api/foo would be capitalized
]

function yamlToJsonPlugin(filePath) {
  return {
    mime: 'application/json',
    body: JSON.stringify(parse(readFileSync(filePath, 'utf8')))
  }
}

function capitalizePlugin(filePath) {
  return {
    mime: 'application/text',
    body: readFileSync(filePath, 'utf8').toUpperCase()
  }
}
```


### `corsAllowed?: boolean`
Defaults to `corsAllowed = false`

When `Config.corsAllowed === true`, these are the default options:
```js
Config.corsOrigins = ['*']
Config.corsMethods = ['GET', 'PUT', 'DELETE', 'POST', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT']
Config.corsHeaders = ['content-type']
Config.corsCredentials = true
Config.corsMaxAge = 0 // seconds to cache the preflight req
Config.corsExposedHeaders = [] // headers you need to access in client-side JS
```

### `onReady?: (dashboardUrl: string) => void`
This defaults to trying to open the dashboard
in your default browser in macOS and Windows.

If you don’t want to open a browser, pass a noop, such as
```js
Config.onReady = () => {}
```

For a more cross-platform utility, you could `npm install open` and pass it.
```js
import open from 'open'


Config.onReady = open
```

---

## HTTP API
`Commander` is a wrapper for the Mockaton HTTP API.
All of its methods return their `fetch` response promise.
```js
import { Commander } from 'mockaton'


const myMockatonAddr = 'http://localhost:2345'
const mockaton = new Commander(myMockatonAddr)
```

### Select a mock file for a route
```js
await mockaton.select('api/foo.200.GET.json')
```
### Select all mocks that have a particular comment
```js
await mockaton.bulkSelectByComment('(demo-a)')
```

### Set Route is Delayed Flag
```js
await mockaton.setRouteIsDelayed('GET', '/api/foo', true)
```

### Select a cookie
In `Config.cookies`, each key is the label used for selecting it.
```js
await mockaton.selectCookie('My Normal User')
```

### Set Fallback Proxy
```js
await mockaton.setProxyFallback('http://example.com')
```
Pass an empty string to disable it.

### Reset
Re-initialize the collection. So if you added or removed mocks they will
be considered. The selected mocks, cookies, and delays go back to default,
but `Config.proxyFallback` and `Config.corsAllowed` are not affected.
```js
await mockaton.reset()
```

<div style="display: flex; align-items: center; gap: 20px">
  <img src="./sample-mocks/api/user/avatar.GET.200.png" width="170"/>
  <p style="font-size: 18px">“Use Mockaton”</p>
</div>


## TODO
- Refactor Tests
