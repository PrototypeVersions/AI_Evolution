// Explicit user-run publisher. Experimental agents never receive Git credentials.
import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const cwd=fileURLToPath(new URL('../',import.meta.url));
const report=JSON.parse(await readFile(new URL('../data/published.json',import.meta.url),'utf8'));
function git(args){const p=spawnSync('git',args,{cwd,stdio:'inherit'});if(p.status!==0)process.exit(p.status||1);}
git(['add','--','data/published.json']);
const check=spawnSync('git',['diff','--cached','--quiet','--','data/published.json'],{cwd});
if(check.status===0){console.log('No new public results.');process.exit(0);}
git(['commit','--only','-m',`Publish research summary ${report.id}`,'--','data/published.json']);
git(['push']);
