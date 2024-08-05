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


### Mock Variants
Each route can have many mocks, which could either be:
- Different response __status code__. 
  - e.g. for testing error responses. BTW, an _Internal Server
    Error_ mock is autogenerated for routes that have no 500.
- __Comment__ on the filename, which is anything within parentheses.
  - e.g. `api/user(my-comment).POST.201.json`

Those alternatives can be manually selected in the dashboard
UI, or programmatically, for instance, for setting up tests.

About the default mock file, the first file in **alphabetical order** wins.

### Proxying Routes
`Config.proxyFallback` lets you specify a target
server for serving routes you don’t have mocks for.


## Getting Started
The best way to learn _Mockaton_ is by checking out this repo and
exploring its [sample-mocks/](./sample-mocks) directory. Then, run
[`./_usage_example.js`](./_usage_example.js) and you’ll see this dashboard:

![](./README-dashboard.png)


## Delay 🕓
The clock icon next to the mock selector is a checkbox for delaying a
particular response. They are handy for testing spinners.

The milliseconds for the delay is globally configurable via `Config.delay = 1200`

---

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
  host?: string, // 'localhost'
  port?: number // 0 auto-assigned
  delay?: number // 1200 ms
  cookies?: object 
  database?: object // for "Transforms"
  skipOpen?: boolean // Prevents opening the dashboard in a browser
  proxyFallback?: string // e.g. http://localhost:9999 Target for relaying routes without mocks
  allowedExt?: RegExp // /\.(json|txt|md|mjs)$/ Just for excluding temporary editor files (e.g. JetBrains appends a ~)
}
```

## Cookies
```js
import { jwtCookie } from 'src/Mockaton'

Config.cookies = {
  'My Admin User': 'my-cookie=1;Path=/;SameSite=strict',
  'My Normal User': 'my-cookie=0;Path=/;SameSite=strict',
  'My JWT': jwtCookie('my-cookie', {
    email: 'john.doe@example.com',
    picture: 'https://cdn.auth0.com/avatars/jd.png'
  })
}
```
The key is just a label used in dashboard for selecting the desired cookie.

That `jwtCookie` has a hardcoded header and signature. In other
words, it’s useful iff you care about its payload in the frontend.

---

## File Name Convention


### Extension
`.Method.HttpResponseStatusCode.FileExt`

The **file extension** can anything, but `.md` and `.mjs` are reserved
for documentation, and mock processors (more on that later).

The `Config.allowedExt` regex defaults to: `/\.(json|txt|md|mjs)$/`


### Dynamic Parameters
Anything within square brackets. For example, 
<pre>
api/user/<b>[id]</b>/<b>[age]</b>.GET.200.json
</pre>

### Comments
Comments are anything within parentheses, including them.
They are ignored for URL purposes, so they have no effect
on the URL mask. For example, these two are for `/api/foo`
<pre>
api/foo<b>(my comment)</b>.GET.200.json<b>(foo)</b>
api/foo.GET.200.json
</pre>

### Query String Params
<pre>
api/video<b>?limit=[limit]</b>.GET.200.json
</pre>

The query string is ignored when routing to it. It’s
only used for documenting the URL API contract.

BTW, in Windows, filenames containing "?" are [not
permitted](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file),
but since that’s part of the query string, it’s ignored anyway.



### Default (index-like) file
For the default route of a directory, omit the name (just use
the extension). For example, the following files will be routed
to `api/foo` because comments and the query string are ignored.
```text
api/foo/.GET.200.json
api/foo/?bar=[bar].GET.200.json
api/foo/(my comment).GET.200.json
```

## Documenting Contracts (.md)
This is handy for documenting request payload parameters. The dashboard will
print the markdown document (as plain text) above the actual payload content.

Create a markdown file following the same filename convention.
The status code can be any number. For example,
```text
api/foo/[user-id].POST.201.md
api/foo/[user-id].POST.201.json
```

## Transforms (.mjs)
Using the same filename convention, files ending
with `.mjs` will process the mock before serving it.

For example, this handler will capitalize the mock body and increment a counter.
```js
export default function capitalizeAllText(mockAsText, requestBody, config) {
  config.database.myCount ??= 0
  config.database.myCount++
  return mockAsText.toUpperCase()
}
```

---

## API

### `/mockaton/edit` Select a mock for a route
```
PATCH /mockaton/edit
{ 
  "file": "api/foo.200.GET.json"
  "delayed": true // optional
}
```
---

### `/mockaton/bulk-select` Select all mocks that have a particular comment

```
PATCH /mockaton/bulk-select
{
  "comment": "(demo-a)"
}
```
---

### `/mockaton/reset` Reset
Re-Initialize the collection and its states (selected mocks and cookies, delays, etc.).
```
PATCH /mockaton/reset
```
---

### `/mockaton/cookies` Select a cookie
In `Config.cookies`, each key is the label used
for changing it. Only one cookie can be set.
```
PATCH /mockaton/cookies
{
  "current_cookie_key": "My Normal User"
}
```

### `/mockaton/cookies` List Cookies
Sends a list of the available cookies along with a flag indicated if it’s the selected.
```
GET /mockaton/cookies
```

---

### `/mockaton/transform` Select a Transform
```
PATCH /mockaton/transform
{
  "file": "api/video/list(concat newly uploaded).GET.200.mjs"
}
```
---
