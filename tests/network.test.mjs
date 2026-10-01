import test from 'node:test';import assert from 'node:assert/strict';
import { publicAddress, safeUrl, guardUrl, safeRequest, stripTracking, hostAllowed } from '../src/network.mjs';
for(const ip of ['127.0.0.1','10.0.0.1','172.16.0.1','192.168.1.1','169.254.169.254','0.0.0.0','100.64.0.1','224.0.0.1','::1','fc00::1','fe80::1','::ffff:127.0.0.1'])test(`SSRF rejects ${ip}`,()=>assert.equal(publicAddress(ip),false));
test('public addresses accepted',()=>{assert.equal(publicAddress('8.8.8.8'),true);assert.equal(publicAddress('2606:4700:4700::1111'),true);});
for(const url of ['file:///etc/passwd','http://localhost/','http://127.1/','http://2130706433/','http://user:pass@example.com/','http://example.com:8080/','http://metadata.google.internal/'])test(`unsafe scheme/host rejected ${url.replace('user:pass@','')}`,()=>assert.throws(()=>safeUrl(url)));
test('DNS mixed public and private answer is blocked',async()=>assert.rejects(guardUrl('https://example.com/',async()=>[{address:'8.8.8.8',family:4},{address:'10.0.0.1',family:4}]),/SSRF_DNS/));
test('every redirect DNS is checked before connecting',async()=>{
 let requests=0;const resolver=async h=>[{address:h==='example.com'?'8.8.8.8':'127.0.0.1',family:4}];
 await assert.rejects(safeRequest('https://example.com/',{resolver,transport:async()=>{requests++;return{status:302,headers:{location:'https://evil.com/'},text:''};}}),/SSRF_DNS/);assert.equal(requests,1);
});
test('DNS pinning passes validated records to transport',async()=>{
 let dnsCalls=0;await safeRequest('https://example.com/',{resolver:async()=>{dnsCalls++;return[{address:'8.8.8.8',family:4}];},transport:async(_u,records)=>{assert.equal(records[0].address,'8.8.8.8');return{status:200,text:'ok',headers:{}};}});assert.equal(dnsCalls,1);
});
test('response overflow blocked',async()=>assert.rejects(safeRequest('https://example.com/',{maxBytes:10,resolver:async()=>[{address:'8.8.8.8',family:4}],transport:async()=>({status:200,text:'X'.repeat(11)})}),/TOO_LARGE/));
test('tracking removed but functional queries retained',()=>assert.equal(stripTracking('https://example.com/support?model=ABC&utm_source=x&srsltid=x&gclid=x&code=2#dl'),'https://example.com/support?model=ABC&code=2#dl'));
test('domain matching never grants parent or suffix attack',()=>{assert.equal(hostAllowed('example.com',['support.example.com']),false);assert.equal(hostAllowed('example.com.evil.com',['example.com']),false);});
