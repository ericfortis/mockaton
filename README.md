<img src="src/mockaton-logo.svg" alt="Mockaton Logo" width="210" style="margin-top: 30px"/>

_Mockaton_ is a mock server for developing and testing frontends.

It scans a given directory for files following a specific
file name convention, which is similar to the URL paths. For
example, the following file will be served for `/api/user/1234`
```
my-mocks-dir/api/user/[user-id].GET.200.json
```

[This browser extension](https://github.com/ericfortis/devtools-ext-tar-http-requests)
can be used for downloading a TAR of your XHR requests following that convention.

## What do I use it for?
- I’m a frontend dev, so I don’t have to spin up and maintain hefty or complex backends.
- For a deterministic and comprehensive backend state. For example, having all the possible
  state variants of a particular collection helps for spotting inadvertent bugs. And having those
  assorted responses are not easy to trigger from the backend.
- Testing empty responses.
- Testing spinners by delaying responses.
- Testing errors such as _Bad Request_ and _Internal Server Error_.
- Triggering notifications and alerts.
- Prototyping before the backend API is developed.
- Setting up tests.
- If you commit the mocks in the repo, when bisecting a bug, you don’t
  have to sync the frontend with many backend repos.
  - Similarly, I can check out long-lived branches that have old API contracts.
- As API documentation.

## Alternatives
- Chrome DevTools allows for [overriding responses](https://developer.chrome.com/docs/devtools/overrides)
- Reverse Proxies such as [Burp](https://portswigger.net/burp) are also handy for overriding responses.
- Storybook’s [MSW](https://storybook.js.org/addons/msw-storybook-addon)

### Caveats
- Syncing the mocks, but the browser extension mentioned above helps.


## Getting Started
The best way to learn _Mockaton_ is by checking out this repo and
exploring its [sample-mocks/](./sample-mocks) directory. Then, run
[`./_usage_example.js`](./_usage_example.js) and you’ll see the dashboard.

You can edit mock files without resetting Mockaton. The _Reset_
button is for when you add, remove, or rename a mock file.

The dropdown lets you pick a mock variant, details in the next section. Next to it is a
_Delay_ toggler, and a button for sending _500 - Internal Server Error_ on that endpoint.

<img src="./README-dashboard.png" style="max-width:820px"/>

## Basic Usage
```
npm install mockaton
```
Create a `my-mockaton.js` file
```js
import { resolve } from 'node:path'
import { Mockaton } from 'mockaton'


Mockaton({
  mocksDir: resolve('my-mocks-dir'),
  port: 2345
})
```

```sh
node my-mockaton.js
```

## Config Options
```ts
interface Config {
  mocksDir: string
  ignore?: RegExp // Defaults to /(\.DS_Store|~)$/

  staticDir?: string // These files don’t use the mock-filename convention

  host?: string, // Defaults to 'localhost'
  port?: number // Defaults to 0, which means auto-assigned
  proxyFallback?: string // e.g. http://localhost:9999 Target for relaying routes without mocks

  delay?: number // Defaults to 1200 (ms)
  cookies?: { [label: string]: string }
  extraMimes?: { [fileExt: string]: string }
  extraHeaders?: []

  onReady?: (dashboardUrl: string) => void // Defaults to trying to open macOS and Win default browser.
}
```
There’s a Config section below with more details.

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

## You can write JSON mocks in JavaScript
An Object, Array, or String is sent as JSON.

`api/foo.GET.200.js`
```js
export default [
  { id: 0 }
]
```

Or, export default a function. In it, you can override the
response status and the default JSON content type. But don’t call
`response.end()`, just return a `string`, `Buffer`, or `Uint8Array`.

Think of this as an HTTP handler. You can read or write to a
database, or pull data from a backend. The `request` is of type
[IncomingMessage](https://nodejs.org/api/http.html#class-httpincomingmessage), and the
`response` a [ServerResponse](https://nodejs.org/api/http.html#class-httpserverresponse).
```js
export default function optionalName(request, response) {
  globalThis.myDatabase ??= { count: 0 }
  globalThis.myDatabase.count++

  return JSON.stringify({ a: 1 })
}
```


## File Name Convention


### Extension
`.Method.ResponseStatusCode.FileExt`


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
For instance, let's say you have `api/foo/bar`, and
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


## `Config.proxyFallback`
Lets you specify a target server for serving routes you don’t have mocks for.


## `Config.delay` 🕓
The clock icon next to the mock selector is a checkbox for delaying a
particular response. They are handy for testing spinners.

The delay is globally configurable via `Config.delay = 1200` (milliseconds).


## `Config.staticDir`
These files don’t use the mock filename convention. They take precedence
over mocks. Also, they get served on the same address, so no CORS issues.

Use Case 1: If you have a bunch of static assets you don’t want to add `.GET.200.ext`

Use Case 2: For a standalone demo server. For example,
build your frontend bundle, and serve it from Mockaton.


## `Config.cookies`
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

## `Config.extraHeaders`
They are applied last, right before ending the response.
In other words, they can overwrite the `Content-Type`. Note
that it's an array and the header name goes in even indices.

```js
Config.extraHeaders = [
  'Server', 'Mockaton',
  'Set-Cookie', 'foo=FOO;Path=/;SameSite=strict',
  'Set-Cookie', 'bar=BAR;Path=/;SameSite=strict'
]
```

## `Config.extraMimes`
```js
Config.extraMimes = {
  jpg: 'application/jpeg'
}
```

## `Config.onReady`
This is a callback `(dashboardAddress: string) => void`, which defaults to
trying to open the dashboard in your default browser in macOS and Windows.

If you don’t want to open a browser, pass a noop, such as
```js
Config.onReady = () => {}
```

On Linux, you could pass:
```js
import { exec } from 'node:child_process'


Config.onReady = function openInBrowser(address) {
  exec(`xdg-open ${address}`)
}
```

Or, for more cross-platform utility, you could `npm install open` and pass it.
```js
import open from 'open'


Config.onReady = open
```

---

## API

### Select a mock for a route
```js
fetch(addr + '/mockaton/edit', {
  method: 'PATCH',
  body: JSON.stringify({
    file: 'api/foo.200.GET.json',
    delayed: true // optional
  })
})
```

### Select all mocks that have a particular comment
```js
fetch(addr + '/mockaton/bulk-select-by-comment', {
  method: 'PATCH',
  body: JSON.stringify('(demo-a)')
})
```

### List Cookies
Sends a list of the available cookies along with an "is selected" boolean flag.
```js
fetch(addr + '/mockaton/cookies')
```

### Select a cookie
In `Config.cookies`, each key is the label used for changing it.
```js
fetch(addr + '/mockaton/cookies', {
  method: 'PATCH',
  body: JSON.stringify('My Normal User')
})
```

### Update Fallback Proxy
```js
fetch(addr + '/mockaton/fallback', {
  method: 'PATCH',
  body: JSON.stringify('http://example.com')
})
```

### Reset
Re-initialize the collection. So if you added or removed mocks they
will be considered. The selected mocks, cookies, and delays go
back to default, but `Config.proxyFalllback` is not affected.
```js
fetch(addr + '/mockaton/reset', {
  method: 'PATCH'
})
```

## TODO
- Dashboard. List `staticDir` and indicate if it’s overriding some mock.
- Refactor Tests
