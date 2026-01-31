# Bugs
- Minor UX: Dittocache doesn't get cleared, so deleting and adding a mock again will not animate it
- Preview mock payload in store? So it stays when re-rendering?


# Ideas

There’s an implicit question mark on each sentence.

## Auto 500 template
- `config.auto500Template` return { mime, body }
- https://www.rfc-editor.org/rfc/rfc9457.html by default


## Ignored Regex
- `config.ignore` accepts an Array of regexes too
- applies to filename or full path


## Bulk Select UI
- Instead of the current dropdown, a section with buttons (row in the header)
- (Default) ‘’ to api sets all defaults
- maybe an input for partial match

## Chaos
- Malform response
- There's a toolbar dropdown with the current chaos, e.g.:
  - mismatch mime
  - array to objs
  - invalid json
- icon
  <svg width="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="m5.53 1.01v8.352c0 2.903 1.907 5.344 4.542 6.143v5.528c-1.13 0.2864-4.66 1.282-4.674 1.537l-0.016 0.4328h13.14l-0.0161-0.4328c-0.0138-0.2555-3.544-1.251-4.674-1.537v-5.528c2.635-0.7999 4.542-3.241 4.542-6.143v-8.352l-1.745-0.0104-1.954 3.294 2.29 1.323-4.237 7.338 1.548-7.192-2.158-0.426 1.3-4.326z"/>
  </svg>


## Notes (realtime)
- Some note or flag on the dashboard, to indicate when someone
  is using, (multiplayer) ideally, it’s one deployment per user


## More realtime updates
- Currently, it's only for add/remove mock but not for static
  files and changes from another client (Browser, or Commander).


## 500 click-drag
- Debounce preview
- Only update the previewer if that route was being previewed


## Virtualized rendering
Our syntaxJSON highlighter, after X number of nodes, we stop highlighting
so it doesn't choke the browser. Think about some virtualized paging, that
doesn’t break selecting across pages, (e.g., for selecting and copying)

- Large JSON can block interactivity, e.g., a 20,000 syntax highlighted spans take 300ms on an M4 Pro
- Instead of virtual rendering, a simpler progressive chunk attaching, yielding?

## Linux. Open dashboard in browser
- Currently, users can `npm install open`, and Mockaton will use it.
  But it falls back to an implementation that only supports Windows and macOS.
- How does it play with docker?
- We could do this, but it needs to be tested on a few Linux distros.
```js
function _openInBrowser(address) {
  let opener
  switch (process.platform) {
    case 'darwin':
      opener = 'open'
      break
    case 'win32':
      opener = 'start'
      break
    default:
      opener = ['xdg-open', 'gnome-open', 'kde-open'].find(hasCommand)
  }
  if (opener)
    execFileSync(opener, [address])
}

function hasCommand(cmd) {
  const { status } = spawnSync('command', ['-v', cmd], { stdio: 'ignore' })
  return status === 0
}
```

## Fetch logs
- API for streaming logs?

## Browser Extension
- Dark mode

## Plugins for `staticMocks`
- content disposition
- compression
- CSP

## AI
- mock creator (save)
- typescript definition creator

## Iframe Preview
- Iframe to preview rendered HTML

## Static Demo Deployment Image
- Lke [demo-app-vite/Dockerfile](demo-app-vite/Dockerfile)

## Partial Content
- 206 (reject, handle, or send in full?)

## Custom Status Codes
- allowing them?


## In Prod, auth
- Check permission headers

## Vite
- Plugin


## Cookies
### Get Cookie Credentials (JS allowed)

- Document cookies for scraping mocks

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


### HTTP-only cookies
Copy the Set-Cookie response header, or Cookie Header from the Network tab,.



----


# Rejected Ideas

## Allow extensionless in `mocksDir`
- Currently, we have to add .GET.200.json,
- `staticDir` already supports that ^

## .headers
`.headers` extendions add them to the response
Not needed because it can be done with function mocks
