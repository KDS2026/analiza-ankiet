'use strict';
(()=>{
 const API='https://script.google.com/macros/s/AKfycbxv6mjIeO8EnGjwa48GYOndW5psqIWIM54TY-RDm3Or0iwR2_l-iJio9vSRrB_cvAmR/exec';
 const rounds=[['przed','PRZED'],['po','PO']];
 let pending=new Map(),busy=false;
 const cell=(row,index)=>String(row[index]??'').trim();
 function requestRound(round){
  return new Promise((resolve,reject)=>{
   const request=crypto.randomUUID(),script=document.createElement('script');
   const finish=(error,value)=>{clearTimeout(timer);pending.delete(request);script.remove();error?reject(error):resolve(value)};
   const timer=setTimeout(()=>finish(Error('Arkusz '+round.toUpperCase()+' nie odpowiedział w ciągu 25 sekund.')),25000);
   pending.set(request,{round,finish});script.onerror=()=>finish(Error('Nie udało się połączyć z arkuszem '+round.toUpperCase()+'.'));
   script.src=API+'?action=data&round='+round+'&request='+encodeURIComponent(request)+'&t='+Date.now();
   document.head.appendChild(script);
  });
 }
 window.glosData=message=>{
  const job=pending.get(message?.request);if(!job||job.round!==message.round)return;
  Array.isArray(message.rows)?job.finish(null,message.rows):job.finish(Error('Arkusz zwrócił nieprawidłowe dane.'));
 };
 function sourceFromRows(rows,round,stage){
  if(!Array.isArray(rows)||rows.length<2)throw Error('Arkusz '+stage+' nie zawiera odpowiedzi.');
  const header=rows[0].map(M.norm),find=(...needles)=>header.findIndex(h=>needles.some(n=>h.includes(n)));
  const ix={time:find('sygnatura czasowa','timestamp'),text:find('kto daje sie nabrac'),self:find('czy ty umiesz'),others:find('czy ludzie w polsce'),place:find('miejscowosc'),stage:find('pomiar'),approved:find('kategorie zatwierdzone'),automatic:find('archiwum automatycznych kategorii')};
  if(ix.time<0||ix.text<0||ix.self<0||ix.others<0)throw Error('W arkuszu '+stage+' nie rozpoznano wymaganych kolumn.');
  const parsed=[];
  for(const row of rows.slice(1)){
   if(![ix.time,ix.text,ix.self,ix.others].some(i=>i>=0&&cell(row,i)))continue;
   parsed.push({time:cell(row,ix.time),text:cell(row,ix.text),self:cell(row,ix.self),others:cell(row,ix.others),place:cell(row,ix.place)||'Nie podano miejsca',stage:cell(row,ix.stage).toUpperCase()||stage,category:cell(row,ix.approved)||cell(row,ix.automatic)});
  }
  if(!parsed.length)throw Error('Arkusz '+stage+' nie zawiera odpowiedzi do analizy.');
  return{id:'google-survey-'+round,name:'Arkusz Google · chmura '+stage,googleSurvey:true,sheets:[stage],rows:parsed};
 }
 async function loadGoogleSurvey({silent=false}={}){
  if(busy)return false;busy=true;const button=$('google-refresh-all'),status=$('google-sync-status');if(button)button.disabled=true;
  if(!silent)status.textContent='Pobieram ankietę PRZED i PO z arkuszy Google…';
  try{
   const payloads=await Promise.all(rounds.map(([round])=>requestRound(round))),fresh=payloads.map((rows,i)=>sourceFromRows(rows,rounds[i][0],rounds[i][1]));
   // Automatyczny odczyt jest źródłem nadrzędnym. Zastępuje bieżące ręczne kopie, aby tych samych odpowiedzi nie policzyć dwa razy.
   sources=fresh;
   refreshSources();status.textContent=`Pobrano chmurę: PRZED ${fresh[0].rows.length} odpowiedzi, PO ${fresh[1].rows.length} odpowiedzi. Odczyt: ${new Date().toLocaleString('pl-PL',{timeZone:'Europe/Warsaw'})}.`;
   if(typeof saveLocalAnalysis==='function')saveLocalAnalysis();return true;
  }catch(e){status.textContent='Nie udało się odświeżyć chmury. Zachowano dane, które były wcześniej w aplikacji. '+e.message;return false}
  finally{busy=false;if(button)button.disabled=false}
 }
 async function refreshAll(){
  const button=$('google-refresh-all'),status=$('google-sync-status');if(button)button.disabled=true;status.textContent='Odświeżam chmurę, oba quizy i oceny zajęć…';
  const survey=await loadGoogleSurvey({silent:true});
  const quizzes=typeof loadGoogleQuizzes==='function'?loadGoogleQuizzes():Promise.resolve();
  if(window.WorkshopEvaluation?.refresh)window.WorkshopEvaluation.refresh();
  await Promise.allSettled([quizzes]);if(button)button.disabled=false;return survey;
 }
 window.loadGoogleSurvey=loadGoogleSurvey;window.refreshAllGoogleData=refreshAll;
 $('google-refresh-all').onclick=refreshAll;
 // Po odtworzeniu lokalnego stanu pobieramy świeże dane. Zapisane spotkania pozostają bez zmian.
 setTimeout(refreshAll,0);
})();
