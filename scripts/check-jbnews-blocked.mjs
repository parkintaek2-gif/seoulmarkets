#!/usr/bin/env node
/**
 * check-jbnews-blocked.mjs — ASCII relay for 잰다-중부매일-아이피막혔나.mjs
 *
 * WHY THIS FILE EXISTS
 *   cmd.exe mangles Korean filenames to CP949, so a scheduled .cmd wrapper cannot
 *   call a script whose name is in Korean. ESM import does not go through cmd,
 *   so this ASCII relay loads it with a file:// URL and the real script runs.
 *   Arguments (--알린다, --자가시험) pass through untouched: process.argv is shared.
 *
 * Usage (same flags as the real script):
 *   node scripts/check-jbnews-blocked.mjs --자가시험
 *   node scripts/check-jbnews-blocked.mjs --알린다
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(path.join(여기, '잰다-중부매일-아이피막혔나.mjs')).href);
