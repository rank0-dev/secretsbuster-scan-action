# SecretsBuster Scan Action

Protect your website by scanning it for leaked secrets using the [SecretsBuster API](https://secretsbuster.com/).

SecretsBuster scans JavaScript files, network requests and many more resources to detect sensitive information, API keys, and credentials.

## Prerequisites

This action requires a SecretsBuster account and API key:

1. Visit [the subscription page](https://secretsbuster.com/account/subscribe) to create an account (if you don't have one).
2. Visit [the account management page](https://secretsbuster.com/account/manage) to retrieve or regenerate your API key.
3. Add your API key as a repository action secret named `SB_API_KEY` (Repository → Settings → Secrets and variables → Actions).

## Inputs

| Input         | Description                     | Required             |
| ------------- | ------------------------------- | -------------------- |
| `sb-api-key`  | SecretsBuster API key           | Yes                  |
| `targets`     | URLs to scan (one per line)     | Yes                  |
| `errorOnLeak` | Leaky target makes action error | No (default `false`) |

Notes:

- `targets` accepts multiple URLs separated by newlines.
- Invalid URLs are logged as warnings and treated as `ERROR` in the results (this will cause the action to fail).

## Outputs

| Output         | Description                                |
| -------------- | ------------------------------------------ |
| `scan-results` | JSON array of scan results for each target |

## Usage

```yaml
name: SecretsBuster Scan

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - name: Run SecretsBuster scanner
        uses: rank0-dev/secretsbuster-scan-action@v1
        with:
          sb-api-key: ${{ secrets.SB_API_KEY }}
          targets: |
            https://example.com
            https://leaky-example.com
          errorOnLeak: true
```

## Outputs Example

The `scan-results` output contains a JSON array with scan details for each target. Each entry includes:

- `url` — the scanned URL
- `scanResult` — `SAFE`, `LEAKY`, or `ERROR`
- `reportPublicId` — SecretsBuster report id (when available)

Example:

```json
[
  {
    "url": "https://example.com",
    "scanResult": "SAFE",
    "reportPublicId": "432fa629-899a-42ed-9714-cb9878ec2ae7"
  },
  {
    "url": "https://leaky-example.com",
    "scanResult": "LEAKY",
    "reportPublicId": "b130c67f-8c2b-4c66-97a6-78e5d20b5a3b"
  }
]
```

Possible `scanResult` values:

- `SAFE` — No secrets detected
- `LEAKY` — Secrets were found
- `ERROR` — Scan failed or the target was invalid

Using `reportPublicId` and the SecretsBuster report detail endpoint you can retrieve full details about a leak or an error: https://secretsbuster.com/doc/api#/paths/reports-publicId/get

## Action Behavior

- The action fails if any target returns `ERROR`.
- If `errorOnLeak` is set to `true`, the action fails if any target returns `LEAKY`.
- Invalid targets are logged as warnings and recorded as `ERROR` in the results (this will fail the action).
- Scans are polled every 15 seconds until they reach `CRAWLED` or `ERROR`.

## Local run

```bash
npx @github/local-action . src/main.ts .env
```

## License

[MIT](./LICENSE)

## Support

For issues with this action, open a GitHub issue in this repository.

For issues with the SecretsBuster API, contact SecretsBuster support: https://secretsbuster.com/about#contact
