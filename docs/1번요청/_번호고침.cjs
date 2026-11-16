const fs = require('fs');
const f = 'docs/1번요청/세종시-직무수행계획서-다듬은판.md';
const s = fs.readFileSync(f, 'utf8').replace(/^([1-6])\. /gm, '​$1. ');
fs.writeFileSync(f, s);
console.log((s.match(/^​[1-6]\. /gm) || []).length);
