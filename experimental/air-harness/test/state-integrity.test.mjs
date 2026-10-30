import test from 'node:test';
import assert from 'node:assert/strict';
import { DevelopmentStateBoundary, ExternalBinLingStateBoundary, AirStateBridge,
  devFingerprint, validatePortableHandoff, StateIntegrityError,
  EXTERNAL_ADAPTER_VERSION, STATE_ENVELOPE_VERSION } from '../src/state-integrity.mjs';
function handoff(){return {schema_version:'AIR_HARNESS_PORTABLE_STATE_V0_1',project_id:'P1',
  task:{task_id:'T1',scope:'Draft',benchmark:'Evidence'},evidence_refs:['source-1'],
  authority_transfer:'NONE',approval_scopes:[],
  material_action_status:'REQUIRES_NEW_SESSION_REVIEW',
  restore_policy:'REVIEW_AND_EXPLICIT_TASK_RECONFIRMATION',assurance:'PORTABLE_UNAUTHENTICATED_STATE'};}
const invalid=(fn,code)=>assert.throws(fn,e=>e instanceof StateIntegrityError&&e.code===code);
const rejects=(fn,code)=>assert.rejects(fn,e=>e instanceof StateIntegrityError&&e.code===code);
test('local fingerprint preserves object-key order independence',()=>assert.equal(devFingerprint({a:1,b:2}),devFingerprint({b:2,a:1})));
test('local integrity roundtrip cannot assert BinLing or source verification',()=>{
 const b=new DevelopmentStateBoundary(),v=b.verify(b.seal(handoff()));
 assert.equal(v.status,'MATCHED_DEV_FINGERPRINT');assert.equal(v.binling_vm_verified,false);
 assert.equal(v.authenticated_origin,false);assert.equal(v.authority_transfer,false);
});
test('tamper detection',()=>{
 const b=new DevelopmentStateBoundary(),e=b.seal(handoff());e.payload.task.scope='Deploy';
 invalid(()=>b.verify(e),'FINGERPRINT_MISMATCH');
});
test('rehashed forgery still cannot authenticate source',()=>{
 const b=new DevelopmentStateBoundary(),e=b.seal(handoff());e.payload.task.scope='Forged';
 e.fingerprint=devFingerprint(e.payload);assert.equal(b.verify(e).authenticated_origin,false);
});
test('approval transfer always refused even with recomputed digest',()=>{
 const b=new DevelopmentStateBoundary(),e=b.seal(handoff());
 e.payload.approval_scopes=['approved'];e.fingerprint=devFingerprint(e.payload);
 invalid(()=>b.verify(e),'AUTHORITY_TRANSFER_FORBIDDEN');
});
test('unexpected handoff field is rejected',()=>{
 const h=handoff();h.extra='authority';invalid(()=>validatePortableHandoff(h),'UNEXPECTED_FIELD');
});
test('unknown envelope version refused',()=>{
 const b=new DevelopmentStateBoundary(),e=b.seal(handoff());e.envelope_version='future';
 invalid(()=>b.verify(e),'INVALID_VERSION');
});
test('profile mismatch refused',()=>{
 const b=new DevelopmentStateBoundary(),e=b.seal(handoff());e.profile='EXTERNAL_BINLING_ADAPTER_V0_1';
 invalid(()=>b.verify(e),'PROFILE_MISMATCH');
});
test('invalid JSON, cycles, getters refused',()=>{
 invalid(()=>devFingerprint({a:Infinity}),'INVALID_JSON');
 const x={};x.self=x;invalid(()=>devFingerprint(x),'INVALID_JSON');
 const y={};Object.defineProperty(y,'a',{enumerable:true,get(){throw Error('getter invoked')}});invalid(()=>devFingerprint(y),'INVALID_JSON');
});
test('unregistered external verifier rejected',()=>invalid(()=>new ExternalBinLingStateBoundary({}),'ADAPTER_UNAVAILABLE'));
test('external results are assertions, not VM certification',async()=>{
 const a={contract_version:EXTERNAL_ADAPTER_VERSION,
  async seal({profile}){return {profile,fingerprint:'adaptersha256:'+'a'.repeat(64)}},
  async verify({profile,fingerprint}){return {valid:true,profile,fingerprint}}};
 const b=new ExternalBinLingStateBoundary(a),e=await b.seal(handoff());
 const v=await b.verify(e);assert.equal(v.status,'EXTERNAL_ADAPTER_ASSERTED_VALID');assert.equal(v.binling_vm_verified,false);
});
test('external rejection fails closed',async()=>{
 const a={contract_version:EXTERNAL_ADAPTER_VERSION,
  async seal({profile}){return {profile,fingerprint:'adaptersha256:'+'a'.repeat(64)}},
  async verify(){return {valid:false}}};
 const b=new ExternalBinLingStateBoundary(a),e=await b.seal(handoff());
 await rejects(()=>b.verify(e),'ADAPTER_VERIFICATION_FAILED');
});
test('restore strips approvals, requires review and reconfirmation',async()=>{
 const harness={proposals:new Map([['old',{status:'APPROVED'}]]),
  exportHandoff(){return handoff()},
  importHandoff(x){this.proposals.clear();this.pending=x.task;return {status:'REVIEW_REQUIRED',transferred_authority:false}}};
 const bridge=new AirStateBridge(harness);
 const state=await bridge.checkpoint(),r=await bridge.restore(state);
 assert.equal(r.status,'REVIEW_REQUIRED');assert.equal(r.external_execution_authorized,false);assert.equal(harness.proposals.size,0);
});
test('tampered state cannot invoke import',async()=>{
 let called=false;const harness={exportHandoff(){return handoff()},importHandoff(){called=true;return {status:'REVIEW_REQUIRED',transferred_authority:false}}};
 const bridge=new AirStateBridge(harness),e=await bridge.checkpoint();e.payload.project_id='other';
 await rejects(()=>bridge.restore(e),'FINGERPRINT_MISMATCH');assert.equal(called,false);
});
test('restore cannot claim authority',async()=>{
 const h={exportHandoff(){return handoff()},importHandoff(){return {status:'APPROVED',transferred_authority:true}}};
 const bridge=new AirStateBridge(h),e=await bridge.checkpoint();
 await rejects(()=>bridge.restore(e),'RESTORE_CONTRACT_FAILURE');
});
