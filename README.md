# Mockaton

An HTTP mock server for simulating APIs with minimal setup &mdash; ideal
for testing difficult to reproduce backend states.

![NPM Version](https://img.shields.io/npm/v/mockaton)
[![Test](https://github.com/ericfortis/mockaton/actions/workflows/test.yml/badge.svg)](https://github.com/ericfortis/mockaton/actions/workflows/test.yml)
[![codecov](https://codecov.io/github/ericfortis/mockaton/graph/badge.svg?token=90NYLMMG1J)](https://codecov.io/github/ericfortis/mockaton)


## [Documentation ↗](https://mockaton.com) | [Changelog ↗](https://mockaton.com/changelog)

## Overview
With Mockaton, you don’t need to write code for wiring up your
mocks. Instead, a given directory is scanned for filenames
following a convention similar to the URLs.

For example, for [/api/company/123](#), the filename could be:

<pre>
<code>my-mocks-dir/<b>api/company</b>/[id].GET.200.json</code>
</pre>


## Dashboard

<picture>
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/ericfortis/mockaton/refs/heads/main/pixaton-tests/tests/macos/pic-for-readme.vp762x762.light.gold.png">
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/ericfortis/mockaton/refs/heads/main/pixaton-tests/tests/macos/pic-for-readme.vp762x762.dark.gold.png">
  <img alt="Mockaton Dashboard" src="https://raw.githubusercontent.com/ericfortis/mockaton/refs/heads/main/pixaton-tests/tests/macos/pic-for-readme.vp762x762.dark.gold.png">
</picture>

<br/>


## Quick Start (Docker)
This will spin up Mockaton with the sample directories
included in this repo mounted on the container. Mentioned dirs are: [mockaton-mocks/](./mockaton-mocks)
and [mockaton-static-mocks/](./mockaton-static-mocks).

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
