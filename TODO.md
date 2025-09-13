# TODO

- Refactor tests
- openapi
  - parsing it for examples?
  - displaying documentation (.openapi)
    - perhaps instead using .js functions `export const doc`
- Preserve focus when refreshing dashboard `init()`
- More real-time updates. Currently, it's only for add/remove mock but not for
  static files and changes from another client (Browser, or Commander). 
- static plugins (content disposition, compression)
- In our syntaxJSON highlighter, after X number of nodes, we stop highlighting so
  it doesn't choke the browser. Think about some virtualized paging, that doesn’t break
  selecting across pages, (e.g. for selecting and copying)
- Document cookies for scraping mocks
- Think about responding to `HEAD` requests, perhaps a flag for auto-generating them


### Cookies WIP
#### Get Cookie Credentials (JS allowed)
The following snippets copy the cookie from a Cloud session into your local dev session.

1. Login on you cloud deployment, and copy the following output in the DevTools Console
   (Right-Click &rarr; "Copy Object")
```js
document.cookie.split(';').map(cookie => cookie.trim().split('='))
```

2. On your local, copy the above output and paste it on the `cookies` constant:

```js
const cookies = <paste>
```

3. Then, paste this:
```js
const cookiesMap = new Map(cookies)

function setCookie(name) {
  const value = cookiesMap.get(name)
  const oneYear = 365 * 24 * 60 * 60 * 1000
  const date = new Date()
  date.setTime(date.getTime() + oneYear)
  document.cookie = name + '=' + value + ';'
    + 'expires=' + date.toUTCString() + ';'
    + 'path=/'
}

// e.g. use the actual cookie names
setCookie('id_token')
setCookie('access_token')
location.reload()
```


#### HTTP only cookies
Copy the Set-Cookie response header, or Cookie Header from the Network tab,.
