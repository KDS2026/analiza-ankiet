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
 const language=(result,noun='wynik')=>{if(!result)return 'Brak danych do testu.';const d=(result.afterMean??0)-(result.beforeMean??0),dir=d>0?'wzrost':d<0?'spadek':'różnicę';return result.p<.05?`Test wskazuje istotny ${dir} ${noun} (p = ${pText(result.p)}).`:`Zaobserwowano ${dir} ${noun}, ale wynik nie jest istotny statystycznie (p = ${pText(result.p)}); jest to tendencja wymagająca potwierdzenia na większej próbie.`};
 const resultHtml=r=>r?`<span>${r.test}; p ${r.p<.001?'&lt; 0,001':'= '+pText(r.p)}</span><span>${r.effectName}: <b>${num(r.effect)}</b>; 95% CI [${num(r.ci[0])}; ${num(r.ci[1])}]</span>`:'<span>Brak danych do obliczenia.</span>';
 function comparisons(rows,qs){
  const sets=phaseNames.map(st=>rows.filter(r=>r.stage===st)),out=[];
  const quiz=mannWhitney(quizScores(qs[0]),quizScores(qs[1]));out.push({label:'Łączny wynik testu (0–7)',result:quiz,conclusion:language(quiz,'wyniku testu')});
  for(const [key,label]of[['self','Samoocena — pełna skala 1–4'],['others','Ocena umiejętności innych — pełna skala 1–4']]){const r=mannWhitney(ordinal(sets[0],key),ordinal(sets[1],key));out.push({label,result:r,conclusion:language(r,key==='self'?'samooceny':'oceny umiejętności innych')})}
  if(qs.every(s=>s?.n)&&quizVersionsMatch(qs))Q.forEach((_,j)=>{const r=fisher(qs[0].counts[j],qs[0].n-qs[0].counts[j],qs[1].counts[j],qs[1].n-qs[1].counts[j]);out.push({label:`Pytanie ${j+1} — odpowiedź poprawna`,result:r,conclusion:r.p<.05?'Różnica odsetka poprawnych odpowiedzi jest istotna statystycznie.':'Różnica odsetka poprawnych odpowiedzi nie jest istotna statystycznie; traktujemy ją jako tendencję.'})});
  const categories=[...new Set(rows.flatMap(K.categories))];for(const label of categories){const s=sets.map(x=>K.categoryStats(x,label,M)),r=fisher(s[0].n,s[0].base-s[0].n,s[1].n,s[1].base-s[1].n);out.push({label:`Kategoria „${label}”`,result:r,conclusion:r.p<.05?'Zmiana częstości wskazań jest istotna statystycznie.':'Zmiana częstości wskazań nie jest istotna statystycznie; traktujemy ją jako tendencję.'})}
  return out;
 }
 function render(){const dest=document.getElementById('statistical-results');if(!dest)return;const rows=filtered(),qs=[currentQuiz(0),currentQuiz(1)];if(!rows.length){dest.innerHTML='<p class="subtle">Wczytaj ankietę PRZED i PO, aby wykonać testy statystyczne.</p>';return}const results=comparisons(rows,qs);dest.innerHTML=`<p class="stat-method">Mann–Whitney porównuje rozkłady wyniku testu oraz pełną, czterostopniową skalę odpowiedzi: nie = 1, raczej nie = 2, raczej tak = 3, tak = 4. Test Fishera porównuje odsetki poprawnych odpowiedzi i kategorie wypowiedzi. PRZED i PO analizujemy jako dwie niezależne próby, ponieważ pliki nie zawierają identyfikatorów pozwalających połączyć odpowiedzi tej samej osoby.</p><div class="stat-table table-scroll"><table><thead><tr><th>Porównanie</th><th>Test, wielkość efektu i 95% CI</th><th>Interpretacja</th></tr></thead><tbody>${results.map(x=>`<tr><td>${esc(x.label)}</td><td>${resultHtml(x.result)}</td><td>${esc(x.conclusion)}</td></tr>`).join('')}</tbody></table></div>`}
 return{mannWhitney,fisher,ordinal,quizScores,language,comparisons,render,pText,resultHtml};
})();
