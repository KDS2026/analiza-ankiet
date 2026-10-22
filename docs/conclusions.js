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
  const delta=qs[1].pct-qs[0].pct;
  if(delta>3)parts.push(`Wzrost wyniku testu o ${fmt(delta)} p.p. wskazuje, że warsztaty skutecznie zwiększyły wiedzę uczestników o mechanizmach dezinformacji.`);
  else if(delta<-3)parts.push(`Spadek wyniku testu o ${fmt(Math.abs(delta))} p.p. wskazuje, że sposób przekazania i utrwalenia wiedzy wymaga korekty.`);
  else parts.push('Wynik testu pozostał zbliżony, dlatego w kolejnych warsztatach warto mocniej utrwalić najtrudniejsze zagadnienia.');
  const changes=Q.map((_,j)=>({j,d:qs[1].counts[j]/qs[1].n*100-qs[0].counts[j]/qs[0].n*100})),down=[...changes].sort((a,b)=>a.d-b.d)[0],up=[...changes].sort((a,b)=>b.d-a.d)[0];
  if(up.d>5)parts.push(`Największy postęp dotyczy pytania ${up.j+1} (+${fmt(up.d)} p.p.), co pokazuje, że ten mechanizm został szczególnie dobrze przyswojony.`);
  if(down.d<-5)parts.push(`Pytanie ${down.j+1} zanotowało spadek (${fmt(down.d)} p.p.), więc zagadnienie „${qs[1].questions[down.j].question}” powinno zostać wyraźniej wyjaśnione lub powtórzone.`);
 }
 const self=sets.map(s=>M.stats(s,'self')),others=sets.map(s=>M.stats(s,'others'));
 if(self.every(s=>s.pct!==null)){
  const d=self[1].pct-self[0].pct;if(d>3)parts.push(`Wzrost pozytywnej samooceny o ${fmt(d)} p.p. oznacza, że po zajęciach uczestnicy czują się pewniej w rozpoznawaniu dezinformacji.`);
 }
 if(self.every(s=>s.pct!==null)&&others.every(s=>s.pct!==null)){
  const gap=(self[1].pct-others[1].pct)-(self[0].pct-others[0].pct);if(gap>3)parts.push(`Jednocześnie powiększyła się różnica między oceną siebie i innych, co wskazuje, że uczestnicy przypisują nabyte kompetencje przede wszystkim sobie, a znacznie ostrożniej oceniają społeczeństwo.`);
 }
 const all=sets.map(s=>K.categoryStats(s,'Każdy / wszyscy',M)),age=sets.map(s=>K.categoryStats(s,'Wiek',M));
 if(all.every(s=>s.pct!==null)&&all[1].pct-all[0].pct>3)parts.push(`Częstsze wskazywanie, że podatny może być każdy (+${fmt(all[1].pct-all[0].pct)} p.p.), świadczy o szerszym rozumieniu powszechności podatności na dezinformację.`);
 if(age.every(s=>s.pct!==null)&&age[1].pct-age[0].pct<-3)parts.push(`Rzadsze wiązanie podatności z wiekiem (${fmt(age[1].pct-age[0].pct)} p.p.) wskazuje na osłabienie stereotypu, że dezinformacja dotyczy przede wszystkim określonych grup wiekowych.`);
 return parts.join(' ');
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
  let body=`${sentenceDelta('Udział pozytywnej samooceny',self.map(s=>s.pct),self.map(s=>s.n))} ${sentenceDelta('Odsetek pozytywnych ocen umiejętności innych',others.map(s=>s.pct),others.map(s=>s.n))}`;
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
 dest.innerHTML=`<div class="conclusion-grid">${cards.map(([title,body])=>`<article class="conclusion-card"><h3>${esc(title)}</h3><p>${esc(body)}</p></article>`).join('')}</div><p class="conclusion-limit"><strong>Podstawa ewaluacji:</strong> ${esc(limits.join('; '))}. ${esc(context)} Różne liczebności oznaczają liczbę odpowiedzi otrzymanych w poszczególnych narzędziach i pomiarach.</p>`;
}
const priorRender=render;
render=function(){priorRender();renderConclusions()};
const priorKnowledge=renderKnowledge;
renderKnowledge=function(){priorKnowledge();renderConclusions()};
renderConclusions();
})();
