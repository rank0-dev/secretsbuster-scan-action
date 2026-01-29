import { HttpClient, Headers } from '@actions/http-client'
import { UUID } from 'crypto'
import actionPackageJson from '../package.json' with { type: 'json' }

const SB_API_BASE_URL = 'https://api.secretsbuster.com'
const SB_API_V1_REPORT_ENDPOINT = '/v1/reports'
const NEW_SCAN_ENDPOINT_URL = new URL(SB_API_V1_REPORT_ENDPOINT, SB_API_BASE_URL)
const API_KEY_HEADER = 'x-api-key'
const JSON_CONTENT_TYPE = 'application/json'

const clientUa = `${actionPackageJson.name}/${actionPackageJson.version}`

export async function postNewScan(sbApiKey: string, targetUrl: URL): Promise<SbApiV1NewScanResponse> {
  const client = buildSbApiClient(sbApiKey)
  const requestBody: SbApiV1NewScanRequest = {
    url: targetUrl.toString()
  }
  // errors (4xx, 5xx) reject the promise
  const scanResponse = await client.postJson<SbApiV1NewScanResponse>(NEW_SCAN_ENDPOINT_URL.toString(), requestBody)
  return scanResponse.result!
}

export async function getScanResult(sbApiKey: string, scanPublicId: UUID): Promise<SbApiV1NewScanResponse> {
  const client = buildSbApiClient(sbApiKey)
  const reportUrl = new URL(`${SB_API_V1_REPORT_ENDPOINT}/${scanPublicId}`, SB_API_BASE_URL)

  // errors (4xx, 5xx) reject the promise
  const scanResponse = await client.getJson<SbApiV1NewScanResponse>(reportUrl.toString())
  return scanResponse.result!
}

function buildSbApiClient(sbApiKey: string): HttpClient {
  const client = new HttpClient(clientUa)
  client.requestOptions = {
    headers: {
      [Headers.Accept]: JSON_CONTENT_TYPE,
      [Headers.ContentType]: JSON_CONTENT_TYPE,
      [API_KEY_HEADER]: sbApiKey
    }
  }
  return client
}

export interface SbApiV1NewScanRequest {
  url: string
}

export interface SbApiV1NewScanResponse {
  publicId: UUID
  url: string
  state: ScanState
  submittedAt: Date
  startedAt?: Date
  crawledAt?: Date
  scanResult?: ScanResult
  documentCount?: number
  secrets?: MatchReport[]
  error?: string
  targetDocumentError?: string
}

export enum ScanState {
  QUEUED = 'QUEUED',
  CRAWLING = 'CRAWLING',
  CRAWLED = 'CRAWLED',
  ERROR = 'ERROR'
}

export enum ScanResult {
  LEAKY = 'LEAKY',
  SAFE = 'SAFE',
  ERROR = 'ERROR'
}

export interface MatchReport {
  documentUrl: string
  error: string
  matchResults: MatchResult[]
}

export interface MatchResult {
  secretType: string
  secretValues: Map<string, number>
}
