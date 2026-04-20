---
name: Mockaton
description: Generates and serves mock HTTP APIs from filesystem conventions. Use when creating, editing, or reasoning about mock endpoints.
---

## Basic Usage
```sh
npx mockaton my-mocks-dir/
```

Mockaton will serve the files on the given directory. It's a file-system
based router, so filenames can have dynamic parameters and comments.
Also, each route can have different mock file variants.


| Route | Filename | Description |
| -----| -----| ---|
| /api/company/123 | api/company/[id].GET.200.json | `[id]` is a dynamic parameter |
| /media/avatar.png | media/avatar.png | Statics assets don't need the above extension |
| /api/login | api/login(invalid attempt).POST.401.json | Anything within parenthesis is a **comment**, they are ignored when routing |
| /api/login | api/login(default).GET.200.json | `(default)` is a special comment; otherwise, the first mock variant in alphabetical order wins  |
| /api/login | api/login(locked out user).POST.423.ts | TypeScript or JavaScript mocks are sent as JSON by default |


## Docs
- How to **configure** Mockaton? See [CLI and mockaton.config.js](https://mockaton.com/config) docs.
- How to **control** Mockaton? Besides the dashboard, there's a [Programmatic API](https://mockaton.com/api).
- How to **add plugins**? You can write [Plugins](https://mockaton.com/plugins) for customizing responses.



## How to create mocks?

Write to your mocks directory. Alternatively, there's an API [PATCH /mockaton/write-mock](https://mockaton.com/api).
```sh
mkdir -p my-mocks-dir/api
echo '{ "name": "John" }' > my-mocks-dir/api/user.GET.200.json
sleep 0.1 # Wait for the watcher to register it
```

### Example A: JSON
- **Route:** /api/company/123
- **Filename:** api/company/[id].GET.200.json

```json
{
  "name": "Acme, Inc."
}
```

### Example B: TypeScript or JavaScript
Exporting an Object, Array, or String is sent as JSON.

- **Route:** /api/company/abc
- **Filename:** api/company/[id].GET.200.ts

```ts
export default {
  name: 'Acme, Inc.'
}
```

### Example C: [Function Mocks](https://mockaton.com/function-mocks)
With a function mock you can do pretty much anything you could do with a normal backend handler.</p>
For example, you can handle complex logic, URL parsing, saving toa database, etc.

- **Route:** /api/company/abc/user/999
- **Filename:** api/company/[companyId]/user/[userId].GET.200.ts

```ts
import { IncomingMessage, OutgoingMessage } from 'node:http'
import { parseSegments } from 'mockaton'

export default async function (req: IncomingMessage, response: OutgoingMessage) {
  const { companyId, userId } = parseSegments(req.url, import.meta.filename)
  const foo = await getFoo()
  return JSON.stringify({
    foo,
    companyId,
    userId,
    name: 'Acme, Inc.'
  })
}
```