'use strict';
window.EvaluationInterpretation=(()=>{
 const pair=v=>Array.isArray(v)&&v.length===2&&v.every(Number.isFinite);
 const text=v=>v.toLocaleString('pl-PL',{maximumFractionDigits:1,minimumFractionDigits:1});
 const change=v=>`${text(v[0])}% PRZED → ${text(v[1])}% PO (${v[1]-v[0]>0?'+':''}${text(v[1]-v[0])} p.p.).`;
 function confidenceProfile(sets){
  if(!Array.isArray(sets)||sets.length!==2)return null;
  const stats=sets.map(rows=>SurveyModel.stats(rows,'self')),relative=sets.map(rows=>SurveyModel.relative(rows));
  if(stats.some(s=>!s.n))return null;
  const rates=stats.map(s=>s.counts.map(n=>100*n/s.n)),positiveDelta=stats[1].pct-stats[0].pct,takDelta=rates[1][3]-rates[0][3];
  const mixed=positiveDelta < -1 && takDelta > 1;
  let summary='Pełny rozkład samooceny: '+['nie','raczej nie','raczej tak','tak'].map((label,i)=>`„${label}”: ${stats[0].counts[i]}/${stats[0].n} (${text(rates[0][i])}%) PRZED → ${stats[1].counts[i]}/${stats[1].n} (${text(rates[1][i])}%) PO`).join('; ')+'. ';
  if(stats.some(s=>s.counts[4]))summary+=`„Nie wiem”: ${stats[0].counts[4]} PRZED i ${stats[1].counts[4]} PO. `;
  if(relative.every(r=>r.n))summary+=`Udział osób oceniających siebie wyżej niż innych: ${text(relative[0].higher/relative[0].n*100)}% PRZED → ${text(relative[1].higher/relative[1].n*100)}% PO. `;
  if(mixed)summary+='Kierunki zmian są mieszane: zmniejszył się łączny udział „tak” i „raczej tak”, ale wzrósł udział zdecydowanego „tak”. Nie jest to podstawa do stwierdzenia, że cała grupa po zajęciach ostrożniej oceniała własne umiejętności. ';
  else summary+='Sam udział „tak” i „raczej tak” nie rozstrzyga, czy zmieniła się trafność samooceny ani świadomość własnych ograniczeń. ';
  const negative=sets[1].filter(r=>SurveyModel.answer(r.self)==='nie'),selfNamed=negative.filter(r=>SurveyModel.norm(r.text)==='ja').length,offTopic=typeof K!=='undefined'?negative.filter(r=>K.categories(r).includes('Nie na temat')).length:0;
  if(negative.length&&(selfNamed||offTopic)){summary+=`Wśród ${negative.length} odpowiedzi „nie” PO ${selfNamed?selfNamed+' towarzyszy wskazanie „ja” w pytaniu otwartym':''}${selfNamed&&offTopic?', a ':''}${offTopic?offTopic+' towarzyszą wpisy otwarte oznaczone jako „Nie na temat”':''}. `;if(selfNamed)summary+='Wskazanie siebie jest spójne z deklaracją ograniczeń, ale nie potwierdza zmiany u tych samych osób. ';if(offTopic)summary+='Niemerytoryczny wpis otwarty rodzi pytanie o zaangażowanie w ankietę, lecz sam nie unieważnia odpowiedzi zamkniętej; nie usuwamy jej automatycznie z obliczeń. ';}
  summary+='PRZED i PO to niepołączone odpowiedzi grupowe, o różnych liczebnościach; nie wskazują, które osoby zmieniły zdanie.';
  return {summary,mixed,stats,relative,positiveDelta,takDelta};
 }
 function describe({everyone,age,self,test,linked=false,profile=null}){
  const out=[];
  if(linked&&pair(test)&&pair(self)){
   const td=test[1]-test[0],sd=self[1]-self[0];
   let body=`Wynik testu: ${change(test)} Łączny udział „tak” i „raczej tak” w samoocenie: ${change(self)} `;
   if(profile?.mixed)body+='Pełny rozkład samooceny ma mieszane kierunki: wzrósł udział zdecydowanego „tak”, mimo spadku łącznego udziału pozytywnych samoocen. ';
   else body+=`Obserwowane kierunki opisujemy oddzielnie: wynik testu ${Math.abs(td)<=1?'pozostał zbliżony':td>0?'wzrósł':'spadł'}, a udział pozytywnych samoocen ${Math.abs(sd)<=1?'pozostał zbliżony':sd>0?'wzrósł':'spadł'}. `;
   if(test[0]<50&&self[0]>=60&&self[0]-test[0]>=15)body+='PRZED odnotowano na poziomie grupy rozbieżność między niższym wynikiem testu a wysokim udziałem pozytywnych samoocen. Nie wskazuje to, które osoby przeceniały swoje umiejętności. ';
   body+='Zgodność ani rozbieżność kierunków nie jest automatycznie korzystnym lub niekorzystnym wynikiem. Bez powiązania wyniku testu i samooceny tych samych osób nie da się ocenić trafności samooceny ani stwierdzić, czy wzrost pewności był adekwatny do wiedzy. Dotyczy to także sytuacji, w której oba wskaźniki rosną. Porównanie grup PRZED i PO nie pozwala śledzić zmian poszczególnych uczestników.';
   out.push(['Wiedza i pewność — co oznacza ich układ?',body]);
  }

  if(pair(everyone)){
   const d=everyone[1]-everyone[0];let meaning;
   if(d>1)meaning='Częstsze wskazywanie „każdy / wszyscy” może oznaczać poszerzenie rozumienia podatności: uczestnicy rzadziej ograniczają problem do wybranych grup i częściej dopuszczają, że dotyczy on także ich samych. To kierunek zgodny z celem zajęć: zastępowanie myślenia „inni dają się nabrać” świadomością powszechnych mechanizmów poznawczych. Sama odpowiedź „wszyscy” nie dowodzi jednak osobistego przyznania się do podatności ani stosowania weryfikacji informacji.';
   else if(d<-1)meaning='Rzadsze wskazywanie „każdy / wszyscy” oznacza, że po zajęciach mniej wypowiedzi wprost opisuje podatność jako powszechną. Może to wynikać z bardziej szczegółowego opisywania przyczyn albo z powrotu do wskazywania wybranych grup. Warto przeczytać odpowiedzi otwarte i ponownie omówić, że wiek czy wykształcenie nie zapewniają pełnej odporności.';
   else meaning='Udział wypowiedzi wskazujących powszechność podatności pozostał na zbliżonym poziomie. Ten wskaźnik nie pokazuje wyraźnego przesunięcia w sposobie opisywania problemu; warto sprawdzić, czy uczestnicy podają po zajęciach bardziej konkretne mechanizmy i sposoby ochrony.';
   out.push(['Co oznacza wskazanie „każdy może się nabrać”?',change(everyone)+' '+meaning+' Porównanie obejmuje wypowiedzi z przypisanymi kategoriami; rzetelność wniosku zależy od poprawnego kodowania.']);
  }else out.push(['Rozumienie powszechnej podatności','Do interpretacji zmiany potrzebne są skategoryzowane wypowiedzi z obu pomiarów. Nieskategoryzowanych odpowiedzi nie traktujemy jako kategorii „Inne” ani jako braku świadomości.']);
  if(pair(self)){
   const d=self[1]-self[0];let meaning;
   if(d<-1){meaning='Zmniejszył się łączny udział „tak” i „raczej tak”. Ten wskaźnik nie pokazuje, jak zmieniły się osobno cztery odpowiedzi ani ile osób oceniało siebie wyżej niż innych. Nie jest dowodem większej ostrożności ani bardziej krytycznej samooceny. Zmianę wyniku testu należy opisać osobno; sam jego wzrost nie potwierdza przyczyny zmiany deklaracji.';
   }else if(d>1){meaning='Wzrósł łączny udział pozytywnych samoocen. To opis deklaracji, a nie dowód większej trafności samooceny ani wzrostu umiejętności.';
    if(linked&&pair(test))meaning+=test[1]>test[0]+1?' Wynik testu również wzrósł. Same zgodne kierunki nie pokazują, czy pewność jest adekwatna do umiejętności; bez połączenia odpowiedzi tych samych osób nie można ocenić trafności samooceny.':test[1]<test[0]-1?' Wynik testu jednocześnie się obniżył. Większą pewność warto zatem sprawdzić w ćwiczeniach wymagających uzasadnienia i weryfikacji źródeł.':' Test nie pokazuje równoległego wzrostu wiedzy. Warto sprawdzić w praktyce, czy większa pewność przekłada się na trafne decyzje.';
   }else meaning='Poziom deklarowanej pewności pozostał zbliżony. Nie wyklucza to zmiany wiedzy ani sposobu myślenia; te elementy pokazują osobno test i odpowiedzi otwarte.';
   out.push(['Jak rozumieć zmianę pewności własnych umiejętności?',change(self)+' Łączny udział odpowiedzi „tak” i „raczej tak”. '+(profile?profile.summary:meaning)]);
  }
  if(pair(age)&&age[1]<age[0]-1)out.push(['Co oznacza rzadsze wskazywanie wieku?',change(age)+' Uczestnicy rzadziej opisują podatność przez wiek. Może to oznaczać odchodzenie od prostego obrazu „to problem starszych lub młodych” w stronę wyjaśnień dotyczących mechanizmów, sytuacji i nawyków. Tę interpretację należy sprawdzić w pełnej treści wypowiedzi: sam spadek liczby odniesień do wieku nie dowodzi zaniku stereotypów.']);
  if(pair(test))out.push(['Co mówi wynik testu wiedzy?',change(test)+' '+(test[1]>test[0]+1?'W pomiarze PO grupa uzyskała wyższy wynik w zadaniach dotyczących mechanizmów dezinformacji. To obserwacja zgodna z przyswojeniem sprawdzanych treści.':test[1]<test[0]-1?'W pomiarze PO grupa uzyskała niższy wynik. To sygnał do sprawdzenia trudniejszych zagadnień, warunków wypełniania testu i różnic w składzie odpowiadających.':'Wynik grupy pozostał na zbliżonym poziomie. Test nie pokazuje wyraźnej zmiany w sprawdzanym zakresie; warto przyjrzeć się poszczególnym pytaniom i pozostałym elementom ewaluacji.')+' Test dotyczy wybranych treści, a nie pełnej odporności na manipulację w codziennym życiu. Trwałość wiedzy można ocenić dopiero w późniejszym pomiarze.']);
  return out;
 }
 const html=cards=>`<div class="conclusion-grid interpretation-cards">${cards.map(([title,body])=>`<article class="conclusion-card"><h3>${esc(title)}</h3><p>${esc(body)}</p></article>`).join('')}</div><p class="conclusion-limit">Interpretacje dotyczą grupy. Zmiana między pomiarami nie jest automatycznie zmianą tych samych osób ani dowodem przyczynowego wpływu zajęć. Wnioski warto zestawić z refleksjami uczestników i zadaniami praktycznymi. Na potrzeby opisu: niższy wynik to poniżej 50% punktów, wysoki wynik to co najmniej 75%, a wysoki udział pozytywnych samoocen to co najmniej 75%. To jawne progi porządkujące opis, a nie normy diagnostyczne testu; zmiany do 1 p.p. opisujemy jako zbliżony poziom.</p>`;
 return{describe,html,confidenceProfile};
})();
