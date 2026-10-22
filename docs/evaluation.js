'use strict';
window.WorkshopEvaluation=(()=>{
 const API='https://script.google.com/macros/s/AKfycbxv6mjIeO8EnGjwa48GYOndW5psqIWIM54TY-RDm3Or0iwR2_l-iJio9vSRrB_cvAmR/exec';
 const SHEET='https://docs.google.com/spreadsheets/d/1lnC4ABurwK94eIouiO_KpVQF0HkVNTocDzpviHvcZWk/edit';
 let rows=[],verifiedAt=0,request='',timer=null,loading=false,error='',lastScope='',aliases={};
 try{aliases=JSON.parse(localStorage.getItem('lustro-evaluation-place-aliases')||'{}')}catch{}
 const norm=s=>String(s??'').normalize('NFC').toLocaleLowerCase('pl').replace(/[_\s]+/g,' ').trim();
 function day(value){const s=String(value??'');if(/^\d{4}-\d\d-\d\dT/.test(s)){const d=new Date(s);if(!Number.isFinite(+d))return'';const parts=Object.fromEntries(new Intl.DateTimeFormat('en',{timeZone:'Europe/Warsaw',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).map(x=>[x.type,x.value]));return `${parts.year}-${parts.month}-${parts.day}`}return K.dayKey(s)}
 function scopes(){if(analysisMode==='multiple')return selectedMeetings().map(m=>({id:m.id,place:m.place,date:m.date}));const rr=filtered();if(!rr.length||!uniqueSurveyScope())return[];return[{id:rr[0].place+'|'+K.dayKey(rr[0].time),place:rr[0].place,date:K.dayKey(rr[0].time)}]}
 function matches(scope){const place=aliases[scope.id]||scope.place;return rows.filter(r=>norm(r.city)===norm(place)&&r.date===scope.date)}
 function render(){
  const dest=$('evaluation-results');if(!dest)return;const selected=scopes();
  $('evaluation-status').textContent=error||(loading?'Pobieranie aktualnych refleksji z arkusza…':verifiedAt?'Odczyt arkusza potwierdzony: '+new Date(verifiedAt).toLocaleString('pl-PL',{timeZone:'Europe/Warsaw'})+'.':'');
  if(!selected.length){dest.innerHTML='<p>Wybierz jedno miejsce i datę albo zaznacz zapisane spotkania do porównania. Oceny zajęć zostaną pobrane automatycznie.</p>';return}
  const selectedRows=[...new Map(selected.flatMap(matches).map(r=>[r.id,r])).values()];
  dest.innerHTML=(verifiedAt?`<p><strong>${selectedRows.length} refleksji</strong> przypisanych do wybranego zakresu. Pytanie było otwarte, bez skali ocen — nie wyliczamy średniej ani procentu zadowolonych. Poniżej pełne wypowiedzi, także uwagi krytyczne; kolejność według czasu zapisu.</p>`:'')+selected.map(scope=>{
   const data=matches(scope),places=[...new Set(rows.filter(r=>r.date===scope.date).map(r=>r.city))].sort((a,b)=>a.localeCompare(b,'pl')),known=places.some(p=>norm(p)===norm(aliases[scope.id]||scope.place));
   const linkedElsewhere=selected.some(other=>other.id!==scope.id&&other.date===scope.date&&norm(aliases[other.id]||other.place)===norm(aliases[scope.id]||scope.place));
   return `<article class="evaluation-meeting"><h3>${esc(scope.place)} · ${esc(scope.date)}</h3>${!known&&places.length?`<p>Nazwa miejsca w arkuszu różni się od nazwy spotkania. Wybierz właściwe przypisanie; sama zgodność daty nie wystarcza.</p><label>Miejsce w arkuszu <select data-evaluation-alias="${esc(scope.id)}"><option value="">Wybierz miejsce…</option>${places.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('')}</select></label>`:''}${known?`<p class="subtle">Miejsce w arkuszu: ${esc(aliases[scope.id]||scope.place)}.${aliases[scope.id]?` <button data-evaluation-unlink="${esc(scope.id)}">Zmień przypisanie</button>`:''}</p>`:''}${linkedElsewhere?'<p>To samo miejsce i data są przypisane do kilku spotkań. Refleksje odnoszą się do tego łącznego zakresu; w sumie liczymy je tylko raz.</p>':''}${!data.length?`<p>${loading?'Trwa sprawdzanie arkusza.':verifiedAt?'Brak przypisanych refleksji dla tego miejsca i daty. Nie oznacza to negatywnej oceny zajęć.':'Oczekiwanie na odczyt arkusza.'}</p>`:`<p><strong>${data.length} wypowiedzi</strong>. Nie znamy liczby wszystkich zaproszonych do ewaluacji, więc nie wyliczamy frekwencji odpowiedzi.</p><ol class="evaluation-comments">${data.map(r=>`<li><blockquote>${esc(r.text)}</blockquote></li>`).join('')}</ol>`}</article>`;
  }).join('')+`<p class="stat-method">Źródło: <a href="${SHEET}" target="_blank" rel="noopener">arkusz „Refleksje”</a>. Dobór według miejsca i daty w strefie Europe/Warsaw. Opinie opisują odbiór zajęć przez autorów wypowiedzi; nie są samodzielnym pomiarem przyrostu wiedzy ani oceną wszystkich obecnych uczniów. ${error&&verifiedAt?'Wyświetlane są dane z ostatniego udanego odczytu.':''}</p>`;
 }
 function refresh(){
  if(timer)clearTimeout(timer);request=crypto.randomUUID();const id=request;loading=true;error='';render();const script=document.createElement('script');script.src=API+'?'+new URLSearchParams({action:'evaluationData',request:id,t:Date.now()});
  const fail=()=>{if(request!==id)return;loading=false;error='Nie udało się odświeżyć ocen zajęć. Ponowna próba za minutę; możesz też użyć przycisku odświeżania.';render()};
  script.onerror=()=>{script.remove();fail()};script.onload=()=>script.remove();document.body.append(script);timer=setTimeout(()=>{script.remove();if(loading)fail()},25000);
 }
 window.evalData=message=>{if(message.request!==request||!Array.isArray(message.rows))return;clearTimeout(timer);const seen=new Set();rows=message.rows.slice(1).filter(r=>String(r[2]||'').trim()).map((r,i)=>({time:r[0],date:day(r[0]),city:String(r[1]||''),text:String(r[2]),id:String(r[3]||JSON.stringify([r[0],r[1],r[2],i]))})).filter(r=>{if(seen.has(r.id))return false;seen.add(r.id);return true}).sort((a,b)=>new Date(a.time)-new Date(b.time));verifiedAt=Date.now();loading=false;error='';render()};
 function update(){const signature=JSON.stringify(scopes());if(signature!==lastScope){lastScope=signature;refresh()}else render()}
 $('evaluation-refresh').onclick=refresh;
 document.addEventListener('change',e=>{const sel=e.target.closest('[data-evaluation-alias]');if(sel){aliases[sel.dataset.evaluationAlias]=sel.value;try{localStorage.setItem('lustro-evaluation-place-aliases',JSON.stringify(aliases))}catch{}refresh()}});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-evaluation-unlink]');if(!b)return;delete aliases[b.dataset.evaluationUnlink];try{localStorage.setItem('lustro-evaluation-place-aliases',JSON.stringify(aliases))}catch{}render()});
 const previousRender=renderPortfolio;renderPortfolio=function(){previousRender();update()};
 setInterval(()=>{if(scopes().length&&!loading)refresh()},60000);update();
 return{day,norm,matches,scopes,refresh};
})();
