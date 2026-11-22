import test from 'node:test';
import assert from 'node:assert/strict';
import {commitShot,gpsMeasurement} from './round.js';
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
