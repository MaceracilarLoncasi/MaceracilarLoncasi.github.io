function srbBase(){return document.querySelector('[data-srb-home]').getAttribute('href')}
function srbSiteURL(url){return srbBase().slice(0,-'sistem-referans-belgesi/'.length)+url.replace(/^\//,'')}
function srbChapterURL(chapter){return srbBase()+chapter.id+'/'}
function srbReference(id){
 const chapter=SRB.chapters.find(c=>c.id===id);if(chapter)return srbChapterURL(chapter);
 for(const c of SRB.chapters){if(c.sections.some(s=>s.id===id))return srbChapterURL(c)+'#'+id}
 const ref=SRB.references[id];return ref?.url?srbSiteURL(ref.url):null;
}
function srbInline(text){
 const plain=t=>t.split(/(\*\*[^*]+\*\*)/g).map(part=>part.startsWith('**')?'<strong>'+linked(part.slice(2,-2),'',false,true)+'</strong>':linked(part,'',false,true)).join('');let html='',last=0;
 for(const m of text.matchAll(/\[\[([^|]+)\|([^\]]+)\]\]/g)){
  html+=plain(text.slice(last,m.index));const href=srbReference(m[1]);
  const entry=href?ENTRIES.find(e=>!e.category&&e.url===href):null;
  const preview=entry?` class="term" data-term="${esc(entry.slug)}"`:'';
  html+=href?`<a${preview} href="${esc(href)}">${esc(m[2])}</a>`:`<span data-srb-reference="${esc(m[1])}">${esc(m[2])}</span>`;
  last=m.index+m[0].length;
 }
 return html+plain(text.slice(last));
}
function srbBlocks(blocks){
 let result='',ordered=false;
 for(const b of blocks){
  if(b.kind!=='step'&&ordered){result+='</ol>';ordered=false}
  if(b.kind==='list'){result+='<ul>'+b.items.map(item=>'<li>'+srbInline(item)+'</li>').join('')+'</ul>';continue}
  if(b.kind==='table'){
   if(b.layout==='spell-progression'){
    const slotCount=b.slotCount===5?5:9;const fixedCount=b.headers.length-slotCount;const fixed=b.headers.slice(0,fixedCount).map(h=>`<th scope="col" rowspan="2">${esc(h)}</th>`).join('');
    result+=`<div class="srb-table-wrap" tabindex="0" role="region" aria-label="Sınıf özellikleri ve büyü yuvaları"><table class="srb-table srb-spell-progression${fixedCount===6?' srb-druid-progression':''}"><thead><tr>${fixed}<th colspan="${slotCount}" scope="colgroup">Büyü Seviyesine Göre Büyü Yuvaları</th></tr><tr>${b.headers.slice(fixedCount).map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(row=>`<tr>${row.map((cell,i)=>i===0?`<th scope="row">${srbInline(cell)}</th>`:`<td>${srbInline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;continue;
   }
   result+=`<div class="srb-table-wrap" tabindex="0" role="region" aria-label="${esc(b.headers.join(', '))}"><table class="srb-table">${b.caption?`<caption>${esc(b.caption)}</caption>`:''}<thead><tr>${b.headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(row=>`<tr>${row.map((cell,i)=>i===0?`<th scope="row">${srbInline(cell)}</th>`:`<td>${srbInline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;continue;
  }
  if(b.kind==='step'&&!ordered){result+=Number.isInteger(b.start)&&b.start>1?`<ol start="${b.start}">`:'<ol>';ordered=true}
  const content=(b.label?`<strong>${esc(b.label)}</strong> `:'')+srbInline(b.text);
  result+=b.kind==='step'?`<li>${content}</li>`:`<p>${content}</p>`;
 }
 return result+(ordered?'</ol>':'');
}
function srbTOC(sections){
 const render=s=>{const children=sections.filter(x=>x.parent===s.id);const link=`<a class="srb-toc-link" href="#${s.id}">${esc(s.title)}</a>`;
 if(s.navGroups){const groups=s.navGroups.map(g=>{const target=sections.find(x=>x.id===g.id);return target?render(target):`<span class="srb-toc-pending" aria-disabled="true" title="Bu kısım henüz aktarılmadı">${esc(g.title)}</span>`}).join('');return `<details class="srb-class-nav"><summary>${link}</summary><div>${groups}</div></details>`}
 return children.length?`<details><summary>${link}</summary><div>${children.map(render).join('')}</div></details>`:link};
 const roots=sections.filter(s=>!s.parent&&(s.kind!=='intro'||s.toc)&&s.kind!=='callout');if(roots.some(s=>s.navGroups))roots.sort((a,b)=>a.title.localeCompare(b.title,'tr'));return roots.map(render).join('');
}
function srbSection(s){const level=s.kind==='minorheading'?4:s.kind==='subheading'?3:2;return `<section id="${s.id}" class="srb-section srb-${s.kind}">${s.kind==='intro'?'':`<h${level}>${esc(s.title)}</h${level}>`}${srbBlocks(s.blocks)}</section>`}
function srbIndex(){
 document.title='Sistem Referans Belgesi · D&D Türkçe';
 const a=(name,url)=>`<a href="${esc(url)}">${esc(name)}</a>`;
 const pending=name=>`<span class="srb-pending" title="Bu bölüm henüz eklenmedi">${esc(name)}</span>`;
 const group=(name,url,items)=>`<section class="srb-index-group"><h3>${url?a(name,url):pending(name)}</h3><ul>${items.map(item=>`<li>${item}</li>`).join('')}</ul></section>`;
 const category=(name,key)=>group(name,srbSiteURL('/'+key+'/'),ENTRIES.filter(e=>e.category===key).sort((a,b)=>a.name.localeCompare(b.name,'tr')).map(e=>a(e.name,e.url)));
 const first=SRB.chapters[0];
 main.innerHTML=crumb('Sistem Referans Belgesi')+`<h1 class="page-title">Sistem Referans Belgesi</h1><section class="srb-index-band"><h2>Oyuncular</h2><div class="srb-index-columns"><div>${SRB.chapters.filter(c=>!['karakter-olusturma','karakter-siniflari','karakter-kokenleri'].includes(c.id)).map(c=>group(c.title,srbChapterURL(c),c.sections.filter(s=>s.kind==='heading').map(s=>a(s.title,srbChapterURL(c)+'#'+s.id)))).join('')}${group('Karakter Oluşturma',srbReference('karakter-olusturma'),SRB.chapters.find(c=>c.id==='karakter-olusturma').sections.filter(s=>s.kind==='heading'||['sinif-secimi','kokenini-belirle','dil-secimi','kabiliyet-puanlarini-belirle','ahlaki-yonelim-secimi','ayrintilari-tamamla'].includes(s.id)).map(s=>a(s.title,srbReference(s.id))))}</div><div>${group('Karakter Sınıfları',srbReference('karakter-siniflari'),SRB.chapters.find(c=>c.id==='karakter-siniflari').sections.filter(s=>s.toc).sort((a,b)=>a.title.localeCompare(b.title,'tr')).map(s=>a(s.title,srbReference(s.id))))}</div><div>${group('Karakter Kökenleri',srbReference('karakter-kokenleri'),[a('Köken Bileşenleri',srbReference('koken-bilesenleri')),a('Karakter Geçmişleri',srbReference('karakter-gecmisleri')),a('Karakter Türleri',srbReference('karakter-turleri')),a('Geçmiş Açıklamaları',srbReference('gecmis-aciklamalari'))])}${group('Marifetler',srbSiteURL('/marifet/'),['Köken Marifeti','Genel Marifet','Dövüş Stili Marifeti','Destansı Lütuf Marifeti'].map(t=>a(t,srbSiteURL('/marifet/')+'?kategori='+encodeURIComponent(t))))}</div><div>${group('Ekipman',srbSiteURL('/ekipman/'),[a('Silahlar',srbSiteURL('/ekipman/')+'?kategori='+encodeURIComponent('Silah')),a('Zırhlar',srbSiteURL('/ekipman/')+'?kategori='+encodeURIComponent('Zırh')),a('Aletler',srbSiteURL('/ekipman/')+'?kategori='+encodeURIComponent('Alet')),a('Macera Ekipmanları',srbSiteURL('/ekipman/')+'?kategori='+encodeURIComponent('Macera Ekipmanı')),a('Binekler ve Taşıtlar',srbSiteURL('/ekipman/'))])}${group('Büyüler',srbSiteURL('/buyu/'),[])}${group('Kurallar Sözlüğü',srbSiteURL('/kurallar-sozlugu/'),[])}</div></div></section><section class="srb-index-band"><h2>Zindan Efendileri</h2><div class="srb-index-columns srb-reference-columns">${group('Oyun Kuralları',srbChapterURL(first),[a('Oyunun İşleyişi',srbChapterURL(first)+'#oyunun-isleyisi'),a('Zindan Efendisi Olmak',srbChapterURL(first)+'#zindan-efendisi-olmak')])}${group('Kurallar Sözlüğü',srbSiteURL('/kurallar-sozlugu/'),[a('Durumlar',srbSiteURL('/durumlar/'))])}</div></section>`;
}
function srbPage(id){
 if(!id){srbIndex();return}
 const c=SRB.chapters.find(c=>c.id===id);if(!c){main.innerHTML=crumb('Sistem Referans Belgesi')+`<h1 class="page-title">Bölüm bulunamadı</h1><a href="${srbBase()}">İçindekilere dön</a>`;return}
 document.title=c.title+' · Sistem Referans Belgesi';
 const position=SRB.chapters.indexOf(c),previous=SRB.chapters[position-1],next=SRB.chapters[position+1];
 const pager=()=>`<div class="srb-pager">${previous?`<a href="${srbChapterURL(previous)}">← ${esc(previous.title)}</a>`:'<span></span>'}<a href="${srbBase()}">İçindekiler</a>${next?`<a href="${srbChapterURL(next)}">${esc(next.title)} →</a>`:'<span></span>'}</div>`;
 const toc=srbTOC(c.sections);
 const classChapter=c.id==='karakter-siniflari';
 const sidePager=classChapter?`<nav class="srb-side-pager" aria-label="Bölüm geçişi">${previous?`<a href="${srbChapterURL(previous)}">‹ Önceki Bölüm</a>`:''}<a href="${srbBase()}" aria-label="SRB İçindekiler">İçindekiler</a>${next?`<a href="${srbChapterURL(next)}">Sonraki Bölüm ›</a>`:''}</nav>`:'';
 const sideTOC=classChapter?`<nav class="srb-toc srb-class-toc" aria-label="Sınıflar">${toc}</nav>`:`<details class="srb-toc" open><summary class="srb-toc-toggle">Bölüm İçindekiler</summary><div>${toc}</div></details>`;
 main.innerHTML=crumb(`<a href="${srbBase()}">Sistem Referans Belgesi</a> / ${esc(c.title)}`)+`<div class="srb-reader"><aside class="srb-sidebar">${sidePager}<a class="srb-chapter-name" href="#srb-chapter-top">${esc(c.title)}</a>${sideTOC}</aside><article class="srb-article">${pager()}<h1 id="srb-chapter-top">${esc(c.title)}</h1>${c.sections.map(srbSection).join('')}${pager()}</article></div>`;
 const links=[...main.querySelectorAll('.srb-toc-link')],sections=[...main.querySelectorAll('.srb-section')];
 const classMenus=[...main.querySelectorAll('.srb-class-nav')];
 let selectedClass=null;
 function selectClass(menu){
  if(menu===selectedClass)return;
  for(const other of classMenus){other.open=false;for(const nested of other.querySelectorAll('details'))nested.open=false}
  selectedClass=menu;if(menu)menu.open=true;
 }
 for(const menu of classMenus)menu.querySelector('summary').addEventListener('click',e=>{
  if(e.target.closest('a'))return;
  e.preventDefault();if(menu.open){menu.open=false;for(const nested of menu.querySelectorAll('details'))nested.open=false}else{selectClass(menu);menu.open=true}
 });
 function mark(id){const activeLink=links.find(link=>link.hash==='#'+id);selectClass(activeLink?.closest('.srb-class-nav')||null);for(const link of links){const active=link.hash==='#'+id;link.classList.toggle('active',active);if(active){link.setAttribute('aria-current','location');for(let parent=link.parentElement;parent&&parent!==main;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true}else link.removeAttribute('aria-current')}}
 let queued=false,navigatingTo=null;function track(){queued=false;if(navigatingTo){mark(navigatingTo);return}if(scrollY<40){mark('srb-chapter-top');return}let current=sections[0];for(const s of sections){if(s.getBoundingClientRect().top<=innerHeight*.5)current=s;else break}mark(current.id)}
 function schedule(){if(!queued){queued=true;requestAnimationFrame(track)}}
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('scrollend',()=>{const target=sections.find(s=>s.id===navigatingTo);if(!target||Math.abs(target.getBoundingClientRect().top-innerHeight*.25)<4||innerHeight+scrollY>=document.documentElement.scrollHeight-4){navigatingTo=null;schedule()}});window.addEventListener('wheel',()=>{navigatingTo=null},{passive:true});window.addEventListener('touchstart',()=>{navigatingTo=null},{passive:true});window.addEventListener('resize',schedule);new ResizeObserver(schedule).observe(main.querySelector('.srb-article'));schedule();
 function jump(id){if(id==='srb-chapter-top'){navigatingTo=null;selectClass(null);mark(id);window.scrollTo({top:0,behavior:'instant'});return}const section=sections.find(s=>s.id===id);if(!section)return;navigatingTo=Math.abs(section.getBoundingClientRect().top-innerHeight*.25)>2?id:null;section.scrollIntoView({behavior:'smooth',block:'start'});mark(id)}
 main.querySelector('.srb-sidebar').addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(!a||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();jump(a.hash.slice(1));history.pushState(null,'',a.hash)});
 window.addEventListener('popstate',()=>jump(decodeURIComponent(location.hash.slice(1))||'srb-chapter-top'));
 requestAnimationFrame(()=>jump(location.hash?decodeURIComponent(location.hash.slice(1)):'srb-chapter-top'));
}
