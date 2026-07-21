/* 요뜨 공용 스크립트 */
let curCat = "전체", curQ = "";

function sparkSVG(data,color){
  if(!data)return"";
  const w=72,h=28,max=Math.max(...data),min=Math.min(...data);
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-min)/(max-min||1))*(h-4)-2}`).join(" ");
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/></svg>`;
}
function sparkBig(data,up){
  if(!data)return"";
  const w=640,h=84,max=Math.max(...data),min=Math.min(...data);
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-min)/(max-min||1))*(h-10)-5}`).join(" ");
  const c=up?"#FF4D2E":"#9A9DB5";
  return `<svg width="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="display:block">
    <polyline points="${pts}" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>
    <polygon points="0,${h} ${pts} ${w},${h}" fill="${c}" opacity="0.08"/></svg>`;
}
function badge(st){
  return {hot:'<span class="badge b-hot">HOT</span>',rise:'<span class="badge b-rise">급상승</span>',
          new:'<span class="badge b-new">NEW</span>',cool:'<span class="badge b-cool">하락</span>'}[st]||"";
}
let curGroup="전체"; // curCat=""이면 그룹 전체
function activeCats(){
  if(curGroup==="전체")return null;
  if(curCat)return [curCat];
  const g=(typeof CAT_GROUPS!=="undefined"?CAT_GROUPS:[]).find(x=>x.name===curGroup);
  return g?g.cats:[];
}
function matches(t){
  const cats=activeCats();
  return !cats || cats.includes(t.cat);
}

/* ---------- 홈 렌더 (10개씩 페이지네이션 + 무한스크롤) ---------- */
const PAGE_SIZE=10;
let shown=PAGE_SIZE, loadingMore=false, listObserver=null;

function trendPool(){
  if(curGroup==="전체")return TRENDS.slice().sort((a,b)=>a.rank-b.rank);
  const cats=activeCats();
  return [...TRENDS,...(typeof EXTRA!=="undefined"?EXTRA:[]),...(typeof EXTRA2!=="undefined"?EXTRA2:[])]
    .filter(t=>cats.includes(t.cat)).sort((a,b)=>b.vel-a.vel);
}
function cardHTML(t,no){
  return `
    <div class="card" onclick="openModal(${t.id})">
      <div class="rank ${no<=3?"top":""}">${no}</div>
      <div class="c-body">
        <div class="c-top"><span class="c-title">${t.title}</span>${badge(t.status)}<span class="badge b-cat">${t.cat}</span></div>
        <div class="c-meta">
          <span class="vel up">▲ ${t.vel}%</span>
          ${sparkSVG(t.spark,"#FF4D2E")}
        </div>
      </div>
    </div>`;
}
function renderHome(){
  const chipsEl=document.getElementById("chips");
  if(!chipsEl)return;
  const groups=["전체",...CAT_GROUPS.map(g=>g.name)];
  let html=`<div class="gchips">${groups.map(g=>{
    const G=CAT_GROUPS.find(x=>x.name===g);
    return `<button class="chip ${g===curGroup?"on":""}" onclick="setGroup('${g}')">${g}</button>`;
  }).join("")}</div>`;
  const G=CAT_GROUPS.find(x=>x.name===curGroup);
  if(G && G.cats.length>1){
    html+=`<div class="subchips">
      <button class="chip sm ${!curCat?"on2":""}" onclick="setCat('')">${curGroup} 전체</button>
      ${G.cats.map(c=>`<button class="chip sm ${c===curCat?"on2":""}" onclick="setCat('${c}')">${c}</button>`).join("")}
    </div>`;
  }
  chipsEl.innerHTML=html;

  const pool=trendPool();
  const visible=pool.slice(0,shown);
  const listEl=document.getElementById("list");
  const titleEl=document.getElementById("listTitle");
  if(titleEl)titleEl.textContent = curGroup==="전체" ? "오늘 뜨는 트렌드 TOP" : `${curCat||curGroup} 트렌드 (${pool.length})`;

  listEl.innerHTML = (visible.length? visible.map((t,i)=>cardHTML(t,i+1)).join("") : `<div class="empty">이 조건으로는 아직 뜨는 게 없네요</div>`)
    + (pool.length>shown ? `
      <div class="load-row" id="loadRow">
        <button class="more-btn" onclick="loadMore()">더보기 (${pool.length-shown}개 남음)</button>
      </div>
      <div id="sentinel"></div>` : "");

  // 무한스크롤: sentinel이 보이면 자동 로드
  if(listObserver)listObserver.disconnect();
  const sent=document.getElementById("sentinel");
  if(sent && "IntersectionObserver" in window){
    listObserver=new IntersectionObserver(es=>{
      if(es[0].isIntersecting && !loadingMore) loadMore();
    },{rootMargin:"200px"});
    listObserver.observe(sent);
  }

  const soon = SOON.filter(matches);
  document.getElementById("soonSec").style.display = soon.length?"":"none";
  document.getElementById("soonList").innerHTML = soon.map(s=>`
    <div class="mini" onclick="openModal(${s.id})">
      <span class="mini-t">${s.title}</span>
      <span class="mini-prob"><i style="width:${s.prob}%"></i></span>
      <span class="mini-v">${s.prob}%</span>
    </div>`).join("");

  const cool = COOLING.filter(matches).sort((a,b)=>a.vel-b.vel);
  const coolVisible = cool.slice(0,coolShown);
  document.getElementById("coolSec").style.display = cool.length?"":"none";
  document.getElementById("coolList").innerHTML = coolVisible.map((t,i)=>`
    <div class="mini" onclick="openModal(${t.id})">
      <span class="mini-no">${i+1}</span>
      <span class="mini-t">${t.title}</span>
      <span class="mini-v down">▼ ${Math.abs(t.vel)}%</span>
    </div>`).join("")
    + (cool.length>coolShown ? `
      <div class="load-row" id="coolLoadRow">
        <button class="more-btn" onclick="loadMoreCool()">더보기 (${cool.length-coolShown}개 남음)</button>
      </div>
      <div id="coolSentinel"></div>` : "");

  if(coolObserver)coolObserver.disconnect();
  const cs=document.getElementById("coolSentinel");
  if(cs && "IntersectionObserver" in window){
    coolObserver=new IntersectionObserver(es=>{
      if(es[0].isIntersecting && !coolLoading) loadMoreCool();
    },{rootMargin:"200px"});
    coolObserver.observe(cs);
  }
}
let coolShown=5, coolLoading=false, coolObserver=null;
function loadMoreCool(){
  if(coolLoading)return;
  coolLoading=true;
  const row=document.getElementById("coolLoadRow");
  if(row)row.innerHTML=`<div class="loading-dots"><span></span><span></span><span></span></div><div class="loading-txt">불러오는 중...</div>`;
  setTimeout(()=>{coolShown+=10;coolLoading=false;renderHome();},400);
}
function loadMore(){
  if(loadingMore)return;
  loadingMore=true;
  const row=document.getElementById("loadRow");
  if(row)row.innerHTML=`<div class="loading-dots"><span></span><span></span><span></span></div><div class="loading-txt">불러오는 중...</div>`;
  setTimeout(()=>{
    shown+=PAGE_SIZE;
    loadingMore=false;
    renderHome();
  },500);
}
function setGroup(g){curGroup=g;curCat="";shown=PAGE_SIZE;coolShown=5;renderHome();}
function setCat(c){curCat=c;shown=PAGE_SIZE;coolShown=5;renderHome();}

/* ---------- 공용: 제목으로 트렌드 찾기 + 범용 정보 팝업 ---------- */
function findTrend(title){
  const norm=s=>s.replace(/\(하락\)|시즌\s*\d|[《》()"'!?,]/g," ").toLowerCase();
  const toks=norm(title).split(/\s+/).filter(w=>w.length>=2&&!/^\d|^7\//.test(w));
  let best=null,bestScore=0;
  for(const x of (typeof ALL!=="undefined"?ALL:[])){
    const hay=norm(x.title+" "+(x.kw||[]).join(" "));
    const score=toks.filter(w=>hay.includes(w)).length;
    if(score>bestScore){bestScore=score;best=x;}
  }
  return bestScore>=2?best:(bestScore>=1&&toks.length===1?best:null);
}
/* ---------- 팝업용 반응 프로필 (시연용 추정치, 항목별 고정값) ---------- */
function hashStr(s){let h=7;for(const ch of String(s))h=(h*31+ch.charCodeAt(0))>>>0;return h;}
function fakeStats(key,cat){
  const h=hashStr(key);
  const days=3+(h%18);
  const startK=((3+(h%25))/10).toFixed(1);
  const peaks=["출근길 8시쯤","점심시간 12시 언저리","오후 3~4시쯤 나른해질 때","퇴근길 6~7시","밤 10시부터 자정 사이"];
  const peak=peaks[h%peaks.length];
  let base=[25,35,25,15];
  if(["아이돌","K-팝","밈/유행어","요즘 유행","게임","e스포츠","웹툰/애니"].includes(cat))base=[38,37,17,8];
  else if(["IT/테크","자동차","리빙","건강/운동","과학"].includes(cat))base=[8,27,38,27];
  else if(["맛집","카페/디저트","핫플","여행","패션","뷰티"].includes(cat))base=[22,41,24,13];
  let g=base.map((v,i)=>Math.max(4,v+(((h>>(i*3))%9)-4)));
  const sum=g.reduce((a,b)=>a+b,0);
  g=g.map(v=>Math.round(v*100/sum));
  g[3]+=100-g.reduce((a,b)=>a+b,0);
  return {days,startK,peak,gens:g};
}
function statsHTML(key,cat,mention,q,firstUrl){
  const s=fakeStats(key,cat);
  const labels=["10대","20대","30대","40대+"];
  const max=Math.max(...s.gens);
  const d=new Date(Date.now()-s.days*86400000);
  const ds=`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;
  const url=firstUrl||`https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(q||String(key))}&pd=3&ds=${ds}&de=${ds}`;
  return `
    <div class="m-h">누가, 언제부터 떠드나 <span class="demo-tag">시연용 추정치</span></div>
    <div class="first-mention"><a class="fm-link" href="${url}" target="_blank" rel="noopener"><span class="fm-date">${ds}</span> 에 첫 언급, 원문 확인</a></div>
    <div class="gen-box">
      ${labels.map((l,i)=>`
      <div class="gen-row"><span class="gl">${l}</span>
        <div class="gen-track"><i style="width:${s.gens[i]}%" class="${s.gens[i]===max?"gtop":""}"></i></div>
        <span class="gv">${s.gens[i]}%</span></div>`).join("")}
      <div class="gen-note">${labels[s.gens.indexOf(max)]}가 제일 열심히 떠드는 중 (전체 언급 대비 비중)</div>
    </div>`;
}

function openInfoModal(o){
  document.getElementById("modal").innerHTML=`
    <button class="m-close" onclick="closeModal()">✕</button>
    <div class="m-cat">${o.cat||""}</div>
    <div class="m-title">${o.title}</div>
    ${o.stats?`<div class="m-stats">${o.stats}</div>`:""}
    <div class="m-h">설명</div>
    <div class="m-why">${o.desc}</div>
    ${statsHTML(o.title,o.cat||"",null,o.q||o.title,null)}
    ${o.points&&o.points.length?`<div class="m-h">핵심 항목</div>
    <ul class="m-points">${o.points.map(p=>`<li>${p}</li>`).join("")}</ul>`:""}
`;
  document.getElementById("ovl").classList.add("show");
  document.body.style.overflow="hidden";
}
function openByTitle(title,cat,fallbackDesc){
  const t=findTrend(title);
  if(t){openModal(t.id);return;}
  openInfoModal({cat,title:title.replace(/^\(하락\)\s*/,""),desc:fallbackDesc||`이달 '${cat}' 카테고리에서 화력이 높았던 항목입니다. 언급량과 반응 데이터 기준으로 상위에 랭크되었습니다.`});
}

/* ---------- 리포트 렌더 ---------- */
function openShareModal(i){
  const s=REPORT.share[i];
  const related=REPORT.categories.find(c=>s.label.includes(c.name.split("/")[0])||c.name.includes(s.label.split("/")[0]));
  openInfoModal({
    cat:"카테고리 점유율",title:s.label,
    stats:`<div class="stat" style="grid-column:1/-1"><b style="color:var(--up)">${s.v}%</b><span>이달 전체 트렌드 언급량 중 비중 (시뮬레이션)</span></div>`,
    desc:`${REPORT.month} 전체 트렌드 언급량 가운데 '${s.label}' 계열이 ${s.v}%를 차지했습니다. ${s.v>=25?"이달의 주도 카테고리로, 신규 트렌드가 가장 활발하게 생성된 영역입니다.":s.v>=15?"꾸준한 화력을 유지하는 중위권 카테고리입니다.":"비중은 작지만 개별 이슈의 순간 화력이 큰 카테고리입니다."}`,
    points:related?related.top:[],q:s.label});
}
function renderReport(){
  const el=document.getElementById("reportRoot");
  if(!el)return;
  el.innerHTML=`
    <div class="r-head">
      <div class="rt">MONTHLY REPORT, ${REPORT.month}</div>
      <h1>${REPORT.headline}</h1>
      <p>${REPORT.intro}</p>
    </div>
    <div class="sec">
      <h2>카테고리 점유율</h2>
      <div class="sub">이달 전체 트렌드 언급량 기준 (시뮬레이션), 클릭하면 상세</div>
      <div class="r-card">
        ${REPORT.share.map((s,i)=>`
          <div class="bar-row clickable" onclick="openShareModal(${i})"><span class="bl">${s.label}</span>
            <div class="bar-track"><i style="width:${s.v}%"></i></div>
            <span class="bar-v">${s.v}%</span></div>`).join("")}
      </div>
    </div>
    <div class="sec">
      <h2>카테고리별 TOP 3</h2>
      <div class="sub">홈과 동일한 ${CATS.length-1}개 카테고리 기준, 상승률 상위 3개씩, 클릭하면 상세</div>
      <div class="r-grid">
        ${CATS.slice(1).map(cat=>{
          const pool=[...TRENDS,...(typeof EXTRA!=="undefined"?EXTRA:[]),...(typeof EXTRA2!=="undefined"?EXTRA2:[])]
            .filter(t=>t.cat===cat).sort((a,b)=>b.vel-a.vel).slice(0,3);
          if(!pool.length)return"";
          return `<div class="r-card"><div class="rc-t">${cat}</div>
            <ol>${pool.map(t=>`<li class="clickable" onclick="openModal(${t.id})">${t.title} <small class="rc-vel">▲${t.vel}%</small></li>`).join("")}</ol></div>`;
        }).join("")}
      </div>
    </div>
    <div class="sec">
      <h2>다음 달 전망</h2>
      <div class="sub">AI 예측 요약</div>
      <div class="m-why">${REPORT.outlook}</div>
    </div>`;
}

/* ---------- 지역맵 렌더 ---------- */
function openRegionModal(i){
  const r=REGIONS[i];
  openInfoModal({
    cat:"지역별 트렌드",title:r.name,
    stats:`<div class="stat" style="grid-column:1/-1"><b style="color:var(--hot)">${r.heat}</b><span>지역 화력 지수 (시뮬레이션)</span></div>`,
    desc:`지금 ${r.name}에서 언급량이 가장 빠르게 오르는 주제들입니다. 화력 지수는 지역 연관 키워드의 검색/업로드 증가율을 종합한 값입니다.`,
    points:r.items.map(it=>`${it.t} (${it.c})`),q:r.name});
}
function openRegionItem(ri,ii){
  const r=REGIONS[ri], it=r.items[ii];
  openInfoModal({
    cat:`${r.name}, ${it.c}`,title:it.t,
    desc:`요즘 ${r.name} 쪽에서 확 뜨고 있는 '${it.c}' 얘기예요. 인증샷이랑 후기 업로드가 눈에 띄게 늘고 있어서, 아직 웨이팅이 감당 가능한 초기 확산 구간으로 보입니다. 주말 지나면 훨씬 붐빌 가능성이 높으니 가보실 거면 지금이 타이밍이에요.`,
    q:`${r.name.replace(/서울 |강원 |전북 |전남 |경북 |충남 |글로벌.*/,"")} ${it.t}`.trim()});
}
let mapFilter="전체";
function setMapFilter(t){mapFilter=t;renderMap();}
function renderMap(){
  const el=document.getElementById("mapRoot");
  if(!el)return;
  const list=REGIONS.map((r,ri)=>({r,ri}))
    .filter(({r})=>mapFilter==="전체"||r.type===mapFilter)
    .sort((a,b)=>b.r.heat-a.r.heat);
  el.innerHTML=`
    <div class="region-grid">${list.map(({r,ri})=>`
    <div class="region clickable" onclick="openRegionModal(${ri})">
      <div class="rg-n">${r.name}<span class="rg-type">${r.type}</span><span class="rg-heat">화력 ${r.heat}</span></div>
      <ul>${r.items.map((it,ii)=>`<li class="clickable" onclick="event.stopPropagation();openRegionItem(${ri},${ii})"><span class="no">${ii+1}</span>${it.t}<span class="rg-cat">${it.c}</span></li>`).join("")}</ul>
    </div>`).join("")}</div>`;
}

/* ---------- 모달 ---------- */
function openModal(id){
  const t = ALL.find(x=>x.id===id); if(!t)return;
  const isSoon = t.status==="soon";
  document.getElementById("modal").innerHTML = `
    <button class="m-close" onclick="closeModal()">✕</button>
    <div class="m-cat">${t.cat}${isSoon?", 곧 터질 후보":""}</div>
    <div class="m-title">${t.title}</div>
    <div class="m-one">${t.one}</div>
    ${!isSoon?`
    <div class="m-stats">
      <div class="stat"><b style="color:${t.vel>0?"var(--up)":"var(--sub)"}">${t.vel>0?"▲":"▼"} ${Math.abs(t.vel)}%</b><span>24시간 상승률</span></div>
      <div class="stat"><b>${t.mention}</b><span>언급량</span></div>
      <div class="stat"><b>${t.sent}</b><span>대표 반응</span></div>
    </div>
    <div class="m-chart"><div class="cl">최근 7일 확산 곡선</div>${sparkBig(t.spark,t.vel>0)}</div>`
    :`<div class="m-stats"><div class="stat" style="grid-column:1/-1"><b style="color:var(--yellow)">${t.prob}%</b><span>AI 예측 — 터질 확률</span></div></div>`}
    <div class="m-h">지금 뜨는 이유 (AI 분석)</div>
    <div class="m-why">${t.why}</div>
    ${statsHTML(t.id+t.title,t.cat,t.mention,(t.kw&&t.kw[0])||t.title,t.firstUrl)}
    <div class="m-h">핵심 포인트</div>
    <ul class="m-points">${t.points.map(p=>`<li>${p}</li>`).join("")}</ul>
`;
  document.getElementById("ovl").classList.add("show");
  document.body.style.overflow="hidden";
}
function closeModal(){
  document.getElementById("ovl").classList.remove("show");
  document.body.style.overflow="";
}
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal();});

/* ---------- 실시간 급상승 (구글 트렌드 KR) ---------- */
const HEAVY_BLOCKLIST = ["대통령","선거","투표","국회","의원","정당","정치","탄핵","북한","전쟁","사망","숨져","숨진","별세","참변","살해","살인","화재","지진","폭발","추락","침몰","구속","영장","검찰","기소","혐의","법원","재판","회생","파산","징역","성폭","마약","음주운전","금리","환율","코스피","증시","주가조작","이혼","불륜","논란","피습","총격","테러","실종","시신","폭력","학폭","횡령","배임","사기","비위","갑질","극단적","자살","결별","열애설"];
const TRENDS_RSS = "https://trends.google.com/trending/rss?geo=KR";
const CORS_PROXIES = [
  u=>`https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  u=>`https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  u=>`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`
];
/* 타임아웃 있는 fetch */
async function fetchWithTimeout(u,ms=6000){
  const c=new AbortController();
  const t=setTimeout(()=>c.abort(),ms);
  try{return await fetch(u,{cache:"no-store",signal:c.signal});}
  finally{clearTimeout(t);}
}
/* 모든 프록시를 동시에 경쟁시켜 가장 빠른 응답 사용 — GitHub Pages 호환 */
async function fetchRSSXml(apiPath,realUrl){
  const tries=[...(apiPath?[apiPath]:[]),...CORS_PROXIES.map(p=>p(realUrl))];
  const attempts=tries.map(async u=>{
    const res=await fetchWithTimeout(u);
    if(!res.ok)throw new Error("bad status");
    const txt=await res.text();
    if(!txt.includes("<rss")&&!txt.includes("<feed"))throw new Error("not rss");
    return new DOMParser().parseFromString(txt,"text/xml");
  });
  try{return await Promise.any(attempts);}catch(e){return null;}
}
let liveTimer=null;

function isHeavy(text){
  return HEAVY_BLOCKLIST.some(w=>text.includes(w));
}
function cleanTitle(s){
  return s.replace(/\s*-\s*[^-]+$/,"").replace(/\[[^\]]*\]/g,"").replace(/['"'']/g,"").trim();
}
function tokens(s){
  return cleanTitle(s).toLowerCase().split(/[\s/,…?!()]+/).filter(w=>w.length>=2);
}
function overlap(a,b){
  const B=new Set(b);
  return a.filter(w=>B.has(w)).length;
}

/* 구글 트렌드: 키워드별로 이미 여러 언론사 기사가 묶여 온다 → 클러스터 단위로 파싱 */
async function fetchTrendClusters(){
  const xml=await fetchRSSXml("/api/trends",TRENDS_RSS);
  if(!xml)return[];
  return [...xml.querySelectorAll("item")].map(it=>{
    const g=(node,t)=>{const el=node.getElementsByTagName(t)[0];return el?el.textContent:"";};
    const news=[...it.getElementsByTagName("ht:news_item")].map(n=>({
      t:cleanTitle(g(n,"ht:news_item_title")),u:g(n,"ht:news_item_url"),s:g(n,"ht:news_item_source")||"뉴스"}));
    return {type:"실검",title:g(it,"title"),traffic:g(it,"ht:approx_traffic"),items:news};
  }).filter(c=>c.title && !isHeavy(c.title+" "+c.items.map(n=>n.t).join(" ")));
}
async function fetchNewsFeed(apiPath,realUrl,defSrc){
  const xml=await fetchRSSXml(apiPath,realUrl);
  if(!xml)return[];
  return [...xml.querySelectorAll("item")].map(it=>{
    const g=t=>{const el=it.getElementsByTagName(t)[0];return el?el.textContent:"";};
    return {t:cleanTitle(g("title")),u:g("link"),s:g("source")||defSrc};
  }).filter(x=>x.t&&!isHeavy(x.t));
}

/* ---------- 통합 피드: 실검 + 뉴스 + 밈을 하나로, 같은 주제는 하나로 묶기 ---------- */
let FEED=[];
let MEME_NEWS=[]; // 봇이 매일 수집하는 밈 매체 새 글
async function buildFeed(){
  const el=document.getElementById("feedList");
  if(!el)return;
  // 1) 같은 도메인의 봇 캐시를 먼저 즉시 표시 (거의 0초)
  if(!FEED.length){
    try{
      const cache=await (await fetchWithTimeout("live-cache.json",4000)).json();
      MEME_NEWS=cache.memeNews||[];
      FEED=assembleFeed(
        (cache.trends||[]).map(t=>({type:"실검",title:t.title,traffic:t.traffic,items:t.items||[]})),
        cache.ent||[],cache.tech||[]);
      renderFeed();
    }catch(e){}
  }
  // 2) 라이브 데이터를 백그라운드에서 가져와 준비되면 교체
  const [trendClusters,ent,tech]=await Promise.all([
    fetchTrendClusters(),
    fetchNewsFeed("/api/gnews-ent","https://www.yna.co.kr/rss/entertainment.xml","연합뉴스"),
    fetchNewsFeed("/api/gnews-tech","https://feeds.feedburner.com/zdkorea","ZDNet")
  ]);
  if(!trendClusters.length && !ent.length && !tech.length){
    if(!FEED.length)renderFeed(); // 캐시도 없으면 에러 표시
    return;
  }
  FEED=assembleFeed(trendClusters,ent,tech);
  renderFeed();
}
function assembleFeed(trendClusters,ent,tech){
  const clusters=[...trendClusters];
  // 뉴스 기사를 기존 실검 클러스터에 병합 (같은 주제 = 하나로)
  const newsPool=[...ent.slice(0,12),...tech.slice(0,12)];
  const leftovers=[];
  for(const n of newsPool){
    const nt=tokens(n.t);
    let best=null,bestScore=0;
    for(const c of clusters){
      const score=overlap(nt,tokens(c.title+" "+c.items.map(x=>x.t).join(" ")));
      if(score>bestScore){bestScore=score;best=c;}
    }
    if(best && bestScore>=2){ if(!best.items.some(x=>x.t===n.t)) best.items.push(n); }
    else leftovers.push(n);
  }
  // 남은 뉴스끼리도 유사 기사 묶기
  const newsClusters=[];
  for(const n of leftovers){
    const nt=tokens(n.t);
    const home=newsClusters.find(c=>overlap(nt,tokens(c.items.map(x=>x.t).join(" ")))>=2);
    if(home)home.items.push(n);
    else newsClusters.push({type:"뉴스",title:n.t,items:[n]});
  }
  // 밈(큐레이션)도 통합 피드에 포함
  const memeClusters=(typeof MEMES!=="undefined"?MEMES:[]).map(m=>({
    type:"밈",title:m.t,desc:m.d,tag:m.tag,
    items:[
      {t:`X에서 '${m.t}' 반응 보기`,u:`https://x.com/search?q=${encodeURIComponent(m.t)}&f=live`,s:"X"},
      {t:`인스타그램 '${m.t}' 태그`,u:`https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(m.t)}`,s:"Instagram"},
      {t:`유튜브 '${m.t}' 영상`,u:`https://www.youtube.com/results?search_query=${encodeURIComponent(m.t)}`,s:"YouTube"}
    ]}));
  // 봇이 매일 수집하는 밈 매체 새 글 (자동 갱신되는 밈 소식)
  const memeNewsClusters=MEME_NEWS.slice(0,6).map(n=>({
    type:"밈",title:n.t,desc:"오늘 올라온 밈 소식 — 눌러서 원문 보기",tag:"NEW",
    items:[{t:n.t,u:n.u,s:n.s||"고구마팜"}]}));
  return [...clusters,...newsClusters.slice(0,8),...memeNewsClusters,...memeClusters];
}
function feedTag(type){
  return {실검:'<span class="ftag ft-hot">실검</span>',뉴스:'<span class="ftag ft-news">뉴스</span>',밈:'<span class="ftag ft-meme">밈</span>'}[type]||"";
}
let feedFilter="전체";
function setFeedTab(t){feedFilter=t;renderFeed();}
function renderFeed(){
  const el=document.getElementById("feedList");
  if(!el)return;
  const stamp=document.getElementById("liveStamp");
  if(stamp){const d=new Date();stamp.textContent=`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")} 갱신`;}
  if(!FEED.length){el.innerHTML=`<div class="live-err">피드를 불러오지 못했어요. 잠시 후 자동 재시도합니다.</div>`;return;}
  // 탭 (전체 / 실검 / 뉴스 / 밈)
  const tabsEl=document.getElementById("feedTabs");
  if(tabsEl){
    const cnt=t=>FEED.filter(c=>c.type===t).length;
    tabsEl.innerHTML=[["전체",FEED.length],["실검",cnt("실검")],["뉴스",cnt("뉴스")],["밈",cnt("밈")]]
      .map(([t,n])=>`<button class="ftab ${feedFilter===t?"on":""}" onclick="setFeedTab('${t}')">${t} <em>${n}</em></button>`).join("");
  }
  const list=FEED.map((c,i)=>({c,i})).filter(({c})=>feedFilter==="전체"||c.type===feedFilter);
  el.innerHTML=list.map(({c,i})=>{
    const srcs=[...new Set(c.items.map(x=>x.s))];
    return `<div class="live-item" onclick="openFeedModal(${i})">
      ${feedTag(c.type)}
      <div class="li-b">
        <div class="li-t">${c.title}</div>
        <div class="li-n">${c.type==="밈"?c.desc:(c.items[0]?c.items[0].t:"")}</div>
      </div>
      <span class="li-tr">${c.traffic?c.traffic+"<br>":""}${srcs.length}개 소스</span>
    </div>`;
  }).join("")||`<div class="live-err">이 탭에는 아직 항목이 없어요.</div>`;
}
function openFeedModal(i){
  const c=FEED[i]; if(!c)return;
  const srcs=[...new Set(c.items.map(x=>x.s))];
  const summary = c.type==="밈" ? c.desc
    : c.type==="실검" ? `'${c.title}' 검색이 지금 급상승 중${c.traffic?` (검색량 ${c.traffic})`:""}. 여러 채널의 보도/반응을 종합하면: ${c.items.slice(0,3).map(x=>x.t).join(", ")}`
    : `여러 채널에서 동시에 다루는 중: ${c.items.slice(0,3).map(x=>x.t).join(", ")}`;
  document.getElementById("modal").innerHTML = `
    <button class="m-close" onclick="closeModal()">✕</button>
    <div class="m-cat">${c.type==="실검"?"실시간 급상승":c.type==="뉴스"?"뉴스 종합":"밈/유행어"}${c.tag?`, ${c.tag}`:""}</div>
    <div class="m-title">${c.title}</div>
    <div class="m-h">종합 요약</div>
    <div class="m-why">${summary}</div>
    ${statsHTML(c.title,"",null,c.title,c.items&&c.items[0]?c.items[0].u:null)}
    <div class="m-h">원문, 반응 보기 (${c.items.length})</div>
    <div class="feed-links">${c.items.map(x=>`
      <a class="feed-link" href="${x.u}" target="_blank" rel="noopener">
        <span class="fl-t">${x.t}</span><span class="fl-s">${x.s}</span>
      </a>`).join("")}</div>
`;
  document.getElementById("ovl").classList.add("show");
  document.body.style.overflow="hidden";
}
function startLive(){
  if(!document.getElementById("feedList"))return;
  buildFeed();
  liveTimer=setInterval(buildFeed,5*60*1000); // 5분마다 갱신
}

/* ---------- 라이트/다크 모드 ---------- */
function applyTheme(t){
  document.documentElement.dataset.theme=t;
  const b=document.getElementById("tglBtn");
  if(b)b.textContent = t==="light" ? "다크" : "라이트";
}
function toggleTheme(){
  const cur=document.documentElement.dataset.theme==="light"?"dark":"light";
  try{localStorage.setItem("yott-theme",cur);}catch(e){}
  applyTheme(cur);
}
function initTheme(){
  let t="light";
  try{t=localStorage.getItem("yott-theme")||"light";}catch(e){}
  applyTheme(t);
}

/* ---------- 수집 소스 링크 ---------- */
const SRC_DEFS = [
  {n:"X",u:q=>`https://x.com/search?q=${q}&f=live`},
  {n:"Threads",u:q=>`https://www.threads.net/search?q=${q}`},
  {n:"Instagram",u:q=>`https://www.instagram.com/explore/search/keyword/?q=${q}`},
  {n:"Facebook",u:q=>`https://www.facebook.com/search/top?q=${q}`},
  {n:"네이버 블로그",u:q=>`https://search.naver.com/search.naver?ssc=tab.blog.all&query=${q}`},
  {n:"네이버 뉴스",u:q=>`https://search.naver.com/search.naver?where=news&query=${q}`},
  {n:"구글 뉴스",u:q=>`https://news.google.com/search?q=${q}&hl=ko&gl=KR&ceid=KR:ko`},
  {n:"다음",u:q=>`https://search.daum.net/search?w=news&q=${q}`},
  {n:"Reddit",u:q=>`https://www.reddit.com/search/?q=${q}`},
  {n:"YouTube",u:q=>`https://www.youtube.com/results?search_query=${q}`}
];
function srcLinks(t){
  const q=encodeURIComponent((t.kw&&t.kw[0])||t.title.replace(/[《》'"]/g,"").split("—")[0].trim());
  return SRC_DEFS.map(s=>`<a class="src" href="${s.u(q)}" target="_blank" rel="noopener">${s.n} ↗</a>`).join("");
}

/* ---------- 밈/유행어 사이드 ---------- */
function renderMemes(){
  const el=document.getElementById("memeList");
  if(!el||typeof MEMES==="undefined")return;
  el.innerHTML=MEMES.map(m=>`
    <div class="meme">
      <div class="me-t">${m.t}<span class="me-tag">${m.tag}</span></div>
      <div class="me-d">${m.d}</div>
    </div>`).join("");
}

/* ---------- 공통 초기화 ---------- */
function tick(){
  const el=document.getElementById("clock");
  if(!el)return;
  const d=new Date();
  el.textContent=`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
document.addEventListener("DOMContentLoaded",()=>{
  initTheme();
  const q=document.getElementById("q");
  if(q)q.addEventListener("input",e=>{curQ=e.target.value;shown=PAGE_SIZE;coolShown=5;renderHome();});
  tick(); setInterval(tick,15000);
  renderHome(); renderReport(); renderMap();
  startLive();
});
