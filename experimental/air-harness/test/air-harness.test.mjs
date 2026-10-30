import test from 'node:test';
import assert from 'node:assert/strict';
import { AirHarness, AirHarnessError, capabilityReport } from '../src/air-harness.mjs';

const task = {task_id:'T1',scope:'Draft report',benchmark:'Readable report'};
const action = {operation:'WRITE_FILE',resource:'report.md',parameters:{content:'draft'}};
const host = {provider:'example',model:'example'};
function adapters(events=[]) {
  return {
    async verifyApproval({scope_id}) { events.push('approve'); return {verified:true,scope_id,actor_id:'test-actor'}; },
    async dispatchMaterial() { events.push('dispatch'); return {status:'mock'}; },
    async verifyEffect({scope_id,action_digest}) { events.push('verify'); return {verified:true,scope_id,action_digest,receipt_id:'mock-receipt'}; },
  };
}
function make(adaptersArg=adapters(),mode='HARNESS') {
  const h=new AirHarness({project_id:'P1',requested_mode:mode,host,adapters:adaptersArg});
  h.bindTask(task); return h;
}
const rejectsCode=(p,code)=>assert.rejects(p,e=>e instanceof AirHarnessError && e.code===code);

test('standalone needs no external adapter and makes no backend claims',()=>{
  const r=capabilityReport({requested_mode:'ENHANCED',host});
  assert.equal(r.effective_mode,'STANDALONE');
  assert.equal(r.assurance.backend_enforcement_claimed,false);
  assert.equal(r.capabilities.graph_retrieval,'NOT_CONNECTED');
});
test('partial adapter does not upgrade standalone',()=>{
  const r=capabilityReport({requested_mode:'HARNESS',host,adapters:{verifyApproval(){}}});
  assert.equal(r.effective_mode,'STANDALONE');
});
test('complete registered adapters remain unverified',()=>{
  const r=capabilityReport({requested_mode:'HARNESS',host,adapters:adapters()});
  assert.equal(r.effective_mode,'HARNESS');
  assert.equal(r.capabilities.scoped_approval_verifier,'REGISTERED_UNVERIFIED');
});
test('explicit standalone does not upgrade automatically',()=>{
  assert.equal(capabilityReport({requested_mode:'STANDALONE',host,adapters:adapters()}).effective_mode,'STANDALONE');
});
test('enhanced requires state interfaces but never Graphify',()=>{
  assert.equal(capabilityReport({requested_mode:'ENHANCED',host,adapters:adapters()}).effective_mode,'HARNESS');
  assert.equal(capabilityReport({requested_mode:'ENHANCED',host,adapters:{...adapters(),canonicalizeState(){},verifyState(){}}}).effective_mode,'ENHANCED');
  assert.equal(capabilityReport({requested_mode:'ENHANCED',host,adapters:{...adapters(),canonicalizeState(){},verifyState(){},graphLookup(){}}}).effective_mode,'ENHANCED');
});
test('single task and task-bound actions',()=>{
  const h=make();
  assert.throws(()=>h.bindTask(task),{code:'TASK_ALREADY_BOUND'});
  assert.throws(()=>h.proposeMaterial({task_id:'wrong',action}),{code:'TASK_NOT_BOUND'});
});
test('casual agreement fails exact scoped approval',async()=>{
  const h=make();const p=h.proposeMaterial({task_id:'T1',action});
  await rejectsCode(h.approveMaterial({scope_id:p.scope_id,token:'go ahead'}),'EXACT_APPROVAL_REQUIRED');
});
test('no dispatch before approval; single-use scope',async()=>{
  const events=[];const h=make(adapters(events));const p=h.proposeMaterial({task_id:'T1',action});
  await rejectsCode(h.executeMaterial({scope_id:p.scope_id,action}),'NOT_AUTHORIZED');
  assert.deepEqual(events,[]);
  await h.approveMaterial({scope_id:p.scope_id,token:p.approval_token});
  const receipt=await h.executeMaterial({scope_id:p.scope_id,action});
  assert.equal(receipt.status,'EFFECT_REPORTED_VERIFIED');
  assert.deepEqual(events,['approve','dispatch','verify']);
  await rejectsCode(h.executeMaterial({scope_id:p.scope_id,action}),'NOT_AUTHORIZED');
});
test('unverified actor proof is not approval',async()=>{
  const a=adapters();a.verifyApproval=async()=>true;
  const h=make(a);const p=h.proposeMaterial({task_id:'T1',action});
  await rejectsCode(h.approveMaterial({scope_id:p.scope_id,token:p.approval_token}),'APPROVAL_UNVERIFIED');
});
test('changed resource fails before dispatch',async()=>{
  const events=[];const h=make(adapters(events));const p=h.proposeMaterial({task_id:'T1',action});
  await h.approveMaterial({scope_id:p.scope_id,token:p.approval_token});
  await rejectsCode(h.executeMaterial({scope_id:p.scope_id,action:{...action,resource:'other.md'}}),'SCOPE_DRIFT');
  assert.deepEqual(events,['approve']);
});
test('unverified effect requires review and blocks retry/close',async()=>{
  const a=adapters();a.verifyEffect=async()=>({verified:false});
  const h=make(a);const p=h.proposeMaterial({task_id:'T1',action});
  await h.approveMaterial({scope_id:p.scope_id,token:p.approval_token});
  assert.equal((await h.executeMaterial({scope_id:p.scope_id,action})).status,'REVIEW_REQUIRED');
  await rejectsCode(h.executeMaterial({scope_id:p.scope_id,action}),'NOT_AUTHORIZED');
  assert.throws(()=>h.closeTask(),{code:'UNRESOLVED_ACTION'});
});
test('dispatch errors fail to review rather than retry',async()=>{
  const a=adapters();a.dispatchMaterial=async()=>{throw Error('maybe took effect')};
  const h=make(a);const p=h.proposeMaterial({task_id:'T1',action});
  await h.approveMaterial({scope_id:p.scope_id,token:p.approval_token});
  assert.equal((await h.executeMaterial({scope_id:p.scope_id,action})).status,'REVIEW_REQUIRED');
});
test('handoff cannot transfer old authority',async()=>{
  const h=make();const p=h.proposeMaterial({task_id:'T1',action});
  await h.approveMaterial({scope_id:p.scope_id,token:p.approval_token});
  const handoff=h.exportHandoff();
  assert.equal(handoff.authority_transfer,'NONE');assert.deepEqual(handoff.approval_scopes,[]);
  const next=new AirHarness({project_id:'P1',requested_mode:'HARNESS',host,adapters:adapters()});
  assert.equal(next.importHandoff({...handoff, approval_scopes:[p.scope_id]}).status,'REVIEW_REQUIRED');
  assert.throws(()=>next.proposeMaterial({task_id:'T1',action}),{code:'TASK_NOT_BOUND'});
  assert.throws(()=>next.bindTask({...task,scope:'Changed'}),{code:'RESTORE_RECONFIRM_REQUIRED'});
  next.bindTask(task);
  assert.notEqual(next.proposeMaterial({task_id:'T1',action}).scope_id,p.scope_id);
});
test('standalone rejects approval even with exact token',async()=>{
  const h=make({},'STANDALONE');const p=h.proposeMaterial({task_id:'T1',action});
  await rejectsCode(h.approveMaterial({scope_id:p.scope_id,token:p.approval_token}),'NO_EXTERNAL_APPROVAL_GATE');
});
test('rejection invalidates a proposal',async()=>{
  const h=make();const p=h.proposeMaterial({task_id:'T1',action});
  assert.equal(h.rejectMaterial({scope_id:p.scope_id,token:p.rejection_token}).status,'REJECTED');
  await rejectsCode(h.approveMaterial({scope_id:p.scope_id,token:p.approval_token}),'SCOPE_NOT_OPEN');
});
test('cyclic action payload is refused',()=>{
  const h=make();const v={};v.cycle=v;
  assert.throws(()=>h.proposeMaterial({task_id:'T1',action:{...action,parameters:v}}),{code:'INVALID_JSON'});
});
test('concurrent approvals are not accepted',async()=>{
  let release;const held=new Promise(r=>release=r);
  const a=adapters();a.verifyApproval=async({scope_id})=>{await held;return {verified:true,scope_id,actor_id:'test'}};
  const h=make(a);const p=h.proposeMaterial({task_id:'T1',action});
  const first=h.approveMaterial({scope_id:p.scope_id,token:p.approval_token});
  await rejectsCode(h.approveMaterial({scope_id:p.scope_id,token:p.approval_token}),'SCOPE_NOT_OPEN');
  release();await first;
});
