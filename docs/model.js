(function(root){
'use strict';
const choices=['nie','raczej nie','raczej tak','tak','nie wiem'];
const norm=v=>String(v??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').replace(/\s+/g,' ');
const answer=v=>{let s=norm(v).replace(/[.!?]+$/,'');return s==='trudno powiedziec'||s==='nie mam zdania'?'nie wiem':choices.find(c=>norm(c)===s)||null};
function stats(rows,key){let counts=choices.map(c=>rows.filter(r=>answer(r[key])===c).length),n=counts.reduce((a,b)=>a+b,0),missing=rows.filter(r=>!String(r[key]??'').trim()).length;return{counts,n,missing,unknown:rows.length-n-missing,positive:counts[2]+counts[3],pct:n?100*(counts[2]+counts[3])/n:null}}
function relative(rows){let n=0,higher=0,equal=0,lower=0;for(let r of rows){let a=choices.indexOf(answer(r.self)),b=choices.indexOf(answer(r.others));if(a<0||b<0||a>3||b>3)continue;n++;if(a>b)higher++;else if(a===b)equal++;else lower++}return{n,higher,equal,lower,excluded:rows.length-n}}
function parseWorkbook(wb,XLSX){
 const raw=[];let used=[];
 function read(name,forced){const a=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:'',raw:false});
  const hi=a.findIndex(row=>row.some(c=>norm(c).includes('czy ty umiesz'))&&row.some(c=>norm(c).includes('czy ludzie')));
  if(hi<0)return false;const head=a[hi].map(norm), idx={self:head.findIndex(h=>h.includes('czy ty umiesz')),others:head.findIndex(h=>h.includes('czy ludzie')),time:head.findIndex(h=>h.includes('czas odpowiedzi')||h==='sygnatura czasowa'),text:head.findIndex(h=>h.includes('odpowiedz otwarta')||h.includes('mysl')),place:head.findIndex(h=>h.includes('miejscowosc')),stage:head.indexOf('pomiar'),category:head.findIndex(h=>h==='kategorie odpowiedzi')};
  // A wide PRZED/PO table can align unrelated people by row. Read each phase separately.
  const wide=head.some(h=>h.startsWith('przed'))&&head.some(h=>h.startsWith('po '));
  if(wide){for(const st of ['PRZED','PO']){let prefix=norm(st)+' ', ix={self:head.findIndex(h=>h.startsWith(prefix)&&h.includes('czy ty umiesz')),others:head.findIndex(h=>h.startsWith(prefix)&&h.includes('czy ludzie')),time:head.findIndex(h=>h.startsWith(prefix)&&h.includes('data')),text:head.findIndex(h=>h.startsWith(prefix)&&h.includes('odpowiedz otwarta')),category:head.findIndex(h=>h.startsWith(prefix)&&h.includes('kategorie')),place:idx.place};if(ix.self<0||ix.others<0)continue;pushRows(a.slice(hi+1),ix,st)}}
  else pushRows(a.slice(hi+1),idx,forced);used.push(name);return true;
 }
 function pushRows(data,ix,forced){for(const row of data){const get=k=>ix[k]>=0?String(row[ix[k]]??'').trim():'';if(!['self','others','time','text'].some(k=>get(k)))continue;const st=forced||get('stage').toUpperCase();if(!['PRZED','PO'].includes(st))throw Error('Brak oznaczenia pomiaru PRZED/PO. Użyj eksportu z arkuszami PRZED i PO lub kolumną „Pomiar”.');raw.push({self:get('self'),others:get('others'),time:get('time'),text:get('text'),category:get('category'),place:get('place')||'Nie podano miejsca',stage:st})}}
 const phases=wb.SheetNames.filter(n=>['PRZED','PO'].includes(n.trim().toUpperCase()));
 if(phases.length){for(const n of phases){if(!read(n,n.trim().toUpperCase()))throw Error('Nie znaleziono pytań o siebie i innych w arkuszu '+n)}}
 else{const wide=wb.SheetNames.find(n=>norm(n).includes('odpowiedzi przed'));if(wide)read(wide);else for(const n of wb.SheetNames)if(read(n))break}
 if(!raw.length)throw Error('Nie znaleziono odpowiedzi. Oczekiwany eksport zawiera pytania „Czy Ty umiesz rozpoznać dezinformację?” i „Czy ludzie w Polsce umieją rozpoznać dezinformację?” oraz pomiary PRZED/PO.');
 return{rows:raw,sheets:used};
}
const api={choices,norm,answer,stats,relative,parseWorkbook};root.SurveyModel=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
