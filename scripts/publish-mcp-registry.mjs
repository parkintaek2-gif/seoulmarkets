#!/usr/bin/env node
// Publish SeoulMarkets' remote MCP server to the official MCP Registry (registry.modelcontextprotocol.io)
// using HTTP domain authentication. The public key lives at
// https://seoulmarkets.com/.well-known/mcp-registry-auth ; the private key stays outside the repository.
// Usage: node scripts/publish-mcp-registry.mjs            (dry run: checks the auth file and prints server.json)
//        node scripts/publish-mcp-registry.mjs --publish  (really publishes)
import fs from 'node:fs';
import crypto from 'node:crypto';

const REGISTRY = 'https://registry.modelcontextprotocol.io';
const DOMAIN = 'seoulmarkets.com';
const KEY_PATH = process.env.MCP_REGISTRY_KEY || 'C:/Users/User/.mcp-registry/seoulmarkets-key.pem';
export const server = {
  $schema: 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json',
  name: 'com.seoulmarkets/market-data',
  title: 'SeoulMarkets: Korea, Japan and Taiwan market data',
  description: 'Korean, Japanese and Taiwanese listed-company financials, valuation and filings in English.',
  version: '1.0.0',
  websiteUrl: 'https://seoulmarkets.com/mcp',
  remotes: [{ type: 'streamable-http', url: 'https://seoulmarkets.com/v1/mcp' }],
};

const key = crypto.createPrivateKey(fs.readFileSync(KEY_PATH));
const pub = crypto.createPublicKey(key).export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64');
const expected = 'v=MCPv1; k=ed25519; p=' + pub;
const live = (await (await fetch('https://' + DOMAIN + '/.well-known/mcp-registry-auth')).text()).trim();
console.log('auth file live matches key: ' + (live === expected));
console.log('description length: ' + server.description.length);
if (live !== expected) { console.log('STOP: the live auth file does not match. Deploy first.'); process.exit(1); }
if (!process.argv.includes('--publish')) { console.log(JSON.stringify(server, null, 2)); process.exit(0); }

const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const signed = crypto.sign(null, Buffer.from(timestamp), key).toString('hex');
const a = await fetch(REGISTRY + '/v0/auth/http', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ domain: DOMAIN, timestamp, signed_timestamp: signed }) });
const at = await a.text();
if (!a.ok) { console.log('auth failed ' + a.status + ' ' + at.slice(0, 400)); process.exit(1); }
const token = JSON.parse(at).registry_token;
const p = await fetch(REGISTRY + '/v0/publish', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: JSON.stringify(server) });
console.log('publish ' + p.status + ' ' + (await p.text()).slice(0, 600));
process.exit(p.ok ? 0 : 1);
