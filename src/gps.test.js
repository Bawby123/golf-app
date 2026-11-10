import test from 'node:test';import assert from 'node:assert/strict';import{metresBetween}from './gps.js';
test('stationary coordinates have zero distance',()=>assert.equal(metresBetween({latitude:1.3,longitude:103.8},{latitude:1.3,longitude:103.8}),0));
test('one degree longitude at equator is about 111.195 km',()=>assert.ok(Math.abs(metresBetween({latitude:0,longitude:0},{latitude:0,longitude:1})-111195)<1));
test('distance is symmetric',()=>{const a={latitude:1.3,longitude:103.8},b={latitude:1.301,longitude:103.802};assert.ok(Math.abs(metresBetween(a,b)-metresBetween(b,a))<1e-8)});
