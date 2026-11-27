import test from 'node:test';
import assert from 'node:assert/strict';
import {commitShot,gpsMeasurement,manualMetres,addStroke,scoreToPar,formatToPar,scoreName,nineTotals,isFull18,isNine,suggestClub,formatDistance,plural,parseBackup} from './round.js';
const round={id:'round',hole:1,shots:[],completed:[1]},draft={id:'shot',hole:1,club:'Driver'};
test('GPS endpoints produce one stroke; duplicate completion cannot add another',()=>{
 const start={latitude:1,longitude:103,accuracy:4},end={latitude:1.001,longitude:103,accuracy:5};
 const measured=gpsMeasurement(start,end);
 assert.equal(measured.distance,111);
 const saved=commitShot(round,draft,measured);
 assert.equal(saved.shots.length,1);assert.deepEqual(saved.shots[0].start,start);
 assert.equal(commitShot(saved,draft,measured).shots.length,1);
});
test('editing a completed hole changes the shot without changing its count or completion',()=>{
 const saved=commitShot(round,draft,{distance:150,measurement:'manual'});
 const edited=commitShot(saved,{...draft,editing:true},{distance:160,measurement:'manual'});
 assert.equal(edited.shots.length,1);assert.equal(edited.shots[0].distance,160);assert.deepEqual(edited.completed,[1]);assert.equal(edited.draft,null);
});
test('weak GPS and invalid distances cannot become recorded shots',()=>{
 assert.throws(()=>gpsMeasurement({accuracy:100},{accuracy:5}));
 for(const distance of [NaN,-1,Infinity])assert.throws(()=>commitShot(round,draft,{distance}));
 assert.equal(round.shots.length,0);
});
test('draft hole is preserved when viewing another hole before saving',()=>{
 assert.equal(commitShot({...round,hole:2},draft,{distance:100,measurement:'manual'}).shots[0].hole,1);
});
test('lie and direction are not invented; the first stroke on a hole is from the tee',()=>{
 const first=commitShot(round,draft,{distance:200,measurement:'manual'});
 assert.equal(first.shots[0].lie,'Tee');assert.equal(first.shots[0].miss,null);
 const second=commitShot(first,{id:'two',hole:1,club:'7 Iron'},{distance:140,measurement:'manual'});
 assert.equal(second.shots[1].lie,null);assert.equal(second.shots[1].miss,null);
 const chosen=commitShot(first,{id:'three',hole:1,club:'7 Iron',lie:'Rough',miss:'Left'},{distance:120,measurement:'manual'});
 assert.equal(chosen.shots[1].lie,'Rough');assert.equal(chosen.shots[1].miss,'Left');
});
test('editing keeps the lie the golfer already chose',()=>{
 const saved=commitShot(round,{...draft,lie:'Bunker'},{distance:50,measurement:'manual'});
 const edited=commitShot(saved,{...draft,editing:true},{distance:55,measurement:'manual'});
 assert.equal(edited.shots[0].lie,'Bunker');
});
test('a penalty goes after the shot that caused it, before putts, with no club',()=>{
 let r=commitShot(round,draft,{distance:200,measurement:'manual'});
 r=addStroke(r,{id:'p1',type:'putt',hole:1,club:'Driver'});
 r=addStroke(r,{id:'pen',type:'penalty',hole:1,club:'Driver'});
 assert.deepEqual(r.shots.map(s=>s.type),['shot','penalty','putt']);
 assert.equal(r.shots[1].club,null);assert.equal(r.shots[2].club,'Putter');
 const empty=addStroke({...round,shots:[]},{id:'x',type:'penalty',hole:3,club:'Driver'});
 assert.equal(empty.shots.length,1);
});
test('manual distances are validated and converted to metres',()=>{
 assert.equal(manualMetres('150'),150);
 assert.equal(manualMetres('100','yd'),91);
 for(const bad of ['','0','-5','abc','9999'])assert.throws(()=>manualMetres(bad));
});
test('score to par, nine totals and score names',()=>{
 const pars=[4,3,5,...Array(15).fill(4)];
 const r={pars,completed:[1,2],shots:[{hole:1},{hole:1},{hole:1},{hole:2},{hole:2},{hole:2},{hole:2}]};
 assert.equal(scoreToPar(r),0);assert.equal(formatToPar(0),'E');assert.equal(formatToPar(2),'+2');assert.equal(formatToPar(-1),'-1');
 assert.equal(scoreName(3,4),'Birdie');assert.equal(scoreName(4,3),'Bogey');assert.equal(scoreName(1,3),'Hole in one');assert.equal(scoreName(8,4),'+4');
 assert.deepEqual(nineTotals(r,1),{strokes:7,par:36,played:2});
});
test('full 18 and nine-hole rounds are recognised',()=>{
 const all=Array.from({length:18},(_,i)=>i+1);
 const shotsFor=hs=>hs.map(h=>({hole:h}));
 assert.equal(isFull18({completed:all,shots:shotsFor(all)}),true);
 const front=all.slice(0,9);
 assert.equal(isNine({completed:front,shots:shotsFor(front)}),true);
 assert.equal(isNine({completed:[1,2],shots:shotsFor([1,2])}),false);
});
test('club suggestion for par 3s uses the golfer’s own averages',()=>{
 const bag=['Driver','7 Iron','9 Iron','Putter'];
 assert.equal(suggestClub(bag,{'7 Iron':150,'9 Iron':120},3,125),'9 Iron');
 assert.equal(suggestClub(bag,{},3,125),'Driver');
 assert.equal(suggestClub(bag,{'9 Iron':120},4,360),'Driver');
});
test('distances, plurals and backups',()=>{
 assert.equal(formatDistance(100,'yd'),'109 yd');assert.equal(formatDistance(100),'100 m');
 assert.equal(plural(1,'stroke'),'1 stroke');assert.equal(plural(3,'hole'),'3 holes');
 assert.throws(()=>parseBackup('nope'));assert.throws(()=>parseBackup('{"rounds":[]}'));
 assert.equal(parseBackup('{"rounds":[],"bag":["Driver"]}').bag[0],'Driver');
});
