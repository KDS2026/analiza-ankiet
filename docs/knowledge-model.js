(function(root){
'use strict';
function dayKey(value){let s=String(value??'').trim(),m=s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);if(m)return m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');m=s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);return m?m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'):'Brak daty'}
function score(file,questions,engine,selectedDate,manual={}){
 const questionHeader=h=>engine.norm(h).replace(/^\d+\s+/,'');const resolved=questions.map(q=>{const variants=[q,...(q.variants||[])],matches=variants.filter(v=>file.header.some(h=>questionHeader(h)===engine.norm(v.question))),base=matches.length===1?{...q,...matches[0]}:q,max=Math.max(...variants.map(v=>v.options.length));base.answerAliases=Array.from({length:max},(_,i)=>[...new Set(variants.flatMap(v=>[v.options[i],...(Array.isArray(v.answerAliases?.[i])?v.answerAliases[i]:[v.answerAliases?.[i]])]).filter(Boolean))]);return base});questions=resolved;
 const map=engine.mapping(file,questions,manual),bad=map.some(m=>m.column<0||m.conflict);const time=file.header.findIndex(h=>/^(sygnatura|czas|timestamp|znacznik)/.test(engine.norm(h))),submissionId=file.header.findIndex(h=>/^(submissionid|identyfikator zgłoszenia|id zgłoszenia)$/.test(engine.norm(h)));
 const all=file.rows.filter(r=>map.some(m=>m.column>=0&&String(r.values[m.column]??'').trim())),dates=[...new Set(all.map(r=>dayKey(r.values[time])))].sort();
 const rows=all.filter(r=>selectedDate==='*'||dayKey(r.values[time])===selectedDate),counts=questions.map(()=>0),unknown=[],seen=new Set(),accepted=[],hist=Array(questions.length+1).fill(0);let incomplete=0,duplicates=0,missing=0;
 if(!bad)for(const r of rows){const id=submissionId>=0?String(r.values[submissionId]??'').trim():'';if(id&&seen.has(id)){duplicates++;continue}if(id)seen.add(id);let points=0,blanks=0,un=[];const answers=map.map((m,i)=>engine.matchAnswer(r.values[m.column],questions[i].options,questions[i].answerAliases));answers.forEach((a,i)=>{if(a.blank)blanks++;if(a.unknown)un.push({row:r.row,question:i,value:r.values[map[i].column]});if(a.index===questions[i].correct)points++});if(un.length){unknown.push(...un);continue}answers.forEach((a,i)=>{if(a.index===questions[i].correct)counts[i]++});if(blanks)incomplete++;missing+=blanks;hist[points]++;accepted.push({...r,points});}
 const n=accepted.length,total=accepted.reduce((s,r)=>s+r.points,0);return{questions:resolved,map,bad,dates,time,totalRows:all.length,selectedRows:rows.length,n,total,average:n?total/n:null,pct:n?total/n/questions.length*100:null,counts,hist,incomplete,missing,duplicates,unknown,excludedUnknown:new Set(unknown.map(u=>u.row)).size,accepted};
}
const normalize=v=>String(v??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').replace(/\s+/g,' ');
function inferredCategories(text){
 const original=String(text??'').trim(),value=normalize(original);if(!value)return[];
 const offTopic=/^(\.|oliwia g|frajerzy z otwocka|franek jasiu milan i eryk|basia chodecka klasa 2e i ada rzepniewska klasa 2e|basia i krysia|ada i krysia|wanessa|zdzisiek|kamil sikora|tusk|jolanta zietala|wanessa g|tymoteusz i szymonek z 3e|em a|szony|rahul rai|lysy|hypergamia gajdy|g|kamil kovalenko|kurwy|gajda|lamusy|ciapaki co nie sluchaly warsztatow|lewackie qwy|stare chuje i stare cipy|lyse stare osoby lysy)$/;
 if(offTopic.test(value)||/\b(kurw|chuj|cip|qwy)\b/.test(value))return['Nie na temat'];
 if(/^(nie wiem|brak odpowiedzi|nie mam zdania|trudno powiedziec)[.!? ]*$/.test(value))return['Brak odpowiedzi / nie wiem'];
 const found=[];
 const add=(label,pattern)=>{if(pattern.test(value))found.push(label)};
 add('Każdy / wszyscy',/(^|\b)(kazdy|kazda|kazdego|wszyscy|wszystkich|wszyyscy|wszytscy|wszycy|wszysxy|wszyscy ludzie|kazdy czlowiek|spoleczenstw\w*)(\b|$)|^(moim zdaniem )?(to )?ludzie( daja sie nabrac)?[.! ]*$|^osoby lub grupy[.! ]*$|^ktos na ?pewno[.! ]*$|^ktokolwiek\b/);
 if(!/(niezalezn\w* od wieku|bez wzgledu na wiek)/.test(value))add('Wiek',/dziec|mlodziez|mlod(?:zi|y|e)|uczni|nastolat|dorosl|rodzic|\btata\b|\bmama\b|\bstar(?:si|sze|szy|zy|y|e|cy|uch)\b|strasi|strasze osob|senior|sinierz|emeryt|rencist|geriat|dziadk|babci|\bwiek(?:u|iem|owi)?\b|milenials/);
 add('Wykształcenie',/wyksztalc|niewyksztalc|edukac/);
 add('Wiedza',/niewiedz|brak wiedzy|niedoinform|niedoeduk|nieuk|nie maja wiedzy|malo wiedza|nie maja pojecia|brak pojecia|nieswiadom|nie swiadom|mala swiadom|nie interesuj|kompetencj.*medial/);
 add('Niska inteligencja',/glup|inteligenc|inteligent|nieinteligent|debil|durn|cymbal|troglodyt|nie maja swojego rozumu|krytyczn.*mysl/);
 add('Łatwowierność / brak sprawdzania',/naiwn|latwowiern|latwo wier|wierza we wszystko|\bufn|nie sprawdz|bez sprawdz|nie weryfik|nie [^,.;]{0,30}weryfik|niesprawdzon|nieuwaz|nie uwaz/);
 add('Emocje i strach',/emocj|strach|boja|przestrasz|panik|impulsyw/);
 add('Pośpiech / zmęczenie / stres',/pospiech|spiesza|na szybko|zmecz|stres/);
 add('Otoczenie i źródła informacji',/internet|social media|media spolecz|telewiz|facebook|tiktok|tvn|republik|\bai\b|otoczen|zrod(la|lo|el)|algorytm/);
 add('Uprzedzenia i nastawienie',/nastawieni negatywnie|uprzedzen|potwierdz\w* (wlasne )?(poglady|przekonania)|zgodn\w* z (wlasnymi )?(poglady|przekonaniami)/);
 add('Nikt',/(^|\b)nikt(\b|$)/);
 add('Własna podatność („ja też”)',/^(ja|mnie|mi|rowniez ja|takze ja|ja tez)[.!? ]*$/);
 if(found.length)return[...new Set(found)];
 if(/\p{Extended_Pictographic}/u.test(original)||(/^[^aeiouyąęó]+$/i.test(value)&&value.length>=4))return['Nie na temat'];
 if(/^[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:\s+(?:i|z|klasa|\d+[a-z]?|[A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]\.?)?)*$/u.test(original))return['Nie na temat'];
 return['Inne'];
}
function canonicalCategory(label){const raw=String(label||'').trim(),key=normalize(raw);if(['ocena inteligencji','niska inteligencja'].includes(key))return'Niska inteligencja';if(['ja','rowniez ja','ja tez','takze ja','ja / rowniez ja','ja / wlasna podatnosc','wlasna podatnosc','wlasna podatnosc („ja tez”)','wlasna podatnosc ("ja tez")'].includes(key))return'Własna podatność („ja też”)';return raw}
const categories=r=>{const saved=[...new Set(String(r.category||'').split(/\s*[;|]\s*/).filter(Boolean).map(canonicalCategory))];return saved.length&&(r.categoryManual||r.categoryApproved!==false)?saved:inferredCategories(r.text)};
function categoryStats(rows,label,survey){const coded=rows.filter(r=>categories(r).length),excluded=new Set(['Nie na temat','Brak odpowiedzi / nie wiem']),substantive=coded.filter(r=>!categories(r).some(c=>excluded.has(c))),baseRows=excluded.has(label)?coded:substantive,selected=baseRows.filter(r=>categories(r).includes(label));return{n:selected.length,base:baseRows.length,pct:baseRows.length?selected.length/baseRows.length*100:null,self:survey.stats(selected,'self')}}
function rankSchools(meetings,maxPoints=7){const schools=new Map();for(const m of meetings||[]){const q=m.quiz?.[1];if(!m.place||!q?.n)continue;if(!schools.has(m.place))schools.set(m.place,{place:m.place,total:0,n:0,dates:[]});const school=schools.get(m.place);school.total+=Number(q.total)||0;school.n+=Number(q.n)||0;school.dates.push(m.date)}return[...schools.values()].map(s=>({...s,pct:s.total/s.n/maxPoints*100,average:s.total/s.n})).sort((a,b)=>b.pct-a.pct||b.n-a.n||a.place.localeCompare(b.place,'pl'))}
root.KnowledgeModel={dayKey,score,categories,inferredCategories,canonicalCategory,categoryStats,rankSchools};if(typeof module!=='undefined')module.exports=root.KnowledgeModel;
})(typeof window==='undefined'?globalThis:window);
