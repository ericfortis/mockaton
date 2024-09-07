# Mockaton 
_Mockaton_ is a mock server for developing and testing frontends.

It scans `Config.mocksDir` for files following a specific
file name convention, which is similar to the URL paths. For
example, the following file will be served for `/api/user/1234`
```
my-mocks-dir/api/user/[user-id].GET.200.json
```

By the way, [this browser
extension](https://github.com/ericfortis/devtools-ext-tar-http-requests) can
be used for downloading a TAR of your XHR requests following that convention.


## Getting Started
The best way to learn _Mockaton_ is by checking out this repo and
exploring its [sample-mocks/](./sample-mocks) directory. Then, run
[`./_usage_example.js`](./_usage_example.js) and you’ll see this dashboard:


<img src="./README-dashboard.png" style="max-width:820px"/>


## Basic Usage (see [_usage_example.js](./_usage_example.js))
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
  staticDir?: string 
  host?: string, // defaults to 'localhost'
  port?: number // defaults to 0, which means auto-assigned
  delay?: number // defaults to 1200 (ms)
  cookies?: object 
  skipOpen?: boolean // Prevents opening the dashboard in a browser
  proxyFallback?: string // e.g. http://localhost:9999 Target for relaying routes without mocks
  allowedExt?: RegExp // /\.(json|txt|md|js)$/ Just for excluding temporary editor files (e.g. JetBrains appends a ~)
  generate500?: boolean // autogenerates an Internal Server Error empty mock for routes that have no 500
  extraHeaders?: []
}
```


## Mock Variants
Each route can have many mocks, which could either be:
- Different response __status code__. 
  - e.g. for testing error responses. 
- __Comment__ on the filename, which is anything within parentheses.
  - e.g. `api/user(my-comment).POST.201.json`

Those alternatives can be manually selected in the dashboard
UI, or programmatically, for instance, for setting up tests.

The first file in **alphabetical order** becomes the default mock.

## You can write JSON mocks in JavaScript
An Object, Array, or String is sent as JSON.

`api/foo.GET.200.js`
```js
export default [
  { id: 0 }
]
```

Or, export default a function. There, you
can override the response status and the default JSON content
type. But don’t call `response.end()`, just return a string.
```js
export default function (req, response) {
  return JSON.stringify({ a: 1 })
}
```


## Proxying Routes
`Config.proxyFallback` lets you specify a target
server for serving routes you don’t have mocks for.



## Delay 🕓
The clock icon next to the mock selector is a checkbox for delaying a
particular response. They are handy for testing spinners.

The delay is globally configurable via `Config.delay = 1200` (milliseconds).


## File Name Convention


### Extension
`.Method.HttpResponseStatusCode.FileExt`

The **file extension** can be anything, but `.md` is reserved for documentation.

The `Config.allowedExt` regex defaults to: `/\.(json|txt|md|js)$/`


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
api/foo<b>(my comment)</b>.GET.200.json<b>(bar)</b>
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



### Default (index-like) route
For the default route of a directory, omit the mock filename name
(<b>just use the extension</b>). For example, the following files will be
routed to `api/foo` because comments and the query string are ignored.
```text
api/foo/.GET.200.json
api/foo/?bar=[bar].GET.200.json
api/foo/(my comment).GET.200.json
```


## `Config.cookies`
The selected cookie is sent in every response in the `Set-Cookie` header.
```js
import { jwtCookie } from 'mockaton'

Config.cookies = {
  'My Admin User':  'my-cookie=1;Path=/;SameSite=strict',
  'My Normal User': 'my-cookie=0;Path=/;SameSite=strict',
  'My JWT': jwtCookie('my-cookie', {
    email: 'john.doe@example.com',
    picture: 'https://cdn.auth0.com/avatars/jd.png'
  })
}
```
The key is just a label used for selecting a particular cookie in the dashboard.

`jwtCookie` has a hardcoded header and signature. In other
words, it’s useful if you only care about its payload.


## `Config.extraHeaders`
They are applied last, right before ending the response. In other words, they
can overwrite the `Content-Type`. The header name goes in even indices.

```js
Config.extraHeaders = [
  'Server', 'Mockaton',
  'Set-Cookie', 'foo=FOO;Path=/;SameSite=strict',
  'Set-Cookie', 'bar=BAR;Path=/;SameSite=strict'
]
```

## Documenting Contracts (.md)
This is handy for documenting request payload parameters. The dashboard will
print the Markdown document (as plain text) above the actual payload content.

Create a markdown file following the same filename convention.
The status code can be any number. For example,
```text
api/foo/[user-id].POST.201.md
api/foo/[user-id].POST.201.json
```


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

### Reset
Re-Initialize the collection and its states (selected mocks and cookies, delays, etc.).
```js
fetch(addr + '/mockaton/reset', {
  method: 'PATCH'
})
```

### Select a cookie
In `Config.cookies`, each key is the label used
for changing it. Only one cookie can be set.
```js
fetch(addr + '/mockaton/cookies', {
  method: 'PATCH',
  body: JSON.stringify('My Normal User')
})
```

### List Cookies
Sends a list of the available cookies along with a flag indicated if it’s the selected.
```js
fetch(addr + '/mockaton/cookies')
```

### Update Fallback Proxy
```js
fetch(addr + '/mockaton/fallback', {
  method: 'PATCH',
  body: JSON.stringify('http://example.com')
})
```
