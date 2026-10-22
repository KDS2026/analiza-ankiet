'use strict';
let meetingArchive=[];
const ratio=(num,den)=>den?num/den*100:null;
function snapshotStat(rows,key){const s=M.stats(rows,key);return{positive:s.positive,n:s.n,pct:s.pct}}
function categorySnapshot(rows){const base=rows.filter(r=>K.categories(r).length).length,counts={};for(const r of rows)for(const c of K.categories(r))counts[c]=(counts[c]||0)+1;return{base,counts}}
function meetingSnapshot(){
 const rr=filtered();if(!rr.length||!uniqueSurveyScope())throw Error('W filtrach wybierz jedno miejsce i jedną datę spotkania.');
 const qs=[currentQuiz(0),currentQuiz(1)],date=K.dayKey(rr[0].time),place=rr[0].place;
 if(!qs.every(s=>s?.n&&!s.bad&&!s.unknown.length))throw Error('Wczytaj i poprawnie oceń oba testy: PRZED i PO.');
 if(!quizVersionsMatch(qs))throw Error('Testy PRZED i PO muszą mieć tę samą wersję pytań.');
 if(!quizDates.every(d=>d===date))throw Error('Daty obu testów muszą być zgodne z datą ankiety: '+date+'.');
 const sets=phaseNames.map(st=>rr.filter(r=>r.stage===st));if(sets.some(s=>!s.length))throw Error('Ankieta musi zawierać odpowiedzi PRZED i PO.');
 return{id:place+'|'+date,label:place+' · '+date,place,date,survey:sets.map(rows=>({n:rows.length,self:snapshotStat(rows,'self'),others:snapshotStat(rows,'others'),categories:categorySnapshot(rows)})),quiz:qs.map(s=>({n:s.n,total:s.total,pct:s.pct,counts:s.counts.slice(),questions:s.questions.map(q=>q.question)})),savedAt:new Date().toISOString()};
}
function saveMeeting(){try{const m=meetingSnapshot(),at=meetingArchive.findIndex(x=>x.id===m.id);if(at>=0)meetingArchive[at]=m;else meetingArchive.push(m);$('meeting-status').textContent=(at>=0?'Zaktualizowano: ':'Dodano do zbioru: ')+m.label+'.';renderPortfolio();if(typeof saveLocalAnalysis==='function')saveLocalAnalysis()}catch(e){$('meeting-status').textContent=e.message}}
function clearCurrentMeeting(){sources=[];refreshSources();quizFiles.fill(null);quizDates.fill('');quizManual[0]={};quizManual[1]={};$('link-confirm').checked=false;renderQuizSettings(0);renderQuizSettings(1);$('meeting-status').textContent='Bieżące pola są gotowe na pliki następnego spotkania. Zapisany zbiór pozostał bez zmian.';render();renderPortfolio()}
function sumMetric(key,phase){let num=0,den=0;for(const m of meetingArchive){const v=m.survey[phase][key];num+=v.positive;den+=v.n}return{num,den,pct:ratio(num,den)}}
function sumQuiz(phase){let total=0,n=0;for(const m of meetingArchive){total+=m.quiz[phase].total;n+=m.quiz[phase].n}return{total,n,pct:n?total/n/Q.length*100:null}}
function sumCategory(label,phase){let num=0,den=0;for(const m of meetingArchive){const v=m.survey[phase].categories;num+=v.counts[label]||0;den+=v.base}return{num,den,pct:ratio(num,den)}}
function aggregateConclusion(){
 const q=phaseNames.map((_,i)=>sumQuiz(i)),s=phaseNames.map((_,i)=>sumMetric('self',i)),all=phaseNames.map((_,i)=>sumCategory('Każdy / wszyscy',i)),age=phaseNames.map((_,i)=>sumCategory('Wiek',i));
 const qd=q[1].pct-q[0].pct,sd=s[1].pct-s[0].pct,ad=all[1].pct-all[0].pct,wd=age[1].pct-age[0].pct,parts=[];
 parts.push(qd>3?`Łączny wzrost wyniku testu o ${fmt(qd)} p.p. wskazuje, że cykl warsztatów skutecznie zwiększa wiedzę uczestników o mechanizmach dezinformacji.`:qd<-3?`Łączny wynik testu spadł o ${fmt(Math.abs(qd))} p.p.; program wymaga sprawdzenia treści i sposobu prowadzenia.`:'Łączny wynik testu pozostał zbliżony; potrzebne jest mocniejsze utrwalenie wiedzy.');
 if(sd>3)parts.push(`Wzrost samooceny o ${fmt(sd)} p.p. oznacza, że uczestnicy kończą zajęcia z większym przekonaniem, że potrafią rozpoznawać dezinformację.`);
 if(ad>3)parts.push(`Częstsze wskazywanie, że podatny może być każdy (+${fmt(ad)} p.p.), świadczy o szerszym rozumieniu powszechności mechanizmów dezinformacji.`);
 if(wd<-3)parts.push(`Rzadsze wiązanie podatności wyłącznie z wiekiem (${fmt(wd)} p.p.) wskazuje na osłabienie prostego stereotypu, że problem dotyczy przede wszystkim określonych grup wiekowych.`);
 return parts.join(' ');
}
function renderPortfolio(){
 $('meeting-list').innerHTML=meetingArchive.length?`<div class="meeting-chips">${meetingArchive.map(m=>`<span>${esc(m.label)}<button data-delete-meeting="${esc(m.id)}" aria-label="Usuń ${esc(m.label)}">×</button></span>`).join('')}</div>`:'<p class="subtle">Nie zapisano jeszcze żadnego spotkania.</p>';
 const panel=$('portfolio-panel');panel.hidden=!meetingArchive.length;if(!meetingArchive.length)return;
 const q=phaseNames.map((_,i)=>sumQuiz(i)),self=phaseNames.map((_,i)=>sumMetric('self',i)),others=phaseNames.map((_,i)=>sumMetric('others',i)),all=phaseNames.map((_,i)=>sumCategory('Każdy / wszyscy',i));
 const row=m=>{const d=(arr,key='pct')=>arr[1][key]-arr[0][key],qs=m.quiz.map(x=>x.pct),ss=m.survey.map(x=>x.self.pct),oo=m.survey.map(x=>x.others.pct),aa=m.survey.map(x=>ratio(x.categories.counts['Każdy / wszyscy']||0,x.categories.base));return`<tr><td>${esc(m.place)}<br><small>${esc(m.date)}</small></td><td>${fmt(qs[0])}% → ${fmt(qs[1])}%<br><b>${signed(d(qs.map(p=>({pct:p}))))} p.p.</b></td><td>${fmt(ss[0])}% → ${fmt(ss[1])}%<br><b>${signed(d(ss.map(p=>({pct:p}))))} p.p.</b></td><td>${fmt(oo[0])}% → ${fmt(oo[1])}%</td><td>${fmt(aa[0])}% → ${fmt(aa[1])}%</td><td>${m.survey[0].n}/${m.survey[1].n} · ${m.quiz[0].n}/${m.quiz[1].n}</td></tr>`};
 $('portfolio-results').innerHTML=`<div class="portfolio-kpis"><article><strong>${meetingArchive.length}</strong><span>spotkań</span></article><article><strong>${meetingArchive.reduce((n,m)=>n+m.survey[0].n+m.survey[1].n,0)}</strong><span>ankiet</span></article><article><strong>${meetingArchive.reduce((n,m)=>n+m.quiz[0].n+m.quiz[1].n,0)}</strong><span>testów</span></article></div><h3>Wynik zbiorczy wszystkich spotkań</h3><div class="chart-grid">${pairedBars('Test wiedzy',q.map(x=>x.pct),q.map(x=>`${x.n} testów`))}${pairedBars('Pozytywna samoocena',self.map(x=>x.pct),self.map(x=>`${x.num} z ${x.den} odpowiedzi`))}${pairedBars('Pozytywna ocena innych',others.map(x=>x.pct),others.map(x=>`${x.num} z ${x.den} odpowiedzi`))}${pairedBars('Podatny może być każdy',all.map(x=>x.pct),all.map(x=>`${x.num} z ${x.den} wypowiedzi`))}</div><div class="aggregate-conclusion"><h3>Wniosek z całego cyklu</h3><p>${esc(aggregateConclusion())}</p></div><h3>Analiza przekrojowa spotkań</h3><div class="table-scroll"><table><thead><tr><th>Spotkanie</th><th>Test PRZED → PO</th><th>Samoocena</th><th>Ocena innych</th><th>„Każdy / wszyscy”</th><th>n ankiet · testów</th></tr></thead><tbody>${meetingArchive.map(row).join('')}</tbody></table></div>`;
}
$('save-meeting').onclick=saveMeeting;$('next-meeting').onclick=clearCurrentMeeting;
document.addEventListener('click',e=>{const b=e.target.closest('[data-delete-meeting]');if(!b)return;meetingArchive=meetingArchive.filter(m=>m.id!==b.dataset.deleteMeeting);renderPortfolio();if(typeof saveLocalAnalysis==='function')saveLocalAnalysis()});
const portfolioRender=render;render=function(){portfolioRender();renderPortfolio()};
renderPortfolio();
