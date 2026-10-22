'use strict';
window.EvaluationInterpretation=(()=>{
 const pair=v=>Array.isArray(v)&&v.length===2&&v.every(Number.isFinite);
 const text=v=>v.toLocaleString('pl-PL',{maximumFractionDigits:1,minimumFractionDigits:1});
 const change=v=>`${text(v[0])}% PRZED → ${text(v[1])}% PO (${v[1]-v[0]>0?'+':''}${text(v[1]-v[0])} p.p.).`;
 function describe({everyone,age,self,test,linked=false}){
  const out=[];
  if(pair(everyone)){
   const d=everyone[1]-everyone[0];let meaning;
   if(d>.5)meaning='Częstsze wskazywanie „każdy / wszyscy” może oznaczać poszerzenie rozumienia podatności: uczestnicy rzadziej ograniczają problem do wybranych grup i częściej dopuszczają, że dotyczy on także ich samych. To kierunek zgodny z celem zajęć: zastępowanie myślenia „inni dają się nabrać” świadomością powszechnych mechanizmów poznawczych. Sama odpowiedź „wszyscy” nie dowodzi jednak osobistego przyznania się do podatności ani stosowania weryfikacji informacji.';
   else if(d<-.5)meaning='Rzadsze wskazywanie „każdy / wszyscy” oznacza, że po zajęciach mniej wypowiedzi wprost opisuje podatność jako powszechną. Może to wynikać z bardziej szczegółowego opisywania przyczyn albo z powrotu do wskazywania wybranych grup. Warto przeczytać odpowiedzi otwarte i ponownie omówić, że wiek czy wykształcenie nie zapewniają pełnej odporności.';
   else meaning='Udział wypowiedzi wskazujących powszechność podatności pozostał na zbliżonym poziomie. Ten wskaźnik nie pokazuje wyraźnego przesunięcia w sposobie opisywania problemu; warto sprawdzić, czy uczestnicy podają po zajęciach bardziej konkretne mechanizmy i sposoby ochrony.';
   out.push(['Co oznacza wskazanie „każdy może się nabrać”?',change(everyone)+' '+meaning+' Porównanie obejmuje wypowiedzi z przypisanymi kategoriami; rzetelność wniosku zależy od poprawnego kodowania.']);
  }else out.push(['Rozumienie powszechnej podatności','Do interpretacji zmiany potrzebne są skategoryzowane wypowiedzi z obu pomiarów. Nieskategoryzowanych odpowiedzi nie traktujemy jako kategorii „Inne” ani jako braku świadomości.']);
  if(pair(self)){
   const d=self[1]-self[0];let meaning;
   if(d<-.5){meaning='Spadek deklarowanej pewności nie musi oznaczać pogorszenia umiejętności. Po poznaniu mechanizmów manipulacji uczestnicy mogą ostrożniej oceniać własną odporność i dostrzegać wcześniejszą nadmierną pewność. Możliwe są też inne wyjaśnienia: trudność materiału, mniejsza wiara we własne możliwości lub inny skład osób odpowiadających. Sama ankieta nie rozstrzyga między nimi.';
    if(linked&&pair(test))meaning+=test[1]>test[0]+.5?' W tej grupie wynik testu jednocześnie wzrósł. Taki układ jest zgodny z możliwością bardziej krytycznej samooceny przy większej wiedzy, ale nie dowodzi tego u poszczególnych osób.':test[1]<test[0]-.5?' W tej grupie obniżył się także wynik testu. Nie ma więc podstaw, aby sam spadek pewności nazwać lepszą samooceną; warto wrócić do zagadnień sprawiających trudność.':' Wynik testu pozostał na zbliżonym poziomie. Ostrożniejsza samoocena jest możliwą interpretacją, ale wymaga potwierdzenia w zadaniach praktycznych.';
   }else if(d>.5){meaning='Wzrost deklarowanej pewności może wskazywać na większe poczucie przygotowania do rozpoznawania dezinformacji. Jest to zmiana przekonania o własnych możliwościach, a nie samodzielny dowód wzrostu umiejętności.';
    if(linked&&pair(test))meaning+=test[1]>test[0]+.5?' Równoczesny wzrost wyniku testu oznacza, że w obrazie grupy większej pewności towarzyszy lepszy wynik wiedzy. Bez połączenia odpowiedzi tych samych osób nie można określić trafności indywidualnej samooceny.':test[1]<test[0]-.5?' Wynik testu jednocześnie się obniżył. Większą pewność warto zatem sprawdzić w ćwiczeniach wymagających uzasadnienia i weryfikacji źródeł.':' Test nie pokazuje równoległego wzrostu wiedzy. Warto sprawdzić w praktyce, czy większa pewność przekłada się na trafne decyzje.';
   }else meaning='Poziom deklarowanej pewności pozostał zbliżony. Nie wyklucza to zmiany wiedzy ani sposobu myślenia; te elementy pokazują osobno test i odpowiedzi otwarte.';
   out.push(['Jak rozumieć zmianę pewności własnych umiejętności?',change(self)+' Udział odpowiedzi „tak” i „raczej tak”. '+meaning]);
  }
  if(pair(age)&&age[1]<age[0]-.5)out.push(['Co oznacza rzadsze wskazywanie wieku?',change(age)+' Uczestnicy rzadziej opisują podatność przez wiek. Może to oznaczać odchodzenie od prostego obrazu „to problem starszych lub młodych” w stronę wyjaśnień dotyczących mechanizmów, sytuacji i nawyków. Tę interpretację należy sprawdzić w pełnej treści wypowiedzi: sam spadek liczby odniesień do wieku nie dowodzi zaniku stereotypów.']);
  if(pair(test))out.push(['Co mówi wynik testu wiedzy?',change(test)+' '+(test[1]>test[0]+.5?'W pomiarze PO grupa uzyskała wyższy wynik w zadaniach dotyczących mechanizmów dezinformacji. To obserwacja zgodna z przyswojeniem sprawdzanych treści.':test[1]<test[0]-.5?'W pomiarze PO grupa uzyskała niższy wynik. To sygnał do sprawdzenia trudniejszych zagadnień, warunków wypełniania testu i różnic w składzie odpowiadających.':'Wynik grupy pozostał na zbliżonym poziomie. Test nie pokazuje wyraźnej zmiany w sprawdzanym zakresie; warto przyjrzeć się poszczególnym pytaniom i pozostałym elementom ewaluacji.')+' Test dotyczy wybranych treści, a nie pełnej odporności na manipulację w codziennym życiu. Trwałość wiedzy można ocenić dopiero w późniejszym pomiarze.']);
  return out;
 }
 const html=cards=>`<div class="conclusion-grid interpretation-cards">${cards.map(([title,body])=>`<article class="conclusion-card"><h3>${esc(title)}</h3><p>${esc(body)}</p></article>`).join('')}</div><p class="conclusion-limit">Interpretacje dotyczą grupy. Zmiana między pomiarami nie jest automatycznie zmianą tych samych osób ani dowodem przyczynowego wpływu zajęć. Wnioski warto zestawić z refleksjami uczestników i zadaniami praktycznymi.</p>`;
 return{describe,html};
})();
