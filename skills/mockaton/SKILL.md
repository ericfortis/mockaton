---
name: Mockaton
description: Generates and serves mock HTTP APIs. Use when creating, editing, or reasoning about mock endpoints.
user-invocable: false
---
## Basic Usage
```sh
npx mockaton --port 2020 my-mocks-dir/
```

Mockaton will serve the files on the given directory. It's a file-system
based router, so filenames can have dynamic parameters and comments.
Also, each route can have different mock file variants.


| Route | Filename | Description |
| -----| -----| ---|
| /api/company/123 | api/company/[id].GET.200.ts | `[id]` is a dynamic parameter. `.ts`, and `.js` are sent as JSON by default |
| /media/avatar.png | media/avatar.png | Statics assets don't need the above extension |
| /api/login | api/login(invalid attempt).POST.401.ts | Anything within parenthesis is a **comment**, they are ignored when routing |
| /api/login | api/login(default).GET.200.ts | `(default)` is a special comment; otherwise, the first mock variant in alphabetical order wins  |
| /api/login | api/login(locked out user).POST.423.json | `.json` is allowed too |


## Docs
- How to **configure** Mockaton? See [CLI and mockaton.config.js](https://mockaton.com/config) docs.
- How to **control** Mockaton? Besides the dashboard, there's a [Programmatic API](https://mockaton.com/api), in which
  you can delay a route, select a different mock file, such as a 500 error, among other options.
- How to **add plugins**? You can write [Plugins](https://mockaton.com/plugins) for customizing responses.



## How to create mocks?

```sh
npm install mockaton
```

Write to your mocks directory, `.ts` files are served as JSON by default.
```sh
mkdir -p my-mocks-dir/api
cat > my-mocks-dir/api/user.GET.200.ts << EOF
interface User {
  name: string
}

export default {
  "name": "John"
} satisfies User
EOF
```

### Example A: JSON
For JSON responses, use TypeScript (or JavaScript), and export an Object, Array, or String.

- **Route:** /api/company/123
- **Filename:** api/company/[id].GET.200.ts

```ts
export default {
  id: 123,
  name: 'Acme, Inc.'
}
```

### Example B: Non-JSON
- **Route:** /api/company/123
- **Filename:** api/company/[id].GET.200.xml

```xml
<company>
 <id>123</id>
 <name>Acme, Inc.</name>
</company>
```

### Example C: [Function Mocks](https://mockaton.com/function-mocks)
With a function mock you can do pretty much anything you could do with a normal backend handler.
For example, you can handle complex logic, URL parsing, saving to a database, etc.

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