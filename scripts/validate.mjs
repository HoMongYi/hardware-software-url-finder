import {scanPublic} from '../src/packaging.mjs';import {validateRegistry,loadRegistry} from '../src/registry.mjs';
const registry=validateRegistry(loadRegistry().vendors),security=scanPublic();console.log(JSON.stringify({registry,security},null,2));if(!registry.valid||security.status!=='Passed')process.exitCode=1;
