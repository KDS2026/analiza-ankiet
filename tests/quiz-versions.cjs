const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),E=require('../docs/quiz-engine.js'),K=require('../docs/knowledge-model.js');
const ctx={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../docs/questions.js'),'utf8'),ctx);const Q=ctx.window.QUIZ_SPEC.questions;
const make=(old=false)=>{let questions=Array.from(Q,q=>({...q}));if(old)questions[5]={...Q[5].variants[0]};return E.table([['Sygnatura czasowa',...questions.map(q=>q.question)],['2026/10/21 09:00:01',...questions.map(q=>q.options[q.correct])],['2026/10/21 09:00:02',...questions.map(q=>q.options[(q.correct+1)%4])]],'synthetic')};
for(const old of [false,true]){const f=make(old),s=K.score(f,Q,E,'2026-10-21');assert.equal(s.bad,false);assert.equal(s.n,2);assert.equal(s.total,7);assert.equal(s.unknown.length,0);assert.equal(s.questions[5].version,old?'opinie':'algorytmy');assert.equal(s.map[5].column,6)}
const f=make(false);f.header[6]='Całkowicie inne pytanie bez znanego klucza';assert.equal(K.score(f,Q,E,'*').bad,true);
console.log('PASS: old/new question 6, correct and incorrect answers, mapping, unknown-version blocking');
