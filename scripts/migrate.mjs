// Projection of generic rules only. Catalogue mappings never leave the source tree.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT } from '../src/registry.mjs';
export function migrate(source) {
  const read = name => JSON.parse(fs.readFileSync(path.join(source, name), 'utf8'));
  const legacy = read('rules/brand-rules.json');
  const aliases = read('rules/model-aliases.json').aliases;
  const names = { nvidia:'NVIDIA', amd:'AMD', intel:'Intel', asus:'ASUS', asrock:'ASRock', gigabyte:'GIGABYTE', msi:'MSI', logitech:'Logitech', razer:'Razer', corsair:'Corsair', keychron:'Keychron', steelseries:'SteelSeries', coolermaster:'Cooler Master', cherry:'Cherry', samsung:'Samsung', hyperx:'HyperX', hp:'HP', brother:'Brother', canon:'Canon', epson:'Epson', 'xp-pen':'XP-Pen', wacom:'Wacom', huion:'Huion', synology:'Synology', 'wd-sandisk':'SanDisk', crucial:'Crucial', abko:'ABKO', 'fl-esports':'FL-ESPORTS', aula:'AULA', rapoo:'Rapoo', deck:'Deck', cox:'COX', durgod:'Durgod', lianli:'LIAN-LI', deepcool:'DeepCool', pulsar:'Pulsar', '3dconnexion':'3Dconnexion', epomaker:'Epomaker', micronics:'Micronics', monstargear:'Monstargear', hansung:'Hansung', ecs:'ECS', biostar:'Biostar', maxsun:'Maxsun', dell:'Dell', turtlebeach:'Turtle Beach', sindoh:'Sindoh', tryx:'TRYX', 'hub-only':'Multi-vendor download hubs' };
  const extras = { logitech:['로지텍'], razer:['레이저'], keychron:['키크론'], coolermaster:['쿨러마스터','COOLERMASTER'], samsung:['삼성전자'], hp:['HP'], canon:['캐논'], epson:['엡손'], 'xp-pen':['XPPEN','엑스피펜'], synology:['시놀로지'], hyperx:['하이퍼엑스'], rapoo:['라푸'], 'fl-esports':['FLESPORTS','FL ESPORTS'], monstargear:['몬스타기어'], micronics:['마이크로닉스'], hansung:['한성컴퓨터'], lianli:['LIAN LI','리안리'], 'wd-sandisk':['WD','Western Digital','샌디스크'], crucial:['Micron','마이크론'], steelseries:['스틸시리즈'], abko:['앱코'], aula:['독거미'], 'hub-only':['darkFlash','다크플래시','A4TECH','Bloody','EVGA','Xtrfy','엑스트리파이'] };
  const vendors = new Map();
  for (const rule of legacy.rules) {
    const id = Object.keys(names).sort((a,b) => b.length-a.length).find(k => rule.id === k || rule.id.startsWith(k + '-'));
    if (!id) throw new Error('UNMAPPED_RULE');
    if (!vendors.has(id)) vendors.set(id, { id, name:names[id], aliases:[names[id],...(extras[id] || [])], domains:[], classification:'PUBLIC_SOURCE_ONLY', provenance:[], verified_at:null, noise_tokens:[], model_aliases:[], models:[], rules:[], ecosystems:[] });
    const v = vendors.get(id); v.domains.push(...(rule.allowed_domains || []));
    const projected = { id:rule.id, priority:rule.priority, when:rule.when, action:rule.action === 'fixed_url' ? 'ecosystem' : 'model_page' };
    for (const key of ['allowed_domains','url_patterns','forbid_url_regex','delegated_domains','delegated_evidence_url_patterns','allow_delegated_root']) if (rule[key] !== undefined) projected[key] = rule[key];
    projected.allow_hub = !!rule.allow_generic_hub;
    if (rule.url) {
      const eid = rule.id + '-software'; projected.ecosystem_id = eid;
      v.ecosystems.push({ id:eid, name:rule.id, canonical_page:rule.url, support_mode:'family-rule', rule_id:rule.id, supported_models:[], excluded_models:[], status:'needs-refresh', verified_at:null, provenance:[rule.url], software_kind:'utility' });
      v.provenance.push(rule.url);
    }
    v.rules.push(projected);
  }
  for (const alias of aliases) {
    const v = [...vendors.values()].find(v => v.aliases.some(x => x.toUpperCase() === alias.brand.toUpperCase()));
    if (!v) throw new Error('UNMAPPED_ALIAS');
    // A legacy "confirmed" claim is not independent public compatibility evidence.
    // Withheld: regional equivalence is a compatibility mapping, not established by two model names.
    // Engine supports scoped aliases, but public records require independent manufacturer proof.
  }
  const dir = path.join(ROOT,'data/public/vendors'); fs.mkdirSync(dir,{recursive:true});
  for (const v of vendors.values()) { v.domains = [...new Set(v.domains)].sort(); v.provenance = [...new Set(v.provenance)].sort(); fs.writeFileSync(path.join(dir,v.id+'.json'),JSON.stringify(v,null,2)+'\n'); }
  const passive = read('rules/no-software-patterns.json');
  fs.writeFileSync(path.join(ROOT,'data/public/passive-rules.json'),JSON.stringify({ exclude:passive.exclude.map(r => ({id:r.id,patterns:r.patterns})), exceptions:passive.exceptions.map(r => ({id:r.id,patterns:r.patterns,...(r.applies_to ? {applies_to:r.applies_to} : {})})) },null,2)+'\n');
  const markers = read('rules/brand-markers.json');
  fs.writeFileSync(path.join(ROOT,'data/public/brand-markers.json'),JSON.stringify({ markers:markers.markers.map(m => ({id:m.id,canonical_brand:m.canonical_brand,name_any:m.name_any,...(m.name_all ? {name_all:m.name_all} : {})})) },null,2)+'\n');
  const csv = fs.readFileSync(path.join(source,'data/confirmed-software-urls.csv'));
  const report = { source_version:'2.2.1', source_csv_sha256:crypto.createHash('sha256').update(csv).digest('hex'), source_csv_rows:1549, public_exact_mappings_imported:0, public_rules:legacy.rules.length, alias_hints_held:aliases.length, public_aliases_imported:0, public_ecosystems:[...vendors.values()].reduce((n,v)=>n+v.ecosystems.length,0), held_catalogue_mappings:1549, reason:'Catalogue-to-URL and regional-equivalence mappings have UNKNOWN public redistribution provenance; no raw catalogue identifiers/names/validation logs copied. Generic policy rules projected by explicit field allowlist as generalized error patterns. Public URL facts require independent refresh before fill.' };
  fs.mkdirSync(path.join(ROOT,'reports'),{recursive:true}); fs.writeFileSync(path.join(ROOT,'reports/migration.json'),JSON.stringify(report,null,2)+'\n');
  return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'))) console.log(JSON.stringify(migrate(process.argv[2])));
