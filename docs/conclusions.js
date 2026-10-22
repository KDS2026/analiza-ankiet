'use strict';
(function(){
const direction=(delta,threshold=1)=>delta>threshold?'wzrósł':delta<-threshold?'spadł':'pozostał na zbliżonym poziomie';
const availablePair=values=>values.every(v=>v!==null&&Number.isFinite(v));
const sentenceDelta=(label,values,bases)=>{
 if(!availablePair(values))return `${label}: do porównania potrzebne są dane z obu pomiarów.`;
 const d=values[1]-values[0];
 return `${label} ${direction(d)}: ${fmt(values[0])}% PRZED (n = ${bases[0]}) i ${fmt(values[1])}% PO (n = ${bases[1]}), czyli ${signed(d)} p.p.`;
};
function topCategories(rows,limit=3){
 const coded=rows.filter(r=>K.categories(r).length),counts=new Map();
 for(const r of coded)for(const label of K.categories(r))counts.set(label,(counts.get(label)||0)+1);
 return {base:coded.length,items:[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'pl')).slice(0,limit)};
}
function categoryText(stage,rows){
 const top=topCategories(rows);
 if(!top.base)return `${stage}: brak odpowiedzi z rozpoznanymi kategoriami.`;
 if(!top.items.length)return `${stage}: nie wskazano kategorii.`;
 return `${stage}: najczęściej pojawiały się ${top.items.map(([label,n])=>`„${label}” (${n} z ${top.base}; ${fmt(n/top.base*100)}%)`).join(', ')}.`;
}
const gapDescription=value=>value>1?'wyżej':value<-1?'niżej':'podobnie';
function weakestQuestion(qs){
 const result=[];
 qs.forEach((s,i)=>{
  if(!s?.n||s.bad||s.unknown.length)return;
  let min=Math.min(...s.counts),indexes=s.counts.map((n,j)=>n===min?j:-1).filter(j=>j>=0);
  result.push(`${phaseNames[i]}: ${indexes.map(j=>`${j+1}. „${s.questions[j].question}”`).join(' oraz ')} — ${fmt(min/s.n*100)}% poprawnych odpowiedzi`);
 });
 return result.length?`Najwięcej trudności sprawiło: ${result.join('; ')}.`:'Nie można wskazać najtrudniejszych pytań bez poprawnie ocenionego testu.';
}
function inferenceText(qs,sets){
 const parts=[];
 if(qs.every(s=>s?.n)&&quizVersionsMatch(qs)){
  const delta=qs[1].pct-qs[0].pct,test=StatTests.mannWhitney(StatTests.quizScores(qs[0]),StatTests.quizScores(qs[1]));
  if(test?.p<.05&&delta>0)parts.push(`Wynik testu po warsztacie był istotnie wyższy niż przed warsztatem: różnica ${fmt(delta)} p.p., p ${StatTests.pText(test.p)}.`);
  else if(test?.p<.05&&delta<0)parts.push(`Wynik testu po warsztacie był istotnie niższy niż przed warsztatem: różnica ${fmt(delta)} p.p., p ${StatTests.pText(test.p)}.`);
  else parts.push(`Wynik testu po warsztacie różnił się o ${signed(delta)} p.p.; jest to tendencja wymagająca potwierdzenia na większej próbie (p = ${test?StatTests.pText(test.p):'—'}).`);
  const changes=Q.map((_,j)=>({j,d:qs[1].counts[j]/qs[1].n*100-qs[0].counts[j]/qs[0].n*100})),down=[...changes].sort((a,b)=>a.d-b.d)[0],up=[...changes].sort((a,b)=>b.d-a.d)[0];
  if(up.d>5){const r=StatTests.fisher(qs[0].counts[up.j],qs[0].n-qs[0].counts[up.j],qs[1].counts[up.j],qs[1].n-qs[1].counts[up.j]);parts.push(`Największa różnica dodatnia dotyczy pytania ${up.j+1} (+${fmt(up.d)} p.p.) i ${r.p<.05?'jest istotna statystycznie':'stanowi tendencję wymagającą potwierdzenia na większej próbie'} (p = ${StatTests.pText(r.p)}).`)}
  if(down.d<-5){const r=StatTests.fisher(qs[0].counts[down.j],qs[0].n-qs[0].counts[down.j],qs[1].counts[down.j],qs[1].n-qs[1].counts[down.j]);parts.push(`W pytaniu ${down.j+1} odsetek poprawnych odpowiedzi był niższy o ${fmt(Math.abs(down.d))} p.p.; ${r.p<.05?'różnica jest istotna statystycznie':'jest to tendencja wymagająca potwierdzenia na większej próbie'} (p = ${StatTests.pText(r.p)}). Zagadnienie „${qs[1].questions[down.j].question}” warto wyraźniej wyjaśnić lub powtórzyć.`)}
 }
 const self=sets.map(s=>M.stats(s,'self')),others=sets.map(s=>M.stats(s,'others')),selfTest=StatTests.mannWhitney(StatTests.ordinal(sets[0],'self'),StatTests.ordinal(sets[1],'self'));
 if(selfTest){const d=selfTest.afterMean-selfTest.beforeMean;if(selfTest.p<.05)parts.push(`Samoocena na pełnej skali 1–4 była po warsztacie istotnie ${d>0?'wyższa':'niższa'} (średnia ${fmt(selfTest.beforeMean,2)} → ${fmt(selfTest.afterMean,2)}; p = ${StatTests.pText(selfTest.p)}).`);else parts.push(`Samoocena na pełnej skali 1–4 zmieniła się ze średniej ${fmt(selfTest.beforeMean,2)} do ${fmt(selfTest.afterMean,2)}; jest to tendencja wymagająca potwierdzenia na większej próbie (p = ${StatTests.pText(selfTest.p)}).`)}
 if(self.every(s=>s.pct!==null)&&others.every(s=>s.pct!==null)){
  const gap=(self[1].pct-others[1].pct)-(self[0].pct-others[0].pct);if(gap>3)parts.push(`Opisowo powiększyła się różnica między oceną siebie i innych: uczestnicy częściej wysoko oceniali siebie niż społeczeństwo.`);
 }
 const all=sets.map(s=>K.categoryStats(s,'Każdy / wszyscy',M)),age=sets.map(s=>K.categoryStats(s,'Wiek',M));
 if(all.every(s=>s.pct!==null)&&all[1].pct-all[0].pct>3){const r=StatTests.fisher(all[0].n,all[0].base-all[0].n,all[1].n,all[1].base-all[1].n);parts.push(`Wskazanie, że podatny może być każdy, było częstsze o ${fmt(all[1].pct-all[0].pct)} p.p.; ${r.p<.05?'różnica jest istotna statystycznie':'jest to tendencja wymagająca potwierdzenia na większej próbie'} (p = ${StatTests.pText(r.p)}).`)}
 if(age.every(s=>s.pct!==null)&&age[1].pct-age[0].pct<-3){const r=StatTests.fisher(age[0].n,age[0].base-age[0].n,age[1].n,age[1].base-age[1].n);parts.push(`Wiązanie podatności z wiekiem było rzadsze o ${fmt(Math.abs(age[1].pct-age[0].pct))} p.p.; ${r.p<.05?'różnica jest istotna statystycznie':'jest to tendencja wymagająca potwierdzenia na większej próbie'} (p = ${StatTests.pText(r.p)}).`)}
 return parts.join(' ');
}
function recommendationItems(qs,sets){
 const items=[
  'Przekazać szkole krótkie podsumowanie ewaluacji z wynikami PRZED i PO oraz omówić z dyrekcją lub koordynującym nauczycielem najważniejsze zmiany.',
  'Zachęcić nauczycieli do dalszego podejmowania tematu dezinformacji podczas lekcji, godzin wychowawczych i rozmów o bieżących treściach z internetu.',
  'Przesłać szkole krótkie materiały dla uczniów: listę kroków weryfikacji informacji, przykłady sprawdzania źródeł oraz pytania pomocne przed udostępnieniem treści.',
  'Przekazać gotowe infografiki do wywieszenia w gazetce szkolnej i udostępnienia w kanałach używanych przez szkołę, aby najważniejsze zasady pozostały widoczne po warsztatach.'
 ];
 if(qs[1]?.n&&!qs[1].bad&&!qs[1].unknown.length){const rates=qs[1].counts.map(n=>n/qs[1].n*100),min=Math.min(...rates),j=rates.indexOf(min);items.splice(1,0,`W materiałach uzupełniających położyć szczególny nacisk na zagadnienie: „${qs[1].questions[j].question}” — w pomiarze PO poprawnie odpowiedziało ${fmt(min)}% uczestników.`)}
 const all=sets.map(s=>K.categoryStats(s,'Każdy / wszyscy',M));if(all.every(s=>s.pct!==null)&&all[1].pct>all[0].pct)items.push('W dalszych działaniach utrwalać wniosek, że na dezinformację może być podatny każdy, a odporność zależy od nawyków sprawdzania informacji, nie od wieku czy przynależności do określonej grupy.');
 items.push('Jeżeli szkoła będzie kontynuowała temat, po kilku tygodniach można przeprowadzić krótki test przypominający, aby sprawdzić, które treści zostały utrwalone.');
 return items;
}
function renderConclusions(){
 const dest=$('conclusions');if(!dest)return;
 const rows=filtered(),sets=phaseNames.map(st=>stageRows(rows,st)),qs=[currentQuiz(0),currentQuiz(1)];
 const cards=[];
 if(qs.some(s=>s?.n)){
  const values=qs.map(s=>s?.pct??null),bases=qs.map(s=>s?.n||0),same=quizVersionsMatch(qs);
  let body=same?sentenceDelta('Średni wynik testu wiedzy',values,bases):'Testy zawierają różne wersje pytania 6, dlatego nie opisujemy zmiany całego wyniku jako bezpośrednio porównywalnej.';
  body+=` ${weakestQuestion(qs)}`;
  cards.push(['Wiedza',body]);
 }
 if(rows.length){
  const self=sets.map(s=>M.stats(s,'self')),others=sets.map(s=>M.stats(s,'others'));
  const selfTest=StatTests.mannWhitney(StatTests.ordinal(sets[0],'self'),StatTests.ordinal(sets[1],'self')),othersTest=StatTests.mannWhitney(StatTests.ordinal(sets[0],'others'),StatTests.ordinal(sets[1],'others'));
  let body=selfTest?`Samoocena na pełnej skali 1–4: średnia ${fmt(selfTest.beforeMean,2)} PRZED i ${fmt(selfTest.afterMean,2)} PO. ${StatTests.language(selfTest,'samooceny')} Wielkość efektu: ${fmt(selfTest.effect,2)}, 95% CI [${fmt(selfTest.ci[0],2)}; ${fmt(selfTest.ci[1],2)}]. `:'';
  if(othersTest)body+=`Ocena umiejętności innych na skali 1–4: średnia ${fmt(othersTest.beforeMean,2)} PRZED i ${fmt(othersTest.afterMean,2)} PO. ${StatTests.language(othersTest,'oceny innych')} `;
  body+=`Pomocniczo: ${sentenceDelta('udział odpowiedzi „tak” i „raczej tak” dla samooceny',self.map(s=>s.pct),self.map(s=>s.n))}`;
  if(self.every(s=>s.pct!==null)&&others.every(s=>s.pct!==null)){
   const gaps=self.map((s,i)=>s.pct-others[i].pct);
   body+=` Ankietowani oceniali siebie ${gapDescription(gaps[0])} względem innych PRZED (różnica ${signed(gaps[0])} p.p.) i ${gapDescription(gaps[1])} PO (${signed(gaps[1])} p.p.).`;
  }
  cards.push(['Samoocena i ocena innych',body]);
  cards.push(['Obraz podatności',`${categoryText('PRZED',sets[0])} ${categoryText('PO',sets[1])} Kategorie mogą się nakładać, więc ich udziały nie sumują się do 100%.`]);
 }
 if(rows.length&&qs.some(s=>s?.n)){
  const self=sets.map(s=>M.stats(s,'self'));
  if(quizVersionsMatch(qs)&&availablePair(qs.map(s=>s?.pct??null))&&availablePair(self.map(s=>s.pct))){
   const testDelta=qs[1].pct-qs[0].pct,selfDelta=self[1].pct-self[0].pct;
   let relation='Wiedza testowa i samoocena zmieniły się w tym samym kierunku.';
   if(Math.abs(testDelta)<=1||Math.abs(selfDelta)<=1)relation='Jeden z tych wskaźników pozostał na zbliżonym poziomie.';
   else if(Math.sign(testDelta)!==Math.sign(selfDelta))relation='Wiedza testowa i samoocena zmieniły się w przeciwnych kierunkach.';
   cards.push(['Wspólny obraz',`${relation} Test: ${signed(testDelta)} p.p.; samoocena: ${signed(selfDelta)} p.p. Są to uzupełniające się wyniki ewaluacji tej samej grupy uczestników przed i po warsztatach.`]);
  }
 }
 const inference=rows.length?inferenceText(qs,sets):'';
 if(inference)cards.push(['Wniosek',inference]);
 if(!cards.length){dest.innerHTML='<p class="subtle">Wczytaj dane, aby otrzymać ocenę opisową.</p>';return}
 const before=sets[0].length,after=sets[1].length,limits=[];
 if(rows.length)limits.push(`ankieta: ${before} odpowiedzi PRZED i ${after} PO`);
 if(qs.some(s=>s?.n))limits.push(`test: ${qs[0]?.n||0} PRZED i ${qs[1]?.n||0} PO`);
 const confirmed=$('link-confirm')?.checked;
 const context=confirmed?'Dane dotyczą tych samych warsztatów i tej samej grupy uczestników.':'Aby połączyć wyniki w jedną ewaluację, potwierdź wyżej, że pliki dotyczą tych samych warsztatów i tej samej grupy.';
 const recommendations=rows.length?recommendationItems(qs,sets):[];
 dest.innerHTML=`<div class="conclusion-grid">${cards.map(([title,body])=>`<article class="conclusion-card"><h3>${esc(title)}</h3><p>${esc(body)}</p></article>`).join('')}</div>${recommendations.length?`<section class="recommendations"><h3>Zalecenia na przyszłość</h3><p>Proponowane działania po zakończeniu ewaluacji:</p><ul>${recommendations.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></section>`:''}<p class="conclusion-limit"><strong>Podstawa ewaluacji:</strong> ${esc(limits.join('; '))}. ${esc(context)} Różne liczebności oznaczają liczbę odpowiedzi otrzymanych w poszczególnych narzędziach i pomiarach.</p>`;
 StatTests.render();
}
const priorRender=render;
render=function(){priorRender();renderConclusions()};
const priorKnowledge=renderKnowledge;
renderKnowledge=function(){priorKnowledge();renderConclusions()};
renderConclusions();
})();
