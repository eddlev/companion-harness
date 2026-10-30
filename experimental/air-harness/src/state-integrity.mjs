import { createHash } from 'node:crypto';
// Experimental only: no BinLing VM claims, authenticated origin, or transferred authority.
export const STATE_ENVELOPE_VERSION='AIR_HARNESS_STATE_ENVELOPE_V0_2';
export const EXTERNAL_ADAPTER_VERSION='AIR_BINLING_STATE_ADAPTER_V0_1';
export const HANDOFF_VERSION='AIR_HARNESS_PORTABLE_STATE_V0_1';
const DEV='LOCAL_JSON_SHA256_DEV_V0_1', EXT='EXTERNAL_BINLING_ADAPTER_V0_1';
export class StateIntegrityError extends Error {
  constructor(code,message){super(message);this.code=code;this.name='StateIntegrityError'}
}
function fail(code,msg){throw new StateIntegrityError(code,msg)}
function plain(x){
  if(!x||typeof x!=='object'||Array.isArray(x)||![Object.prototype,null].includes(Object.getPrototypeOf(x)))fail('INVALID_JSON','Expected plain object');
  if(Object.getOwnPropertySymbols(x).length||Object.values(Object.getOwnPropertyDescriptors(x)).some(d=>!Object.hasOwn(d,'value')))fail('INVALID_JSON','Unsafe property');
  return x;
}
function keys(x,expected){
  plain(x);
  const a=Object.keys(x).sort(),b=[...expected].sort();
  if(a.length!==b.length||a.some((v,i)=>v!==b[i]))fail('UNEXPECTED_FIELD','Field set mismatch');
  return x;
}
function nonblank(v){if(typeof v!=='string'||!v.trim())fail('INVALID_FIELD','Expected nonblank string')}
function canonical(x,seen=new Set()){
  if(x===null)return 'null';
  if(typeof x==='string'||typeof x==='boolean')return JSON.stringify(x);
  if(typeof x==='number'){
    if(!Number.isFinite(x)||(Number.isInteger(x)&&!Number.isSafeInteger(x)))fail('INVALID_JSON','Invalid number');
    return JSON.stringify(x);
  }
  if(typeof x!=='object'||seen.has(x))fail('INVALID_JSON','Unsupported or cyclic');
  seen.add(x);
  try{
    if(Array.isArray(x)){
      const k=Object.keys(x);
      if(Object.getOwnPropertySymbols(x).length||k.length!==x.length||k.some(v=>!/^(0|[1-9]\d*)$/.test(v)||Number(v)>=x.length))fail('INVALID_JSON','Sparse or extended array');
      return '['+x.map(v=>canonical(v,seen)).join(',')+']';
    }
    plain(x);
    return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k],seen)).join(',')+'}';
  }finally{seen.delete(x)}
}
const clone=x=>JSON.parse(canonical(x));
export const devFingerprint=x=>'devsha256:'+createHash('sha256').update(canonical(x),'utf8').digest('hex');
export function validatePortableHandoff(input){
  const h=keys(input,['schema_version','project_id','task','evidence_refs','authority_transfer','approval_scopes','material_action_status','restore_policy','assurance']);
  if(h.schema_version!==HANDOFF_VERSION||h.authority_transfer!=='NONE'||h.material_action_status!=='REQUIRES_NEW_SESSION_REVIEW'||h.restore_policy!=='REVIEW_AND_EXPLICIT_TASK_RECONFIRMATION'||h.assurance!=='PORTABLE_UNAUTHENTICATED_STATE')fail('INVALID_HANDOFF','Invalid portable state contract');
  nonblank(h.project_id);
  if(!Array.isArray(h.approval_scopes)||h.approval_scopes.length)fail('AUTHORITY_TRANSFER_FORBIDDEN','Approval cannot cross sessions');
  if(!Array.isArray(h.evidence_refs)||h.evidence_refs.some(v=>typeof v!=='string'||!v.trim()))fail('INVALID_HANDOFF','Invalid evidence refs');
  if(h.task!==null){keys(h.task,['task_id','scope','benchmark']);for(const k of ['task_id','scope','benchmark'])nonblank(h.task[k])}
  return clone(h);
}
function validateEnvelope(input){
  const e=keys(input,['envelope_version','profile','payload','fingerprint','assurance']);
  if(e.envelope_version!==STATE_ENVELOPE_VERSION)fail('INVALID_VERSION','Unknown envelope version');
  if(e.assurance!=='NO_AUTHORITY_OR_SOURCE_AUTHENTICITY')fail('INVALID_ASSURANCE','Unsupported assurance');
  nonblank(e.fingerprint);
  return {e,payload:validatePortableHandoff(e.payload)};
}
export class DevelopmentStateBoundary{
  seal(handoff){
    const payload=validatePortableHandoff(handoff);
    return {envelope_version:STATE_ENVELOPE_VERSION,profile:DEV,payload,fingerprint:devFingerprint(payload),assurance:'NO_AUTHORITY_OR_SOURCE_AUTHENTICITY'};
  }
  verify(input){
    const {e,payload}=validateEnvelope(input);
    if(e.profile!==DEV)fail('PROFILE_MISMATCH','Not a development envelope');
    if(e.fingerprint!==devFingerprint(payload))fail('FINGERPRINT_MISMATCH','Payload changed');
    return {status:'MATCHED_DEV_FINGERPRINT',payload,authenticated_origin:false,authority_transfer:false,binling_vm_verified:false};
  }
}
export class ExternalBinLingStateBoundary{
  constructor(adapter){
    if(!adapter||adapter.contract_version!==EXTERNAL_ADAPTER_VERSION||typeof adapter.seal!=='function'||typeof adapter.verify!=='function')fail('ADAPTER_UNAVAILABLE','Explicit pinned external adapter required');
    this.adapter=adapter;
  }
  async seal(handoff){
    const payload=validatePortableHandoff(handoff);
    const result=await this.adapter.seal({profile:EXT,payload:clone(payload)});
    if(!result||result.profile!==EXT||typeof result.fingerprint!=='string'||!/^adaptersha256:[a-f0-9]{64}$/.test(result.fingerprint))fail('ADAPTER_INVALID_PROOF','Malformed adapter assertion');
    return {envelope_version:STATE_ENVELOPE_VERSION,profile:EXT,payload,fingerprint:result.fingerprint,assurance:'NO_AUTHORITY_OR_SOURCE_AUTHENTICITY'};
  }
  async verify(input){
    const {e,payload}=validateEnvelope(input);
    if(e.profile!==EXT)fail('PROFILE_MISMATCH','Not an external adapter envelope');
    if(!/^adaptersha256:[a-f0-9]{64}$/.test(e.fingerprint))fail('INVALID_PROOF','Malformed adapter fingerprint');
    const r=await this.adapter.verify({profile:EXT,payload:clone(payload),fingerprint:e.fingerprint});
    if(!r||r.valid!==true||r.profile!==EXT||r.fingerprint!==e.fingerprint)fail('ADAPTER_VERIFICATION_FAILED','Adapter rejected state');
    return {status:'EXTERNAL_ADAPTER_ASSERTED_VALID',payload,authenticated_origin:false,authority_transfer:false,binling_vm_verified:false};
  }
}
export class AirStateBridge{
  constructor(harness,boundary=new DevelopmentStateBoundary()){
    if(!harness||typeof harness.exportHandoff!=='function'||typeof harness.importHandoff!=='function'||!boundary||typeof boundary.seal!=='function'||typeof boundary.verify!=='function')fail('INVALID_BRIDGE','Invalid bridge');
    this.harness=harness;this.boundary=boundary;
  }
  async checkpoint({evidence_refs=[]}={}){return this.boundary.seal(this.harness.exportHandoff({evidence_refs}))}
  async restore(envelope){
    const result=await this.boundary.verify(envelope);
    const restored=this.harness.importHandoff(result.payload);
    if(!restored||restored.status!=='REVIEW_REQUIRED'||restored.transferred_authority!==false)fail('RESTORE_CONTRACT_FAILURE','Restore must require review');
    return {...restored,integrity_status:result.status,source_authenticity_verified:false,external_execution_authorized:false};
  }
}
