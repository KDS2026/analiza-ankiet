'use strict';
window.StatTests=(()=>{
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const erf=x=>{const sign=x<0?-1:1,a=Math.abs(x),t=1/(1+.3275911*a),y=1-(((((1.061405429*t-1.453152027)*t+1.421413741)*t-.284496736)*t+.254829592)*t)*Math.exp(-a*a);return sign*y};
 const normalCdf=z=>(1+erf(z/Math.SQRT2))/2;
 const pText=p=>p<.001?'< 0,001':p.toLocaleString('pl-PL',{minimumFractionDigits:3,maximumFractionDigits:3});
 const num=v=>Number.isFinite(v)?v.toLocaleString('pl-PL',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
 function mannWhitney(before,after){
  const x=before.filter(Number.isFinite),y=after.filter(Number.isFinite),n1=x.length,n2=y.length;if(!n1||!n2)return null;
  const all=[...x.map(v=>({v,g:0})),...y.map(v=>({v,g:1}))].sort((a,b)=>a.v-b.v);let rank=1,sumAfter=0,tieTerm=0;
  for(let i=0;i<all.length;){let j=i+1;while(j<all.length&&all[j].v===all[i].v)j++;const t=j-i,avg=(rank+rank+t-1)/2;for(let k=i;k<j;k++)if(all[k].g===1)sumAfter+=avg;if(t>1)tieTerm+=t*t*t-t;rank+=t;i=j}
  const u=sumAfter-n2*(n2+1)/2,mean=n1*n2/2,N=n1+n2,variance=n1*n2/12*((N+1)-tieTerm/(N*(N-1))),z=variance>0?(u-mean)/Math.sqrt(variance):0,p=clamp(2*(1-normalCdf(Math.abs(z))),0,1),auc=u/(n1*n2),effect=2*auc-1,seEffect=2*Math.sqrt(variance)/(n1*n2),lo=clamp(effect-1.96*seEffect,-1,1),hi=clamp(effect+1.96*seEffect,-1,1);
  return{test:'Mann–Whitney',p,effect,effectName:'korelacja rangowo-dwuseryjna',ci:[lo,hi],n:[n1,n2],beforeMean:x.reduce((a,b)=>a+b,0)/n1,afterMean:y.reduce((a,b)=>a+b,0)/n2};
 }
 const logFact=n=>{let s=0;for(let i=2;i<=n;i++)s+=Math.log(i);return s},logChoose=(n,k)=>k<0||k>n?-Infinity:logFact(n)-logFact(k)-logFact(n-k);
 function fisher(a,b,c,d){
  const r1=a+b,r2=c+d,col=a+c,N=r1+r2,min=Math.max(0,col-r2),max=Math.min(r1,col),prob=x=>Math.exp(logChoose(r1,x)+logChoose(r2,col-x)-logChoose(N,col)),observed=prob(a);let p=0;for(let x=min;x<=max;x++){const q=prob(x);if(q<=observed+1e-12)p+=q}const correction=[a,b,c,d].some(v=>v===0)?0.5:0,A=a+correction,B=b+correction,C=c+correction,D=d+correction,or=C*B/(D*A),se=Math.sqrt(1/A+1/B+1/C+1/D),lo=Math.exp(Math.log(or)-1.96*se),hi=Math.exp(Math.log(or)+1.96*se);return{test:'dokładny Fishera',p:clamp(p,0,1),effect:or,effectName:'iloraz szans PO względem PRZED',ci:[lo,hi],n:[r1,r2]};
 }
 const ordinal=(rows,key)=>rows.map(r=>M.answer(r[key])).map(v=>['nie','raczej nie','raczej tak','tak'].indexOf(v)+1).filter(v=>v>0);
 const quizScores=s=>s?.hist?s.hist.flatMap((n,score)=>Array(n).fill(score)):s?.accepted?.map(r=>r.points)||[];
 const effectSize=value=>{const a=Math.abs(value);return a<.10?'bardzo mały':a<.30?'mały':a<.50?'umiarkowany':'duży'};
 const language=(result,noun='wyniku')=>{
  if(!result)return 'Do porównania potrzebne są odpowiedzi z obu pomiarów.';
  const d=(result.afterMean??0)-(result.beforeMean??0);
  const observation=d>0?`W pomiarze PO odnotowano wzrost ${noun}.`:d<0?`W pomiarze PO odnotowano spadek ${noun}.`:`Średni poziom ${noun} był taki sam w obu pomiarach.`;
  return observation+' '+(result.p<.05?'Wynik spełnia przyjęte kryterium istotności statystycznej (p < 0,05).':'Wynik nie spełnia przyjętego kryterium istotności statystycznej (p < 0,05).')+' Wielkość efektu: '+effectSize(result.effect)+' (korelacja rangowo-dwuseryjna '+num(result.effect)+'). Istotność statystyczna i siła efektu opisują różne właściwości wyniku; to porównanie nie ustala trwałości zmiany.';
 };
 const shareLanguage=(before,after)=>{
  if(!before.den||!after.den)return 'Do porównania potrzebne są odpowiedzi z obu pomiarów.';
  const a=before.num/before.den*100,b=after.num/after.den*100,d=b-a;
  return `Udział wskazań ${d>0?'wzrósł':d<0?'zmalał':'pozostał na tym samym poziomie'}: ${num(a)}% PRZED (${before.num} z ${before.den}) i ${num(b)}% PO (${after.num} z ${after.den}).`;
 };
 const resultHtml=r=>r?`<span>${r.test}; p ${r.p<.001?'&lt; 0,001':'= '+pText(r.p)}</span><span>${r.effectName}: <b>${num(r.effect)}</b>; 95% CI [${num(r.ci[0])}; ${num(r.ci[1])}]${r.test==='Mann–Whitney'?' · efekt '+effectSize(r.effect):''}</span>`:'<span>Brak danych do obliczenia.</span>';
 function comparisons(rows,qs){
  const sets=phaseNames.map(st=>rows.filter(r=>r.stage===st)),out=[];
  const quiz=mannWhitney(quizScores(qs[0]),quizScores(qs[1]));out.push({label:'Łączny wynik testu (0–7)',result:quiz,conclusion:language(quiz,'wyniku testu')});
  for(const [key,label]of[['self','Samoocena — pełna skala 1–4'],['others','Ocena umiejętności innych — pełna skala 1–4']]){const r=mannWhitney(ordinal(sets[0],key),ordinal(sets[1],key));out.push({label,result:r,conclusion:language(r,key==='self'?'samooceny':'oceny umiejętności innych')})}
  if(qs.every(s=>s?.n)&&quizVersionsMatch(qs))Q.forEach((_,j)=>{const r=fisher(qs[0].counts[j],qs[0].n-qs[0].counts[j],qs[1].counts[j],qs[1].n-qs[1].counts[j]);out.push({label:`Pytanie ${j+1} — odpowiedź poprawna`,result:r,conclusion:shareLanguage({num:qs[0].counts[j],den:qs[0].n},{num:qs[1].counts[j],den:qs[1].n})+' '+(r.p<.05?'Wynik spełnia przyjęte kryterium istotności statystycznej (p < 0,05); nie określa to siły ani znaczenia różnicy.':'To opis wyniku w badanej grupie; jego trwałość warto sprawdzić w kolejnym pomiarze.')})});
  const categories=[...new Set(rows.flatMap(K.categories))];for(const label of categories){const s=sets.map(x=>K.categoryStats(x,label,M)),r=fisher(s[0].n,s[0].base-s[0].n,s[1].n,s[1].base-s[1].n);out.push({label:`Kategoria „${label}”`,result:r,conclusion:shareLanguage({num:s[0].n,den:s[0].base},{num:s[1].n,den:s[1].base})+' '+(r.p<.05?'Wynik spełnia przyjęte kryterium istotności statystycznej (p < 0,05); nie określa to siły ani znaczenia różnicy.':'To opis wypowiedzi uczestników; dalsze spotkania pozwolą sprawdzić, czy ten kierunek się powtarza.')})}
  return out;
 }

 function sensitivity(rows){
  const full=phaseNames.map(st=>rows.filter(r=>r.stage===st)),trimmed=full.map(rr=>rr.filter(r=>!K.categories(r).includes('Nie na temat'))),removed=full.map((r,i)=>r.length-trimmed[i].length);
  const describeRows=(rr,key)=>{const stat=M.stats(rr,key),values=ordinal(rr,key);return{...stat,ordinalN:values.length,mean:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,yes:stat.n?stat.counts[3]/stat.n*100:null}};
  const dir=(a,b,t)=>a===null||b===null?null:b-a>t?'wzrost':b-a < -t?'spadek':'zbliżony poziom';
  const measures=[['self','Samoocena'],['others','Ocena umiejętności innych']].map(([key,label])=>{const all=full.map(rr=>describeRows(rr,key)),without=trimmed.map(rr=>describeRows(rr,key)),signals=values=>[dir(values[0].mean,values[1].mean,.01),dir(values[0].pct,values[1].pct,1),dir(values[0].yes,values[1].yes,1)],a=signals(all),b=signals(without);return{key,label,all,without,comparable:a.every(v=>v!==null)&&b.every(v=>v!==null),same:a.every((v,i)=>v===b[i]),directionsAll:a,directionsWithout:b}});
  const rel=variant=>variant.map(rr=>{const r=M.relative(rr);return{...r,pct:r.n?r.higher/r.n*100:null}}),a=rel(full),b=rel(trimmed),relative={all:a,without:b,same:dir(a[0].pct,a[1].pct,1)===dir(b[0].pct,b[1].pct,1),comparable:[...a,...b].every(r=>r.pct!==null)};
  return{removed,measures,relative,complete:measures.every(x=>x.comparable)&&relative.comparable,hasDifference:measures.some(x=>x.comparable&&!x.same)||(relative.comparable&&!relative.same)};
 }
 function sensitivityHtml(rows){if(!rows.length)return'';const s=sensitivity(rows);const summary=values=>values.map((v,i)=>`${phaseNames[i]}: średnia ${num(v.mean)} (n = ${v.ordinalN}); „tak” + „raczej tak” ${num(v.pct)}% (n = ${v.n}); samo „tak” ${num(v.yes)}%`).join('. ');
  return `<section class="stat-report-section sensitivity-analysis"><h4>Analiza wrażliwości — odpowiedzi otwarte „Nie na temat”</h4><p>Wynik podstawowy obejmuje wszystkie odpowiedzi. Dodatkowo przeliczamy ankiety bez tych, w których wypowiedź otwarta ma kategorię „Nie na temat”: pominięto w tym wariancie ${s.removed[0]} PRZED i ${s.removed[1]} PO. Żaden zapis nie jest usuwany ani zmieniany. Wykorzystujemy bieżące kategorie, w tym poprawki prowadzącej.</p>${s.measures.map(m=>`<article class="stat-report-item"><h5>${esc(m.label)}</h5><p><strong>Wszystkie odpowiedzi.</strong> ${esc(summary(m.all))}.</p><p><strong>Bez ankiet z kategorią „Nie na temat”.</strong> ${esc(summary(m.without))}.</p><p>${!m.comparable?'Brak kompletnych danych w obu wariantach; nie rozstrzygamy zgodności kierunków.':m.same?'Oba warianty prowadzą do tego samego wniosku o kierunkach zmian w trzech pokazanych wskaźnikach.':'Wniosek o kierunku zmian zależy od uwzględnienia tych ankiet — co najmniej jeden z trzech wskaźników zmienia opis kierunku.'}</p><p class="footnote">Kolejno: średnia, udział „tak” + „raczej tak”, udział samego „tak”. Wszystkie: ${m.directionsAll.map(v=>esc(v||'brak danych')).join('; ')}. Wariant dodatkowy: ${m.directionsWithout.map(v=>esc(v||'brak danych')).join('; ')}.</p></article>`).join('')}<article class="stat-report-item"><h5>Ocenianie siebie wyżej niż innych</h5><p>Wszystkie odpowiedzi: ${s.relative.all.map((v,i)=>phaseNames[i]+': '+v.higher+'/'+v.n+' ('+num(v.pct)+'%)').join('; ')}. Wariant dodatkowy: ${s.relative.without.map((v,i)=>phaseNames[i]+': '+v.higher+'/'+v.n+' ('+num(v.pct)+'%)').join('; ')}.</p><p>${!s.relative.comparable?'Brak pełnych danych do porównania.':s.relative.same?'Kierunek zmiany jest taki sam w obu wariantach.':'Wniosek o kierunku zmiany zależy od tych ankiet.'}</p></article><p class="stat-method">Porównujemy opisowe kierunki zmian: do 0,01 punktu średniej skali 1–4 i do 1 p.p. udziału traktujemy jako zbliżony poziom. To jawne umowne progi opisu, nie test istotności ani miara trafności samooceny. Wykluczenie w wariancie dodatkowym dotyczy całej ankiety wyłącznie na podstawie wskazanej kategorii wypowiedzi otwartej.</p></section>`;
 }

 function reportHtml(results,rows=[]){
  const sections=[['Samoocena i ocena umiejętności innych',results.filter(x=>x.label.startsWith('Samoocena')||x.label.startsWith('Ocena umiejętności'))],['Sposób rozumienia podatności na dezinformację',results.filter(x=>x.label.startsWith('Kategoria'))]];
  return `<div class="stat-report"><p class="stat-reading">Porównanie pokazuje, co zmieniło się w otrzymanych odpowiedziach PRZED i PO. Brak jednoznacznego rozstrzygnięcia w danym wskaźniku nie jest równoznaczny z brakiem wartości edukacyjnej zajęć. Samo porównanie nie ustala jednak, w jakim stopniu obserwowane zmiany są skutkiem warsztatów.</p>${sections.filter(([,items])=>items.length).map(([title,items])=>`<section class="stat-report-section"><h4>${esc(title)}</h4>${items.map(x=>`<article class="stat-report-item"><h5>${esc(x.label)}</h5><p>${esc(x.conclusion)}</p>${x.result?.beforeMean!==undefined?`<p>Średnia PRZED: <b>${num(x.result.beforeMean)}</b>; PO: <b>${num(x.result.afterMean)}</b>. Liczba odpowiedzi: ${x.result.n[0]} PRZED i ${x.result.n[1]} PO.</p>`:''}<p class="stat-calculation">Informacja o obliczeniach: ${resultHtml(x.result)}</p></article>`).join('')}</section>`).join('')}${sensitivityHtml(rows)}<p class="stat-method">Metoda: test Manna–Whitneya porównuje rozkłady wyników testu i odpowiedzi na skali 1–4; dokładny test Fishera porównuje udziały wskazań. Podajemy wartość p, wielkość różnicy oraz 95-procentowy przedział ufności. Odpowiedzi PRZED i PO nie są sparowane na poziomie osób. Wartości p mają charakter rozpoznawczy: wykonujemy wiele porównań, bez korekty na ich liczbę. Wynik zbiorczy może też zależeć od proporcji odpowiedzi z poszczególnych spotkań. Umowne progi wielkości korelacji rangowo-dwuseryjnej (wartość bezwzględna): poniżej 0,10 — bardzo mały efekt; od 0,10 do poniżej 0,30 — mały; od 0,30 do poniżej 0,50 — umiarkowany; od 0,50 — duży. Są to przyjęte progi opisowe, nie uniwersalne normy ani ocena wartości edukacyjnej zajęć.</p></div>`;
 }
 function render(){const dest=document.getElementById('statistical-results');if(!dest)return;const rows=filtered(),qs=[currentQuiz(0),currentQuiz(1)];if(!rows.length){dest.innerHTML='<p class="subtle">Wczytaj ankietę PRZED i PO, aby porównać wyniki.</p>';return}dest.innerHTML=reportHtml(comparisons(rows,qs),rows)}

 return{effectSize,sensitivity,sensitivityHtml,mannWhitney,fisher,ordinal,quizScores,language,comparisons,render,pText,resultHtml,reportHtml};
})();
