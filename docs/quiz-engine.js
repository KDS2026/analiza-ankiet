(function(root){
'use strict';
const norm=s=>String(s??'').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const clean=s=>String(s??'').trim();
function similarity(a,b){const A=new Set(norm(a).split(' ').filter(Boolean)),B=new Set(norm(b).split(' ').filter(Boolean));let hit=0;for(const x of A)if(B.has(x))hit++;return A.size+B.size?2*hit/(A.size+B.size):0;}
function parseCSV(text){
 text=text.replace(/^\uFEFF/,'');let quote=false,first='';for(const ch of text){if(ch==='"')quote=!quote;if(!quote&&/[\r\n]/.test(ch))break;first+=ch;}
 const count=d=>{let q=false,n=0;for(const ch of first){if(ch==='"')q=!q;else if(!q&&ch===d)n++;}return n;};
 const delimiter=[';',',','\t'].sort((a,b)=>count(b)-count(a))[0];let rows=[],row=[],field='',q=false;
 for(let i=0;i<text.length;i++){const ch=text[i];if(q){if(ch==='"'){if(text[i+1]==='"'){field+='"';i++;}else q=false;}else field+=ch;}else if(ch==='"'){if(field.trim())throw Error('Nieprawidłowy cudzysłów w pliku CSV.');q=true;}else if(ch===delimiter){row.push(field);field='';}else if(ch==='\r'||ch==='\n'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(field);rows.push(row);row=[];field='';}else field+=ch;}
 if(q)throw Error('Niedomknięty cudzysłów w pliku CSV.');if(field.length||row.length){row.push(field);rows.push(row);}return rows;
}
function table(rows,name,sheet){
 rows=rows.map(r=>Array.from(r||[],clean));const counts=rows.slice(0,10).map(r=>r.filter(Boolean).length),max=Math.max(0,...counts);let hi=counts.findIndex(n=>n>=2&&n>=max*.8);if(hi<0)throw Error('Brak tabeli: potrzebne są nagłówki i kolumny odpowiedzi.');
 const header=rows[hi],data=rows.slice(hi+1).map((values,i)=>({values,row:i+hi+2})).filter(r=>r.values.some(Boolean));
 if(!data.length)throw Error('Plik zawiera nagłówek, ale nie ma odpowiedzi.');return {name,sheet:sheet||'',header,rows:data,headerRow:hi+1};
}
const meta=h=>/^(sygnatura|znacznik|timestamp|submissionid|id$|identyfikator|godzina|czas|data|adres|e mail|email|imi[eę]|nazwisk|wynik|score|punkt|points|feedback|opinia|informacj|łączna|total|klasa|szkoła|język|language|start|ukończ|completion|last|ostatni)/.test(norm(h))||/\[(wynik|ocena|score|points)\]\s*$/i.test(h);
function mapping(file,questions,manual={}){
 if(!file)return questions.map(()=>({column:-1,reason:'Brak pliku'}));
 const map=questions.map(q=>{
  if(Object.hasOwn(manual,q.id)){const c=manual[q.id];return {column:c,reason:c<0?'Pominięta kolumna':'Wybór ręczny'};}
  const candidates=file.header.map((h,c)=>({column:c,score:meta(h)?0:similarity(h,q.question)})).sort((a,b)=>b.score-a.score);
  if(candidates[0]?.score>=.75&&candidates[0].score-(candidates[1]?.score||0)>.12)return {...candidates[0],reason:'Dopasowanie treści'};
  return {column:-1,reason:candidates[0]?.score>=.6?'Niejednoznaczny nagłówek':'Brak zgodnego nagłówka'};
 });
 const used=new Map();map.forEach((m,i)=>{if(m.column<0)return;if(used.has(m.column)){m.conflict=true;map[used.get(m.column)].conflict=true;}else used.set(m.column,i);});return map;
}
function matchAnswer(value,options,aliases=[]){
 const v=clean(value);if(!v)return {index:-1,blank:true};const letter=v.match(/^([A-D])\s*(?:[).:\-]\s*(.*))?$/i);
 if(letter&&!letter[2])return {index:letter[1].toUpperCase().charCodeAt(0)-65};
 const text=v.replace(/^[A-D]\s*[).:\-]\s*/i,''),n=norm(text),hits=options.map((o,i)=>(norm(o)===n||norm(aliases[i]??'')===n)?i:-1).filter(i=>i>=0);
 if(hits.length===1)return {index:hits[0],moved:!!letter&&letter[1].toUpperCase().charCodeAt(0)-65!==hits[0]};
 return {index:-1,unknown:true};
}
function analyze(files,questions,manual=[{},{}],assign=[{},{}],settings={}){
 const maps=files.map((f,i)=>mapping(f,questions,manual[i]));const qstats=questions.map((q,qi)=>{
  const correct=settings[q.id]?.correct??q.correct,include=settings[q.id]?.include??true;
  const sides=files.map((f,fi)=>{
   const m=maps[fi][qi],counts=q.options.map(()=>0),unknown=new Map();let answered=0,blank=0,moved=0;
   if(f&&m.column>=0&&!m.conflict)for(const row of f.rows){const raw=clean(row.values[m.column]),key=q.id+'\u0000'+raw;let a=matchAnswer(raw,q.options,q.answerAliases);if(a.unknown&&Object.hasOwn(assign[fi],key))a={index:assign[fi][key],manual:true};
    if(a.blank){blank++;continue;}answered++;if(a.index>=0&&a.index<counts.length){counts[a.index]++;if(a.moved)moved++;}else{if(!unknown.has(raw))unknown.set(raw,{value:raw,count:0,rows:[],key});const u=unknown.get(raw);u.count++;u.rows.push(row.row);}}
   return {counts,answered,blank,moved,unknown:[...unknown.values()],column:m.column,reason:m.reason,conflict:!!m.conflict,correct:counts[correct],percent:answered?counts[correct]/answered*100:null};
  });return {...q,correct,include,sides};
 });
 const errors=[];qstats.filter(q=>q.include).forEach(q=>q.sides.forEach((s,fi)=>{if(s.column<0)errors.push(`Pytanie ${q.number}: brak kolumny ${fi?'PO':'PRZED'}.`);else if(s.conflict)errors.push(`Pytanie ${q.number}: ta sama kolumna została przypisana dwukrotnie (${fi?'PO':'PRZED'}).`);else if(!s.answered)errors.push(`Pytanie ${q.number}: brak odpowiedzi ${fi?'PO':'PRZED'}.`);if(s.unknown.length)errors.push(`Pytanie ${q.number}: nierozpoznane odpowiedzi ${fi?'PO':'PRZED'}.`);}));
 const included=qstats.filter(q=>q.include);if(!included.length)errors.push('Wybierz co najmniej jedno pytanie.');
 const valid=included.filter(q=>q.sides.every(s=>s.answered&&!s.unknown.length&&s.column>=0&&!s.conflict));
 const avg=fi=>valid.length?valid.reduce((n,q)=>n+q.sides[fi].percent,0)/valid.length:null;
 const before=avg(0),after=avg(1);return {questions:qstats,maps,errors,summary:{k:valid.length,before,after,delta:before===null?null:after-before},respondents:files.map((f,fi)=>f?f.rows.filter(r=>maps[fi].some(m=>m.column>=0&&clean(r.values[m.column]))).length:0)};
}
const api={norm,similarity,parseCSV,table,mapping,matchAnswer,analyze};if(typeof module!=='undefined')module.exports=api;else root.QuizEngine=api;
})(typeof window==='undefined'?globalThis:window);
