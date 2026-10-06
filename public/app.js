const START="2026-10-05";
const TZ="America/Chicago";
let data={people:[],entries:[]},selected=1,view=new Date("2026-10-05T12:00:00Z"),picked=null;
const $=id=>document.getElementById(id);
const people=()=>data.people;
function centralDate(){
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
function key(d){return d.toISOString().slice(0,10)}
function fmt(d){return d.toLocaleDateString(undefined,{month:"long",year:"numeric",timeZone:"UTC"})}
async function load(){const r=await fetch("/api/data");if(!r.ok)throw Error();data=await r.json();render()}
function normalizeDate(value){
  if(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if(Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0,10);
}
function entry(id,date){return data.entries.find(e=>Number(e.member_id)===id&&normalizeDate(e.sober_date)===date)}
function render(){renderSelect();renderLegend();renderCalendar();renderBoard();renderStats()}
function renderSelect(){const s=$("person");s.innerHTML=people().map(p=>`<option value="${p.id}">${p.name}</option>`).join("");s.value=selected;s.onchange=()=>{selected=+s.value;renderCalendar();renderBoard();renderStats()}}
function renderLegend(){
  $("legend").innerHTML=people().map(p=>`<span><i class="dot" style="background:${p.color}"></i>${p.name} sober</span>`).join("")+`<span><i class="drinkMark">×</i> drank</span>`;
}
function renderStats(){const p=people().find(x=>x.id===selected);$("myStats").textContent=p?`🔥 ${p.currentStreak} day current streak · 🏅 ${p.longestStreak} longest · ${p.soberDays} sober days`:""}
function renderCalendar(){
  const y=view.getUTCFullYear(),m=view.getUTCMonth(),now=centralDate();
  $("month").textContent=fmt(view);
  const first=new Date(Date.UTC(y,m,1)),days=new Date(Date.UTC(y,m+1,0)).getUTCDate(),lead=first.getUTCDay();let html="";
  for(let i=0;i<lead;i++)html+=`<div class="day outside"></div>`;
  for(let n=1;n<=days;n++){
    const d=new Date(Date.UTC(y,m,n)),k=key(d),valid=k>=START&&k<=now;
    const mine=entry(selected,k);
    const soberDots=people().map(p=>{const e=entry(p.id,k);return e?.status==="sober"?`<i class="dot soberDot" style="background:${p.color}" title="${p.name} sober"></i>`:""}).join("");
    const drankMarks=people().map(p=>{const e=entry(p.id,k);return e?.status==="drank"?`<i class="drinkMark drankMark" style="color:${p.color}" title="${p.name} drank">×</i>`:""}).join("");
    const outside=!valid;
    html+=`<div class="day ${outside?"outside":""}" data-date="${k}"><span class="num">${n}</span>${mine?`<span class="myMark ${mine.status}">${mine.status==="sober"?"✓":"×"}</span>`:""}<div class="statusDots">${soberDots}${drankMarks}</div></div>`;
  }
  $("calendar").innerHTML=html;
  document.querySelectorAll(".day[data-date]").forEach(el=>{if(!el.classList.contains("outside"))el.onclick=()=>openModal(el.dataset.date)});
}
function renderBoard(){const arr=[...people()].sort((a,b)=>b.soberDays-a.soberDays||b.currentStreak-a.currentStreak);$("leaderboard").innerHTML=arr.map((p,i)=>`<div class="rank"><div class="place">${i===0?"🏆":i===1?"🥈":i===2?"🥉":i+1}</div><div class="name"><span class="dot" style="background:${p.color}"></span> ${p.name}<div class="small">🔥 ${p.currentStreak} current · 🏅 ${p.longestStreak} best</div></div><div class="score">${p.soberDays}<div class="small">days</div></div></div>`).join("")}
function openModal(date){const now=centralDate();if(date<START||date>now)return;picked=date;$('dialogDate').textContent=new Date(date+"T00:00:00Z").toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric",timeZone:"UTC"});$("modal").classList.remove("hidden")}
async function setStatus(status){const r=await fetch("/api/set-status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({memberId:selected,date:picked,status})});if(!r.ok)alert("Could not save that status.");else{await load();$("modal").classList.add("hidden")}}
async function clearStatus(){const r=await fetch("/api/clear-status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({memberId:selected,date:picked})});if(!r.ok)alert("Could not clear that status.");else{await load();$("modal").classList.add("hidden")}}
$("close").onclick=()=>$("modal").classList.add("hidden");
$("sober").onclick=()=>setStatus("sober");$("drank").onclick=()=>setStatus("drank");$("clear").onclick=clearStatus;
$("prev").onclick=()=>{view.setUTCMonth(view.getUTCMonth()-1);renderCalendar()};$("next").onclick=()=>{view.setUTCMonth(view.getUTCMonth()+1);renderCalendar()};
load().catch(()=>{document.body.innerHTML="<main><h1>Oops.</h1><p>Could not load Sober Streaks.</p></main>"});
