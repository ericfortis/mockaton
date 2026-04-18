# Mockaton

An HTTP mock server for simulating APIs with minimal setup &mdash; ideal
for testing difficult to reproduce backend states.

![NPM Version](https://img.shields.io/npm/v/mockaton)
[![Test](https://github.com/ericfortis/mockaton/actions/workflows/test.yml/badge.svg)](https://github.com/ericfortis/mockaton/actions/workflows/test.yml)
[![codecov](https://codecov.io/github/ericfortis/mockaton/graph/badge.svg?token=90NYLMMG1J)](https://codecov.io/github/ericfortis/mockaton)


## [Documentation ↗](https://mockaton.com) | [Changelog ↗](https://mockaton.com/changelog)

## Basic Usage
```shell
npx mockaton my-mocks-dir/
```

Mockaton is like a `servedir` or `python -m http.server` command, but in addition it supports dynamic parameters and
each route can have different mock variants, either by using comments or different status code in the filename.


| Route | File | Description |
| -----| -----| ---|
| /api/company/123 | my-mocks-dir/api/company/[id].GET.200.json | `[id]` is a dynamic parameter |
| /media/avatar.png | my-mocks-dir/media/avatar.png | Statics assets don’t need the above extension |
| /api/user | my-mocks-dir/api/user(demo-part1).GET.200.ts | Anything within parenthesis is a comment, they are ignored when routing |
| /api/user | my-mocks-dir/api/user(default).GET.200.ts | `(default)` is a special comment; otherwise, the first other mock variant in alphabetical order wins  |



## Dashboard
Besides the dashboard, there’s a programmatic [Control API](https://mockaton.com/api).
Also, there’s a [Browser Extension](https://mockaton.com/scraping) for scraping responses from your backend.

<picture>
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/ericfortis/mockaton/refs/heads/main/pixaton-tests/tests/macos/pic-for-readme.vp762x762.light.gold.png">
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/ericfortis/mockaton/refs/heads/main/pixaton-tests/tests/macos/pic-for-readme.vp762x762.dark.gold.png">
  <img alt="Mockaton Dashboard" src="https://raw.githubusercontent.com/ericfortis/mockaton/refs/heads/main/pixaton-tests/tests/macos/pic-for-readme.vp762x762.dark.gold.png">
</picture>

<br/>


## Quick Start (Docker)
This will spin up Mockaton with the sample directory
included in this repo mounted on the container. Mentioned dir is: [mockaton-mocks/](./mockaton-mocks).

```sh
git clone https://github.com/ericfortis/mockaton.git --depth 1
cd mockaton
make docker
```
Dashboard: [localhost:2020/mockaton](http://localhost:2020/mockaton)

Test it:
```shell
curl localhost:2020/api/user
```


## How to create mocks?

### Example A (JSON)
- **Route:** /api/company/123
- **Filename:** mocks-dir/api/company/[id].GET.200.json

```json
{
  "name": "Acme, Inc."
}
```

### Example B (TypeScript or JavaScript)
Exporting an Object, Array, or String is sent as JSON.

- **Route:** /api/company/abc
- **Filename:** mocks-dir/api/company/[id].GET.200.ts

```ts
export default {
  name: 'Acme, Inc.'
}
```

### Example C (Function Mocks)

- **Route:** /api/company/abc/user/999
- **Filename:** mocks-dir/api/company/[companyId]/user/[userId].GET.200.ts

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
