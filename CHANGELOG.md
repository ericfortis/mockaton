# Changelog


## 9.0.0 (9/13/25)
- **Breaking change**: Commander GET APIs have been consolidated into `commander.getState()`. These were undocumented APIs, so likely you are not affected.
- `--no-open` new cli flag. Prevents opening dashboard in a browser. (No-ops `config.onReady`)
