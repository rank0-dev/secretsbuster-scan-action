import * as core from '@actions/core'
import { getScanResult, postNewScan, SbApiV1NewScanResponse, ScanResult, ScanState } from './sb-api-v1-client.js'


const WAIT_BETWEEN_POLLING_MS = 15000
const SCAN_REPORT_POLLING_TIMEOUT_MS = 3 * 60 * 1000 // 3 minutes


export async function run(): Promise<void> {
  try {
    const sbApiKey = core.getInput('sb-api-key', { required: true })
    const targets = core.getMultilineInput('targets', { required: true })
    const errorOnLeak = core.getBooleanInput('errorOnLeak', { required: false })
    core.info(`Start scanning...`)
    const scanResultSummaries = await Promise.all(targets.map((target) => getTargetScanResultSummary(sbApiKey, target.trim())))
    logActionResults(scanResultSummaries, errorOnLeak)
    core.info(
      `Get your reports using our API and report public ID provided in this action output, see documentation at https://secretsbuster.com/doc/api#/paths/reports-publicId/get`,
    );
    core.setOutput('scan-results', JSON.stringify(scanResultSummaries))
  } catch (error) {
    core.error(`Error while scanning target(s): ${error}.`)
    core.debug(`Error was ${JSON.stringify(error)}`)
    if (error instanceof Error) core.setFailed(error.message)
  }
}

async function getTargetScanResultSummary(sbApiKey: string, url: string): Promise<ScanResultSummary> {
  // Check URL validity
  let targetUrl: URL
  try {
    targetUrl = new URL(url)
  } catch {
    core.warning(`Invalid target URL ${url}, skipping...`)
    return {
      url: url,
      scanResult: ScanResult.ERROR
    }
  }
  // Get scan report and build summary
  let scanResultSummary
  try {
    const scanResponse = await getTargetReport(sbApiKey, targetUrl)
    scanResultSummary = {
      url: url,
      scanResult: scanResponse.scanResult!,
      reportPublicId: scanResponse.publicId
    }
  } catch (error) {
    core.warning(`Error while scanning ${url}: ${error}`)
    scanResultSummary = {
      url: url,
      scanResult: ScanResult.ERROR
    }
  }
  logScanResult(scanResultSummary)
  return scanResultSummary
}

async function getTargetReport(sbApiKey: string, url: URL): Promise<SbApiV1NewScanResponse> {
  const scanStartTime = new Date().getTime()
  let newReport = await postNewScan(sbApiKey, url)
  let scanDuration = 0
  while (
    scanDuration < SCAN_REPORT_POLLING_TIMEOUT_MS &&
    (newReport.state !== ScanState.CRAWLED) &&
    (newReport.state !== ScanState.ERROR)) {
    core.info(
      `Scanning ${url.toString()} for ${scanDuration / 1000}s, current scan state is '${newReport.state}'. Waiting ${WAIT_BETWEEN_POLLING_MS / 1000} seconds before checking again...`,
    );
    await new Promise((f) => setTimeout(f, WAIT_BETWEEN_POLLING_MS))
    newReport = await getScanResult(sbApiKey, newReport.publicId)
    scanDuration = new Date().getTime() - scanStartTime
  }
  return newReport
}

function logScanResult(scanResultSummary: ScanResultSummary): void {
  switch (scanResultSummary.scanResult) {
    case ScanResult.SAFE:
      core.info(`Target ${scanResultSummary.url} is '${scanResultSummary.scanResult}'`)
      break
    case ScanResult.LEAKY:
      core.warning(
        `Target ${scanResultSummary.url} is '${scanResultSummary.scanResult}', use our API with this report public ID '${scanResultSummary.reportPublicId}' to get full details.`
      )
      break
    case ScanResult.ERROR:
      core.warning(
        `We can't scan ${scanResultSummary.url}, use our API with this report public ID '${scanResultSummary.reportPublicId}' to get full details.`
      )
      break
  }
}

function logActionResults(scanResultSummaries: ScanResultSummary[], errorOnLeak?: boolean): void {
  const hasErrors = scanResultSummaries.some((report) => report.scanResult === ScanResult.ERROR)
  const hasLeaks = scanResultSummaries.some((report) => report.scanResult === ScanResult.LEAKY)
  if (hasErrors) {
    core.setFailed(
      "One or more scans can't be completed. Use our API or dashboard to view full scan reports, using report publicId provided in this action output."
    )
  } else if (hasLeaks && errorOnLeak) {
    core.setFailed(
      'One or more scans detected secrets. Use our API or dashboard to view full scan reports, using report publicId provided in this action output.'
    )
  } else {
    core.info('All scans completed successfully.')
  }
}

interface ScanResultSummary {
  url: string
  scanResult: ScanResult
  reportPublicId?: string
}
