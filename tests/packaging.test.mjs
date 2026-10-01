import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {buildRelease,validatePlugin,scanPublic,publicFiles} from '../src/packaging.mjs';import{ROOT}from'../src/registry.mjs';
test('release allowlist never includes source bundles, private overlays or local caches',()=>{
 const files=publicFiles();assert.ok(files.length>80);assert.ok(files.every(p=>!p.includes('node_modules')&&!p.includes('data/private')&&!p.includes('.cache')&&!p.includes('baseline/')&&!p.includes('HANDOFF')));assert.equal(scanPublic().status,'Passed');
});
test('canonical Skill generates portable Plugin and official schema-valid MCP config',()=>{
 const r=buildRelease();assert.equal(r.plugin.status,'Passed');const plugin=path.join(ROOT,'dist/hsuf-codex-plugin-v0.1.0');assert.equal(validatePlugin(plugin).status,'Passed');
 assert.equal(fs.readFileSync(path.join(plugin,'skills/hardware-software-url-finder/SKILL.md'),'utf8'),fs.readFileSync(path.join(ROOT,'skills/hardware-software-url-finder/SKILL.md'),'utf8'));
 assert.equal(r.artifacts.length,3);assert.ok(r.artifacts.every(a=>a.bytes>1000&&a.sha256.length===64));
});
test('public package metadata reflects MIT approval and the target repository',()=>{
 const p=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json')));assert.equal(p.private,undefined);assert.equal(p.license,'MIT');assert.equal(p.name,'hardware-software-url-finder');assert.equal(p.version,'0.1.0');
 assert.equal(p.repository.url,'git+https://github.com/HoMongYi/hardware-software-url-finder.git');assert.equal(p.homepage,'https://github.com/HoMongYi/hardware-software-url-finder#readme');assert.equal(p.bugs.url,'https://github.com/HoMongYi/hardware-software-url-finder/issues');
 const license=fs.readFileSync(path.join(ROOT,'LICENSE'),'utf8');assert.match(license,/MIT License/);assert.match(license,/Copyright \(c\) 2026 HoMongYi/);assert.ok(publicFiles().includes('LICENSE'));assert.ok(publicFiles().includes('CONTRIBUTING.md'));
});
test('Source ZIP is flat and all three ZIP packages carry the approved MIT license',()=>{
 const release=buildRelease();assert.equal(release.license,'MIT');
 function zipFiles(name){const b=fs.readFileSync(path.join(ROOT,'dist',name));const files=new Map();let offset=0;while(b.readUInt32LE(offset)===0x04034b50){const size=b.readUInt32LE(offset+18),nameSize=b.readUInt16LE(offset+26),extra=b.readUInt16LE(offset+28);const filename=b.subarray(offset+30,offset+30+nameSize).toString();const start=offset+30+nameSize+extra;files.set(filename,b.subarray(start,start+size));offset=start+size;}return files;}
 const source=zipFiles('hardware-software-url-finder-v0.1.0-source.zip');assert.ok(source.has('package.json'));assert.ok(source.has('README.md'));assert.ok(source.has('LICENSE'));assert.ok([...source.keys()].every(p=>!p.startsWith('hardware-software-url-finder/')));
 const license=fs.readFileSync(path.join(ROOT,'LICENSE'));const skill=zipFiles('hsuf-agent-skill-v0.1.0.zip');assert.ok(skill.get('hardware-software-url-finder/LICENSE')?.equals(license));
 const plugin=zipFiles('hsuf-codex-plugin-v0.1.0.zip');assert.ok(plugin.get('hardware-software-url-finder/LICENSE')?.equals(license));assert.ok(plugin.get('hardware-software-url-finder/runtime/LICENSE')?.equals(license));
});
