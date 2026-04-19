![NPM Version](https://img.shields.io/npm/v/mockaton)
[![Test](https://github.com/ericfortis/mockaton/actions/workflows/test.yml/badge.svg)](https://github.com/ericfortis/mockaton/actions/workflows/test.yml)
[![codecov](https://codecov.io/github/ericfortis/mockaton/graph/badge.svg?token=90NYLMMG1J)](https://codecov.io/github/ericfortis/mockaton)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## [Docs ↗](https://mockaton.com) | [Changelog ↗](https://mockaton.com/changelog)

Mockaton is an HTTP mock server for simulating APIs, designed
for testing difficult to reproduce backend states with minimal setup.

<picture>
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/ericfortis/mockaton/refs/heads/main/pixaton-tests/tests/macos/pic-for-readme.vp762x762.light.gold.png">
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/ericfortis/mockaton/refs/heads/main/pixaton-tests/tests/macos/pic-for-readme.vp762x762.dark.gold.png">
  <img alt="Mockaton Dashboard" src="https://raw.githubusercontent.com/ericfortis/mockaton/refs/heads/main/pixaton-tests/tests/macos/pic-for-readme.vp762x762.dark.gold.png">
</picture>


## Demo (Docker)
This will spin up Mockaton with the [sample directory](./mockaton-mocks)
included in this repo mounted on the container.

```sh
git clone https://github.com/ericfortis/mockaton.git --depth 1
cd mockaton
make docker
```
Test it:
```sh
curl localhost:2020/api/user
```
Dashboard: [localhost:2020/mockaton](http://localhost:2020/mockaton)


## Basic Usage
```sh
npx mockaton my-mocks-dir/
```

Mockaton will serve the files on the given directory. It’s a file-system
based router, so filenames can have dynamic parameters and comments.
Also, each route can have different mock file variants.


| Route | Filename | Description |
| -----| -----| ---|
| /api/company/123 | api/company/[id].GET.200.json | `[id]` is a dynamic parameter |
| /media/avatar.png | media/avatar.png | Statics assets don’t need the above extension |
| /api/login | api/login(invalid attempt).POST.401.json | Anything within parenthesis is a **comment**, they are ignored when routing |
| /api/login | api/login(default).GET.200.json | `(default)` is a special comment; otherwise, the first mock variant in alphabetical order wins  |
| /api/login | api/login(locked out user).POST.423.ts | TypeScript or JavaScript mocks are sent as JSON by default |

[Config Docs](https://mockaton.com/config)


## How to control Mockaton?
Besides the dashboard, there’s a [Programmatic API](https://mockaton.com/api).


## How to scrape responses from a backend?
There’s a [Browser Extension](https://mockaton.com/scraping) for scraping responses from your backend.


## How to create mocks?

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
