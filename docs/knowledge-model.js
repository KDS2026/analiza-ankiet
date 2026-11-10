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
 const value=normalize(text);if(!value)return[];
 const offTopic=/^(oliwia g|frajerzy z otwocka|tusk|jolanta zietala|wanessa g|tymoteusz i szymonek z 3e|em a|szony|rahul rai|lysy|hypergamia gajdy|g|kamil kovalenko|kurwy|gajda)$/;
 if(offTopic.test(value))return['Nie na temat'];
 const found=[];
 const add=(label,pattern)=>{if(pattern.test(value))found.push(label)};
 add('Każdy / wszyscy',/(^|\b)(kazdy|kazda|kazdego|wszyscy|wszystkich|wszyyscy|wszytscy|wszyscy ludzie|kazdy czlowiek)(\b|$)/);
 add('Wiek',/dziec|mlodziez|mlod(zi|y|e)|star(si|sze|y)|senior|wiek/);
 add('Wykształcenie',/wyksztalc|niewyksztalc|edukac/);
 add('Wiedza',/niewiedz|brak wiedzy|niedoinform|nie maja wiedzy|malo wiedza/);
 add('Niska inteligencja',/glup|inteligenc|nieinteligent/);
 add('Łatwowierność / brak sprawdzania',/naiwn|latwowiern|wierza we wszystko|nie sprawdz|bez sprawdz|nie weryfik/);
 add('Emocje i strach',/emocj|strach|boja|przestrasz|panik/);
 add('Pośpiech / zmęczenie / stres',/pospiech|spiesza|zmecz|stres/);
 add('Otoczenie i źródła informacji',/internet|social media|media spolecz|telewiz|facebook|tiktok|otoczen|zrod(la|lo)|algorytm/);
 add('Nikt',/(^|\b)nikt(\b|$)/);
 add('Własna podatność („ja też”)',/^(ja|mnie|mi|rowniez ja|takze ja|ja tez)[.!? ]*$/);
 return found.length?[...new Set(found)]:['Inne'];
}
function canonicalCategory(label){const raw=String(label||'').trim(),key=normalize(raw);if(['ocena inteligencji','niska inteligencja'].includes(key))return'Niska inteligencja';if(['ja','rowniez ja','ja tez','takze ja','ja / rowniez ja','ja / wlasna podatnosc','wlasna podatnosc','wlasna podatnosc („ja tez”)','wlasna podatnosc ("ja tez")'].includes(key))return'Własna podatność („ja też”)';return raw}
const categories=r=>{const saved=[...new Set(String(r.category||'').split(/\s*[;|]\s*/).filter(Boolean).map(canonicalCategory))];return saved.length?saved:inferredCategories(r.text)};
function categoryStats(rows,label,survey){const coded=rows.filter(r=>categories(r).length),substantive=coded.filter(r=>!categories(r).includes('Nie na temat')),baseRows=label==='Nie na temat'?coded:substantive,selected=baseRows.filter(r=>categories(r).includes(label));return{n:selected.length,base:baseRows.length,pct:baseRows.length?selected.length/baseRows.length*100:null,self:survey.stats(selected,'self')}}
function rankSchools(meetings,maxPoints=7){const schools=new Map();for(const m of meetings||[]){const q=m.quiz?.[1];if(!m.place||!q?.n)continue;if(!schools.has(m.place))schools.set(m.place,{place:m.place,total:0,n:0,dates:[]});const school=schools.get(m.place);school.total+=Number(q.total)||0;school.n+=Number(q.n)||0;school.dates.push(m.date)}return[...schools.values()].map(s=>({...s,pct:s.total/s.n/maxPoints*100,average:s.total/s.n})).sort((a,b)=>b.pct-a.pct||b.n-a.n||a.place.localeCompare(b.place,'pl'))}
root.KnowledgeModel={dayKey,score,categories,inferredCategories,canonicalCategory,categoryStats,rankSchools};if(typeof module!=='undefined')module.exports=root.KnowledgeModel;
})(typeof window==='undefined'?globalThis:window);
