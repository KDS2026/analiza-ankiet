'use strict';
window.WorkshopEvaluation=(()=>{
 const API='https://script.google.com/macros/s/AKfycbxv6mjIeO8EnGjwa48GYOndW5psqIWIM54TY-RDm3Or0iwR2_l-iJio9vSRrB_cvAmR/exec';
 const SHEET='https://docs.google.com/spreadsheets/d/1lnC4ABurwK94eIouiO_KpVQF0HkVNTocDzpviHvcZWk/edit';
 let rows=[],verifiedAt=0,request='',timer=null,loading=false,error='',lastScope='',aliases={};
 try{aliases=JSON.parse(localStorage.getItem('lustro-evaluation-place-aliases')||'{}')}catch{}
 aliases['Skierniewice_Liceum_Plastyczne|2026-10-21']='Skierniewice'; // Przypisanie potwierdzone przez Kingę 22.10.2026.
 const norm=s=>String(s??'').normalize('NFC').toLocaleLowerCase('pl').replace(/[_\s]+/g,' ').trim();
 function day(value){const s=String(value??'');if(/^\d{4}-\d\d-\d\dT/.test(s)){const d=new Date(s);if(!Number.isFinite(+d))return'';const parts=Object.fromEntries(new Intl.DateTimeFormat('en',{timeZone:'Europe/Warsaw',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).map(x=>[x.type,x.value]));return `${parts.year}-${parts.month}-${parts.day}`}return K.dayKey(s)}
 function scopes(){if(analysisMode==='multiple'){const saved=selectedMeetings().map(m=>({id:m.id,place:m.place,date:m.date}));if(saved.length)return saved;const current=new Map();for(const r of filtered()){const date=K.dayKey(r.time),id=r.place+'|'+date;if(r.place&&date&&date!=='Brak daty'&&!current.has(id))current.set(id,{id,place:r.place,date})}return [...current.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.place.localeCompare(b.place,'pl'))}const rr=filtered();if(!rr.length||!uniqueSurveyScope())return[];return[{id:rr[0].place+'|'+K.dayKey(rr[0].time),place:rr[0].place,date:K.dayKey(rr[0].time)}]}
 function matches(scope){const place=aliases[scope.id]||scope.place;return rows.filter(r=>norm(r.city)===norm(place)&&r.date===scope.date)}
 const labels={positive:'Pozytywne',mixed:'Mieszane',negative:'Krytyczne',neutral:'Neutralne',excluded:'Wykluczone jako niezwiązane z oceną zajęć',pending:'Do analizy'};
 const included=data=>data.filter(r=>r.code?.label!=='excluded');
 function stats(data){const counts=Object.fromEntries(Object.keys(labels).map(k=>[k,0]));for(const r of data)counts[r.code?.label||'pending']++;const base=counts.positive+counts.mixed+counts.negative+counts.neutral;return{counts,base,total:data.length,pct:base?counts.positive/base*100:null}}
 const pct=(n,base)=>base?(n/base*100).toLocaleString('pl-PL',{maximumFractionDigits:1})+'%':'—';
 function scale(data){const s=stats(data);return `<div class="evaluation-satisfaction"><strong>${pct(s.counts.positive,s.base)}</strong><span>wypowiedzi pozytywnych · n = ${s.base}</span></div><div class="evaluation-scale" role="img" aria-label="${esc(['positive','mixed','negative','neutral'].map(k=>labels[k]+': '+s.counts[k]+' ('+pct(s.counts[k],s.base)+')').join('; '))}">${['positive','mixed','negative','neutral'].filter(k=>s.counts[k]).map(k=>`<span class="eval-${k}" style="width:${s.counts[k]/s.base*100}%" title="${labels[k]}: ${s.counts[k]}"></span>`).join('')}</div><ul class="evaluation-key">${['positive','mixed','negative','neutral'].map(k=>`<li><i class="eval-${k}"></i>${labels[k]}: <b>${pct(s.counts[k],s.base)}</b> (${s.counts[k]})</li>`).join('')}</ul>`}
 function summary(scope,data){const key=norm(aliases[scope.id]||scope.place)+'|'+scope.date,v=EvaluationCoding.summaries[key],valid=included(data),validIds=(v?.ids||[]).filter(id=>EvaluationCoding.records[id]?.label!=='excluded');return v&&valid.length===validIds.length&&valid.every(r=>r.code&&validIds.includes(r.id))?v:null}
 function narrative(v,count){return `<div class="evaluation-findings"><h4>Wnioski z oceny zajęć</h4>${v.findings.map(x=>`<p>${esc(x)}</p>`).join('')}<h4>Co warto zrobić dalej?</h4><ul>${v.actions.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p class="stat-method">Analiza treści: ${esc(v.reviewedAt)}. Wnioski odnoszą się do ${count} uwzględnionych wpisów tego spotkania.</p></div>`}
 function render(){
  const dest=$('evaluation-results');if(!dest)return;const selected=scopes();
  $('evaluation-status').textContent=error||(loading?'Pobieranie aktualnych refleksji z arkusza…':verifiedAt?'Odczyt arkusza potwierdzony: '+new Date(verifiedAt).toLocaleString('pl-PL',{timeZone:'Europe/Warsaw'})+'.':'');
  if(!selected.length){dest.innerHTML='<p>Wybierz jedno miejsce i datę albo zaznacz zapisane spotkania do porównania. Oceny zajęć zostaną pobrane automatycznie.</p>';return}
  const scopeSummary=`<section class="portfolio-scope evaluation-scope"><h3>Zakres ocen: ${selected.length} ${selected.length===1?'spotkanie':'spotkania'}</h3><ul>${selected.map(scope=>`<li><strong>${esc(scope.place)}</strong><span>${esc(scope.date)}</span></li>`).join('')}</ul></section>`;
  const selectedRaw=[...new Map(selected.flatMap(matches).map(r=>[r.id,r])).values()],selectedRows=included(selectedRaw);
  const overall=selected.length>1&&verifiedAt?`<section class="evaluation-overall"><h3>Łącznie — wybrany zakres spotkań</h3>${scale(selectedRows,selectedRaw.length-selectedRows.length)}</section>`:'';
  dest.innerHTML=scopeSummary+overall+selected.map(scope=>{
   const raw=matches(scope),data=included(raw),places=[...new Set(rows.filter(r=>r.date===scope.date).map(r=>r.city))].sort((a,b)=>a.localeCompare(b,'pl')),known=places.some(p=>norm(p)===norm(aliases[scope.id]||scope.place));
   const linkedElsewhere=selected.some(other=>other.id!==scope.id&&other.date===scope.date&&norm(aliases[other.id]||other.place)===norm(aliases[scope.id]||scope.place));
   return `<article class="evaluation-meeting"><h3>${esc(scope.place)} · ${esc(scope.date)}</h3>${!known&&places.length?`<label>Miejsce w arkuszu <select data-evaluation-alias="${esc(scope.id)}"><option value="">Wybierz miejsce…</option>${places.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('')}</select></label>`:''}${known&&aliases[scope.id]?`<button data-evaluation-unlink="${esc(scope.id)}">Zmień przypisanie miejsca</button>`:''}${linkedElsewhere?'<p>Te same wypowiedzi są liczone tylko raz w wykresie łącznym.</p>':''}${!data.length?`<p>${loading?'Trwa sprawdzanie arkusza.':'Brak wypowiedzi zawierających ocenę zajęć.'}</p>`:scale(data,raw.length-data.length)}</article>`;
  }).join('');
 }

 function refresh(){
  if(timer)clearTimeout(timer);request=crypto.randomUUID();const id=request;loading=true;error='';render();const script=document.createElement('script');script.src=API+'?'+new URLSearchParams({action:'evaluationData',request:id,t:Date.now()});
  const fail=()=>{if(request!==id)return;loading=false;error='Nie udało się odświeżyć ocen zajęć. Ponowna próba za minutę; możesz też użyć przycisku odświeżania.';render()};
  script.onerror=()=>{script.remove();fail()};script.onload=()=>script.remove();document.body.append(script);timer=setTimeout(()=>{script.remove();if(loading)fail()},25000);
 }
 window.evalData=async message=>{if(message.request!==request||!Array.isArray(message.rows))return;clearTimeout(timer);const seen=new Set();rows=message.rows.slice(1).filter(r=>String(r[2]||'').trim()).map((r,i)=>({time:r[0],date:day(r[0]),city:String(r[1]||''),text:String(r[2]),id:String(r[3]||JSON.stringify([r[0],r[1],r[2],i]))})).filter(r=>{if(seen.has(r.id))return false;seen.add(r.id);return true}).sort((a,b)=>new Date(a.time)-new Date(b.time));await Promise.all(rows.map(async r=>{const reviewed=EvaluationCoding.records[r.id];if(!reviewed)return;try{const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(r.text)),hash=[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');if(hash===reviewed.hash)r.code=reviewed}catch{}}));if(message.request!==request)return;verifiedAt=Date.now();loading=false;error='';render()};
 function update(){const signature=JSON.stringify(scopes());if(signature!==lastScope){lastScope=signature;refresh()}else render()}
 $('evaluation-refresh').onclick=refresh;
 document.addEventListener('change',e=>{const sel=e.target.closest('[data-evaluation-alias]');if(sel){aliases[sel.dataset.evaluationAlias]=sel.value;try{localStorage.setItem('lustro-evaluation-place-aliases',JSON.stringify(aliases))}catch{}refresh()}});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-evaluation-unlink]');if(!b)return;delete aliases[b.dataset.evaluationUnlink];try{localStorage.setItem('lustro-evaluation-place-aliases',JSON.stringify(aliases))}catch{}render()});
 const previousRender=renderPortfolio;renderPortfolio=function(){previousRender();update()};
 setInterval(()=>{if(scopes().length&&!loading)refresh()},60000);update();
 return{day,norm,matches,scopes,refresh};
})();
