#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const candidates=[...(process.env.HSUF_HOME?[path.join(process.env.HSUF_HOME,'bin/hsuf.mjs')]:[]),path.resolve(here,'../../../runtime/bin/hsuf.mjs'),path.resolve(here,'../../../bin/hsuf.mjs')];
const entry=candidates.find(p=>fs.existsSync(p));
if(!entry){process.stderr.write('Set HSUF_HOME to the installed HSUF project directory.\n');process.exitCode=2;}else{const{main}=await import(pathToFileURL(entry).href);await main(process.argv.slice(2));}
