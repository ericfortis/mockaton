# Mockaton

An HTTP mock server for simulating APIs with minimal setup &mdash; ideal
for testing difficult to reproduce backend states.

![NPM Version](https://img.shields.io/npm/v/mockaton)
[![Test](https://github.com/ericfortis/mockaton/actions/workflows/test.yml/badge.svg)](https://github.com/ericfortis/mockaton/actions/workflows/test.yml)
[![codecov](https://codecov.io/github/ericfortis/mockaton/graph/badge.svg?token=90NYLMMG1J)](https://codecov.io/github/ericfortis/mockaton)


## [Documentation ↗](https://mockaton.com) | [Changelog ↗](https://mockaton.com/changelog)

## TL;DR
```shell
npx mockaton my-mocks-dir
```

It’s like `servedir`, but supports dynamic segments in filenames. For example:

**Route**: [/api/company/123](#) <br/>
**File**: my-mocks-dir/api/company/[id].GET.200.json

Statics assets don’t need that extension:

**Route**: [/media/avatar.png](#) <br/>
**File**: my-mocks-dir/media/avatar.png


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


## Examples
[/api/company/123](#)

<code>my_mocks_dir/<b>api/company/[id]</b>.GET.200.json</code>
```json
{
  "name": "Acme, Inc."
}
```

<br/>

Or, you can write it in TypeScript (it will be sent as JSON).

<code>my_mocks_dir/<b>api/company/[id]</b>.GET.200.ts</code>
```ts
export default {
  name: 'Acme, Inc.'
}
```

<br/>

Similarly, you can handle logic with [Functional Mocks](https://mockaton.com/functional-mocks):

<code>my_mocks_dir/<b>api/company/[companyId]/user/[userId]</b>.GET.200.ts</code>
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
