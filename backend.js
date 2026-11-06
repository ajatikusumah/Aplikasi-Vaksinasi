let db=null, signedInUser=null, globalRoles=[], programs=[], activeProgram=null, activeMemberRole=null, targets=[], vaccinations=[], surveys=[];
let selectedAnimal="Anjing";
const speciesNames=["Anjing","Sapi","Kambing","Kucing"];
const $=id=>document.getElementById(id);
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(message){const el=$("toast");if(!el)return;el.textContent=message;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),3200)}
function role(roleName){return globalRoles.includes("national_admin")||globalRoles.includes(roleName)||activeMemberRole===roleName}
function canCreateProgram(){return globalRoles.includes("national_admin")||globalRoles.includes("program_coordinator")}
function canManage(){return canCreateProgram()||activeMemberRole==="program_coordinator"}
function canVaccinate(){return canManage()||activeMemberRole==="team_lead"||activeMemberRole==="vaccinator"}
function canSurvey(){return globalRoles.includes("national_admin")||activeMemberRole==="coverage_assessor"}
function programOptionHtml(){return programs.map(p=>'<option value="'+p.id+'">'+esc(p.program_code)+" · "+esc(p.name)+"</option>").join("")}

export async function initBackend(client,user){
  db=client;signedInUser=user;
  $("backendProgramControl").innerHTML='<label>Program aktif<select id="backendProgramSelect"><option value="">Memuat program…</option></select></label><span class="role-pill" id="rolePill">Memuat peran…</span>';
  $("programBackend").innerHTML='<div class="backend-loading">Memuat data program…</div>';
  $("coverageBackend").innerHTML='<div class="backend-loading">Memuat data survei…</div>';
  document.querySelectorAll("#speciesChips button").forEach(button=>button.addEventListener("click",()=>{selectedAnimal=button.dataset.animal}));
  $("backendProgramSelect").addEventListener("change",()=>selectProgram($("backendProgramSelect").value));
  $("speciesFilter").addEventListener("change",refreshDashboard);
  $("regionFilter").addEventListener("change",refreshDashboard);
  document.querySelector(".bar-blue")?.style.setProperty("width","0%");
  document.querySelector(".bar-amber")?.style.setProperty("width","0%");
  document.querySelectorAll(".session-grid .session-stat b").forEach(el=>{el.textContent="—"});
  document.querySelector(".lower-grid")?.classList.add("hidden");
  document.addEventListener("app:save-vaccination",saveVaccination);
  document.querySelector(".full-width")?.addEventListener("click",()=>{if(window.appSessionMode==="live"){toast("Sesi ditutup. Data tersinkron yang tersimpan tetap ada.")}});
  document.querySelectorAll('[data-view="program"]').forEach(button=>button.addEventListener("click",renderProgramPage));
  document.querySelectorAll('[data-view="coverage"]').forEach(button=>button.addEventListener("click",renderCoveragePage));
  document.querySelectorAll('[data-view="teams"]').forEach(button=>button.addEventListener("click",renderTeamPage));
  document.querySelectorAll('[data-view="logistics"]').forEach(button=>button.addEventListener("click",renderLogisticsPage));
  const {data:roleData,error:roleError}=await db.from("user_roles").select("role").eq("user_id",user.id);
  if(roleError){toast("Tidak dapat memuat peran pengguna.");globalRoles=[]}else globalRoles=(roleData||[]).map(x=>x.role);
  const {data:programData,error}=await db.from("programs").select("id,program_code,name,status,start_date,end_date,species,indicators").order("created_at",{ascending:false});
  if(error){$("programBackend").innerHTML='<div class="empty-state"><h2>Akses program belum tersedia</h2><p>Pastikan akun ditambahkan ke program dan mendapat peran di Supabase.</p></div>';return}
  programs=programData||[];
  const sync=document.querySelector(".sync-status");if(sync)sync.innerHTML="<i></i> Supabase aktif · data program";
  const foot=document.querySelector(".sidebar-footer");if(foot)foot.innerHTML="<span class=online-dot></span> Akun terhubung · akses sesuai peran";
  if(!programs.length){
    $("pageTitle").textContent="Belum ada program";
    renderProgramPage();
    $("backendProgramSelect").innerHTML='<option value="">Belum ada program yang dapat diakses</option>';
    $("targetValue").textContent="—";$("vaccinatedValue").textContent="—";$("completenessValue").textContent="—";$("timelinessValue").textContent="—";$("coverageBar").style.width="0%";$("completenessNote").textContent="Belum ada program yang dapat diakses";$("speciesSummary").innerHTML='<div class="empty-state">Belum ada data program.</div>';
    $("rolePill").textContent=globalRoles.join(", ")||"Belum ada peran";
    return;
  }
  $("backendProgramSelect").innerHTML=programOptionHtml();
  $("rolePill").textContent=globalRoles.join(", ")||"Anggota program";
  await selectProgram(programs[0].id);
  window.addEventListener("online",syncQueue);
  syncQueue();
}

async function selectProgram(id){
  activeProgram=programs.find(p=>p.id===id)||null;
  if(!activeProgram)return;
  $("backendProgramSelect").value=id;
  const activeSpecies=activeProgram.species||[];
  $("speciesFilter").innerHTML='<option value="all">Semua spesies</option>'+activeSpecies.map(s=>'<option value="'+esc(s)+'">'+esc(s)+'</option>').join("");
  const membership=await db.from("program_members").select("role,team_name").eq("program_id",id).eq("user_id",signedInUser.id).maybeSingle();
  activeMemberRole=membership.data?.role||null;
  $("rolePill").textContent=activeMemberRole||globalRoles.join(", ")||"viewer";
  const {data:targetData,error:targetError}=await db.from("village_targets").select("*").eq("program_id",id).order("village_name");
  if(targetError){toast("Gagal memuat target desa.");targets=[]}else targets=targetData||[];
  renderRegionOptions();
  const [{data:vaccData,error:vaccError},{data:surveyData,error:surveyError}]=await Promise.all([
    db.from("vaccination_events").select("village_code,species,vaccinated_count,vaccinated_at").eq("program_id",id).order("vaccinated_at",{ascending:false}).limit(1000),
    db.from("coverage_surveys").select("village_code,species,survey_date,sampled_households,animals_eligible,animals_verified_vaccinated,method").eq("program_id",id).order("survey_date",{ascending:false}).limit(1000)
  ]);
  if(vaccError)toast("Gagal memuat catatan vaksinasi.");if(surveyError)toast("Gagal memuat hasil survei.");
  vaccinations=vaccData||[];surveys=surveyData||[];
  $("pageTitle").textContent=activeProgram.name;
  $("coverageProgramLabel").textContent=activeProgram.program_code+" · "+activeProgram.name;
  $("fieldProgramCode").textContent="PROGRAM AKTIF · "+activeProgram.program_code;
  $("fieldProgramName").textContent=activeProgram.name;
  $("fieldProgramDate").textContent=activeProgram.start_date+" – "+activeProgram.end_date;
  renderVillageOptions();
  renderProgramPage();renderCoveragePage();refreshDashboard();
}

function renderRegionOptions(){
 const select=$("regionFilter");
 const villages=[...new Map(targets.map(t=>[t.village_code,t.village_name])).entries()];
 select.innerHTML='<option value="all">Semua desa</option>'+villages.map(([code,name])=>'<option value="'+esc(code)+'">'+esc(name)+'</option>').join("");
}

function renderVillageOptions(){
  const villageSelect=$("fieldVillageSelect");
  const villageNames=[...new Map(targets.map(t=>[t.village_code,t.village_name])).entries()];
  villageSelect.innerHTML='<option value="">Pilih desa sasaran</option>'+villageNames.map(([code,name])=>'<option value="'+esc(code)+'">'+esc(name)+" · "+esc(code)+"</option>").join("");
  $("fieldVillageLabel").textContent=villageNames.length+" desa sasaran tersedia";
  const species=[...new Set(targets.map(t=>t.species))];
  const chips=$("speciesChips");
  if(species.length)chips.innerHTML=species.map((s,i)=>'<button type="button" class="'+(i===0?"selected":"")+'" data-animal="'+esc(s)+'">'+esc(s)+"</button>").join("");
  document.querySelectorAll("#speciesChips button").forEach(button=>button.addEventListener("click",()=>{selectedAnimal=button.dataset.animal;document.querySelectorAll("#speciesChips button").forEach(chip=>chip.classList.toggle("selected",chip===button))}));
  if(species.length)selectedAnimal=species[0];
  $("saveAnimalBtn").disabled=!canVaccinate();
  if(!canVaccinate())$("saveAnimalBtn").title="Akun ini tidak memiliki peran vaksinator pada program ini";
}

function renderProgramPage(){
  const root=$("programBackend");if(!root)return;
  const rows=programs.length?programs.map(p=>'<tr><td><b>'+esc(p.program_code)+'</b><small>'+esc(p.start_date)+" – "+esc(p.end_date)+'</small></td><td>'+esc(p.name)+'</td><td><span class="status '+(p.status==="active"?"synced":"mid")+'">'+esc(p.status)+'</span></td><td>'+p.species.map(esc).join(", ")+'</td></tr>').join(""):'<tr><td colspan="4">Belum ada program yang diberikan kepada akun ini.</td></tr>';
  root.innerHTML='<div class="card panel backend-panel"><div class="panel-head"><div><h2>Program yang dapat diakses</h2><p>Setiap program memiliki kode, periode, spesies, dan indikator.</p></div>'+(canCreateProgram()?'<button class="button primary" id="showProgramForm">＋ Buat program</button>':"")+'</div><div id="programAccessNote" class="alert-note">'+(programs.length?("Peran program Anda: "+esc(activeMemberRole||globalRoles.join(", ")||"viewer")):"Akun koordinator perlu diberi peran program_coordinator pada Supabase untuk membuat program.")+'</div><div class="table-wrap"><table><thead><tr><th>ID program</th><th>Nama</th><th>Status</th><th>Spesies</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>'+
  (canCreateProgram()?'<form id="createProgramForm" class="card panel backend-form hidden"><h2>Program baru</h2><div class="form-grid"><label>Kode program<input name="program_code" required placeholder="RABIES-NTT-2026-001"></label><label>Nama program<input name="name" required placeholder="Vaksinasi Rabies NTT"></label><label>Tanggal mulai<input type="date" name="start_date" required></label><label>Tanggal selesai<input type="date" name="end_date" required></label><label>Target completeness (%)<input type="number" name="completeness" min="0" max="100" value="95" required></label><label>Target coverage (%)<input type="number" name="coverage" min="0" max="100" value="80" required></label><label>Target timeliness (%)<input type="number" name="timeliness" min="0" max="100" value="90" required></label></div><fieldset><legend>Spesies sasaran</legend><div class="species-checks">'+speciesNames.map(s=>'<label><input type="checkbox" name="species" value="'+s+'"> '+s+'</label>').join("")+'</div></fieldset><div class="form-actions"><button type="button" class="button outline" id="cancelProgramForm">Batal</button><button class="button primary">Simpan program</button></div></form>':"")+
  (activeProgram&&canManage()?targetFormHtml():"");
  $("showProgramForm")?.addEventListener("click",()=>$("createProgramForm").classList.remove("hidden"));
  $("cancelProgramForm")?.addEventListener("click",()=>$("createProgramForm").classList.add("hidden"));
  $("createProgramForm")?.addEventListener("submit",createProgram);
  $("targetForm")?.addEventListener("submit",createTarget);
}

function targetFormHtml(){
 return '<form id="targetForm" class="card panel backend-form"><h2>Tambah target populasi desa</h2><p>Masukkan estimasi per desa dan spesies sebagai penyebut indikator coverage.</p><div class="form-grid"><label>Kode desa<input name="village_code" required placeholder="ID-DESA-0001"></label><label>Nama desa<input name="village_name" required></label><label>Spesies<select name="species" required>'+speciesNames.map(s=>'<option>'+s+'</option>').join("")+'</select></label><label>Populasi sasaran<input type="number" name="target_population" min="0" required></label></div><div class="form-actions"><button class="button primary">Simpan target</button></div></form>';
}

async function createProgram(event){
 event.preventDefault();const form=event.currentTarget;const data=new FormData(form);const species=data.getAll("species");
 if(!species.length){toast("Pilih minimal satu spesies.");return}
 const payload={program_code:String(data.get("program_code")).trim(),name:String(data.get("name")).trim(),start_date:data.get("start_date"),end_date:data.get("end_date"),species,indicators:{completeness_target:Number(data.get("completeness")),coverage_target:Number(data.get("coverage")),timeliness_target:Number(data.get("timeliness"))},created_by:signedInUser.id};
 const {error}=await db.from("programs").insert(payload);
 if(error){toast("Program gagal disimpan: "+(error.code==="42501"?"akun tidak memiliki peran koordinator":error.message));return}
 toast("Program berhasil dibuat.");const {data:list}=await db.from("programs").select("id,program_code,name,status,start_date,end_date,species,indicators").order("created_at",{ascending:false});programs=list||[];
 $("backendProgramSelect").innerHTML=programOptionHtml();await selectProgram(programs[0].id);document.querySelector("[data-view=program]")?.click();
}
async function createTarget(event){
 event.preventDefault();const data=new FormData(event.currentTarget);const {error}=await db.from("village_targets").upsert({program_id:activeProgram.id,village_code:String(data.get("village_code")).trim(),village_name:String(data.get("village_name")).trim(),species:data.get("species"),target_population:Number(data.get("target_population")),updated_by:signedInUser.id},{onConflict:"program_id,village_code,species"});
 if(error){toast("Target gagal disimpan: "+error.message);return}toast("Target desa tersimpan.");await selectProgram(activeProgram.id);
}

function refreshDashboard(){
 if(!activeProgram)return;
 const species=$("speciesFilter").value||"all";
 const region=$("regionFilter").value||"all";
 const filteredTargets=targets.filter(t=>(species==="all"||t.species===species)&&(region==="all"||t.village_code===region));
 const filteredVaccinations=vaccinations.filter(e=>(species==="all"||e.species===species)&&(region==="all"||e.village_code===region));
 const target=filteredTargets.reduce((sum,t)=>sum+Number(t.target_population||0),0);
 const vaccinated=filteredVaccinations.reduce((sum,e)=>sum+Number(e.vaccinated_count||0),0);
 const targetPairs=new Set(filteredTargets.map(t=>t.village_code+"|"+t.species));
 const reportedPairs=new Set(filteredVaccinations.map(e=>e.village_code+"|"+e.species).filter(v=>targetPairs.has(v)));
 const completeness=targetPairs.size?Math.round(reportedPairs.size/targetPairs.size*100):null;
 const coverage=target?Math.round(vaccinated/target*100):null;
 window.adminCoverageCurrent=coverage===null?"—":coverage+"%";
 $("targetValue").textContent=target.toLocaleString("id-ID");
 $("vaccinatedValue").textContent=vaccinated.toLocaleString("id-ID");
 $("coverageBar").style.width=(coverage||0)+"%";
 $("completenessValue").textContent=completeness===null?"—":completeness+"%";
 $("completenessNote").textContent=reportedPairs.size+" dari "+targetPairs.size+" desa–spesies memiliki catatan";
 $("timelinessValue").textContent="—";
 $("speciesSummary").innerHTML=(species==="all"?[...new Set(targets.map(t=>t.species))]:[species]).map(s=>{
   const tg=filteredTargets.filter(t=>t.species===s).reduce((n,t)=>n+Number(t.target_population||0),0);
   const vac=filteredVaccinations.filter(e=>e.species===s).reduce((n,e)=>n+Number(e.vaccinated_count||0),0);
   const pct=tg?Math.round(vac/tg*100):0;
   const icon={Anjing:"🐕",Sapi:"🐄",Kambing:"🐐",Kucing:"🐈"}[s]||"🐾";
   return '<div class="species-row"><div class="animal-icon">'+icon+'</div><div><div class="species-name">'+esc(s)+'</div><div class="species-meta">Data program</div></div><div class="species-val">'+vac.toLocaleString("id-ID")+'<small>'+(tg?pct+"%":"Belum ada target")+'</small></div><div class="species-track"><i style="width:'+pct+'%"></i></div></div>';
 }).join("")||'<div class="empty-state">Belum ada target populasi per spesies.</div>';
 $("pageTitle").parentElement.querySelector("p").innerHTML=esc(activeProgram.program_code)+" · "+esc(activeProgram.start_date)+" – "+esc(activeProgram.end_date);
 const mapNotice=$("mapDataNotice");if(mapNotice)mapNotice.textContent="Peta ilustratif. Coverage administratif "+(coverage===null?"belum dapat dihitung":coverage+"%")+"; desa tanpa target tidak dihitung.";
}

function renderCoveragePage(){
 const root=$("coverageBackend");if(!root)return;
 if(!activeProgram){root.innerHTML='<div class="empty-state">Pilih program terlebih dahulu.</div>';return}
 const eligible=surveys.reduce((n,s)=>n+Number(s.animals_eligible||0),0);
 const verified=surveys.reduce((n,s)=>n+Number(s.animals_verified_vaccinated||0),0);
 const pct=eligible?Math.round(verified/eligible*100):null;
 const form=canSurvey()?'<form id="surveyForm" class="card panel backend-form"><h2>Catat survei coverage independen</h2><p>Catatan survei tetap terpisah dari data vaksinasi program.</p><div class="form-grid"><label>Desa<select name="village_code" required>'+[...new Map(targets.map(t=>[t.village_code,t.village_name])).entries()].map(([c,n])=>'<option value="'+esc(c)+'">'+esc(n)+'</option>').join("")+'</select></label><label>Spesies<select name="species" required>'+[...new Set(targets.map(t=>t.species))].map(s=>'<option>'+esc(s)+'</option>').join("")+'</select></label><label>Tanggal survei<input type="date" name="survey_date" required></label><label>Rumah tangga sampel<input type="number" name="sampled_households" min="0" required></label><label>Hewan eligible<input type="number" name="animals_eligible" min="0" required></label><label>Hewan terverifikasi divaksin<input type="number" name="animals_verified_vaccinated" min="0" required></label><label>Metode/desain sampel<input name="method" placeholder="Contoh: cluster sampling"></label></div><div class="form-actions"><button class="button primary">Simpan hasil survei</button></div></form>':'<div class="alert-note">Input survei hanya tersedia untuk peran <b>coverage_assessor</b> atau admin nasional pada program ini.</div>';
 const rows=surveys.slice(0,20).map(s=>'<tr><td>'+esc(s.survey_date)+'</td><td>'+esc(s.village_code)+'</td><td>'+esc(s.species)+'</td><td>'+Number(s.animals_verified_vaccinated)+' / '+Number(s.animals_eligible)+'</td><td>'+esc(s.method||"—")+'</td></tr>').join("")||'<tr><td colspan="5">Belum ada hasil survei.</td></tr>';
 root.innerHTML='<div class="kpis survey-kpis"><article class="card kpi"><div class="kpi-label">Coverage administratif</div><strong>'+(window.adminCoverageCurrent||"—")+'</strong><small>Catatan vaksinasi dibanding target</small></article><article class="card kpi"><div class="kpi-label">Proporsi sampel terverifikasi</div><strong>'+(pct===null?"—":pct+"%")+'</strong><small>'+verified+" dari "+eligible+' hewan; belum berbobot desain</small></article><article class="card kpi"><div class="kpi-label">Survei tercatat</div><strong>'+surveys.length+'</strong><small>Baris survei independen</small></article><article class="card kpi"><div class="kpi-label">Cakupan sampel</div><strong>'+eligible.toLocaleString("id-ID")+'</strong><small>Hewan eligible diperiksa</small></article></div>'+form+'<article class="card panel"><div class="panel-head"><div><h2>Catatan survei terbaru</h2><p>Disimpan terpisah dari tim vaksinasi</p></div></div><div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Kode desa</th><th>Spesies</th><th>Terverifikasi / eligible</th><th>Metode</th></tr></thead><tbody>'+rows+'</tbody></table></div></article>';
 $("surveyForm")?.addEventListener("submit",saveSurvey);
}

async function saveSurvey(event){
 event.preventDefault();if(!activeProgram||!canSurvey()){toast("Akun tidak memiliki peran asesor coverage.");return}
 const data=new FormData(event.currentTarget);const eligible=Number(data.get("animals_eligible"));const verified=Number(data.get("animals_verified_vaccinated"));
 if(verified>eligible){toast("Jumlah terverifikasi tidak boleh lebih besar dari hewan eligible.");return}
 const gps=await getGps();if(!gps)return;
 const record={client_event_id:crypto.randomUUID(),program_id:activeProgram.id,village_code:data.get("village_code"),species:data.get("species"),survey_date:data.get("survey_date"),sampled_households:Number(data.get("sampled_households")),animals_eligible:eligible,animals_verified_vaccinated:verified,latitude:gps.latitude,longitude:gps.longitude,method:String(data.get("method")||"").trim()||null,assessor_id:signedInUser.id};
 const {error}=await db.from("coverage_surveys").insert(record);
 if(error){toast("Survei tidak tersimpan: "+error.message);return}toast("Hasil survei coverage tersimpan.");const result=await db.from("coverage_surveys").select("village_code,species,survey_date,sampled_households,animals_eligible,animals_verified_vaccinated,method").eq("program_id",activeProgram.id).order("survey_date",{ascending:false}).limit(1000);surveys=result.data||[];renderCoveragePage();
}

async function saveVaccination(){
 if(!activeProgram||!canVaccinate()){toast("Akun tidak memiliki peran tim vaksinasi pada program ini.");return}
 const village=$("fieldVillageSelect").value;if(!village){toast("Pilih desa sasaran.");return}
 const count=Math.max(1,Number($("animalCount").value)||1);const gps=await getGps();if(!gps)return;
 const vaccine=document.querySelector(".vaccine-row select")?.value||null;
 const batch=document.querySelector(".vaccine-row input")?.value||null;
 const record={client_event_id:crypto.randomUUID(),program_id:activeProgram.id,village_code:village,species:selectedAnimal,vaccinated_count:count,vaccinated_at:new Date().toISOString(),latitude:gps.latitude,longitude:gps.longitude,location_accuracy_m:gps.accuracy,vaccine_name:vaccine,batch_number:batch,animal_group:{count,recorded_as:count>1?"group":"individual"},created_by:signedInUser.id};
 const status=$("offlineStatus");
 if(!navigator.onLine){queueRecord(record);if(status)status.innerHTML="<span>◉</span><div><b>Menunggu sinkronisasi</b><small>Catatan tersimpan lokal sampai jaringan tersedia.</small></div>";toast("Catatan disimpan di perangkat; akan dikirim saat online.");return}
 await sendRecord(record);
}
async function getGps(){
 if(!navigator.geolocation){toast("Perangkat tidak mendukung GPS.");return null}
 return new Promise(resolve=>navigator.geolocation.getCurrentPosition(p=>resolve({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy}),()=>{toast("Lokasi belum tersedia. Aktifkan izin lokasi lalu coba lagi.");resolve(null)},{enableHighAccuracy:true,timeout:15000,maximumAge:30000}));
}
function queueKey(){return "isikhnas-vax-queue:"+signedInUser.id}
function queueRecord(record){const q=JSON.parse(localStorage.getItem(queueKey())||"[]");q.push(record);localStorage.setItem(queueKey(),JSON.stringify(q))}
async function sendRecord(record){
 const {error}=await db.from("vaccination_events").upsert(record,{onConflict:"client_event_id"});
 if(error){
   if(!navigator.onLine||error.status===0||error.status>=500){queueRecord(record);toast("Jaringan terputus; catatan dimasukkan ke antrean perangkat.");return}
   toast("Catatan gagal disimpan: "+error.message);return
 }
 toast(record.vaccinated_count+" "+record.species.toLowerCase()+" berhasil disimpan.");
 const current=Number($("sessionVaccines").textContent)||0;$("sessionVaccines").textContent=String(current+record.vaccinated_count);
 const r=await db.from("vaccination_events").select("village_code,species,vaccinated_count,vaccinated_at").eq("program_id",activeProgram.id).order("vaccinated_at",{ascending:false}).limit(1000);vaccinations=r.data||[];refreshDashboard();
}
async function syncQueue(){
 if(!db||!signedInUser||!navigator.onLine)return;
 const key=queueKey();const queue=JSON.parse(localStorage.getItem(key)||"[]");if(!queue.length)return;
 const status=$("offlineStatus");if(status)status.innerHTML="<span>◉</span><div><b>Menyinkronkan</b><small>"+queue.length+" catatan menunggu dikirim.</small></div>";
 const remaining=[];
 for(const record of queue){const {error}=await db.from("vaccination_events").upsert(record,{onConflict:"client_event_id"});if(error)remaining.push(record)}
 localStorage.setItem(key,JSON.stringify(remaining));
 if(status)status.innerHTML=remaining.length?'<span>◉</span><div><b>Belum tersinkron</b><small>'+remaining.length+' catatan masih menunggu.</small></div>':'<span>◉</span><div><b>Tersinkron</b><small>Antrean lokal kosong.</small></div>';
 if(queue.length>remaining.length){
   toast((queue.length-remaining.length)+" catatan berhasil disinkronkan.");
   if(activeProgram){const refreshed=await db.from("vaccination_events").select("village_code,species,vaccinated_count,vaccinated_at").eq("program_id",activeProgram.id).limit(1000);vaccinations=refreshed.data||[];refreshDashboard()}
 }
}

async function renderTeamPage(){
 const root=$("programBackend");if(!root)return;
 if(!activeProgram){root.innerHTML='<div class="empty-state">Belum ada program yang dapat diakses.</div>';return}
 const {data:members,error}=await db.from("program_members").select("user_id,role,team_name,created_at").eq("program_id",activeProgram.id).order("created_at");
 if(error){root.innerHTML='<div class="empty-state">Daftar tim tidak dapat dimuat oleh peran akun ini.</div>';return}
 const rows=(members||[]).map(m=>'<tr><td><code>'+esc(m.user_id)+'</code></td><td>'+esc(m.team_name||"—")+'</td><td>'+esc(m.role)+'</td><td>'+new Date(m.created_at).toLocaleDateString("id-ID")+'</td></tr>').join("")||'<tr><td colspan="4">Belum ada anggota program.</td></tr>';
 root.innerHTML='<article class="card panel"><div class="panel-head"><div><h2>Tim program · '+esc(activeProgram.program_code)+'</h2><p>Anggota yang ditambahkan ke program dapat melihat catatan bersama sesuai perannya.</p></div></div><div class="table-wrap"><table><thead><tr><th>User ID</th><th>Tim</th><th>Peran</th><th>Ditambahkan</th></tr></thead><tbody>'+rows+'</tbody></table></div></article>'+
 (canManage()?'<form id="addMemberForm" class="card panel backend-form"><h2>Tambahkan anggota program</h2><p>Masukkan UUID akun yang sudah dibuat di Supabase Auth. Peran berlaku hanya untuk program ini.</p><div class="form-grid"><label>User UUID<input name="user_id" required placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"></label><label>Nama tim<input name="team_name" placeholder="Tim Kupang 01"></label><label>Peran<select name="role"><option>team_lead</option><option>vaccinator</option><option>coverage_assessor</option><option>logistics_officer</option><option>viewer</option><option>program_coordinator</option></select></label></div><div class="form-actions"><button class="button primary">Tambahkan ke program</button></div></form>':'<div class="alert-note">Pengelolaan anggota hanya tersedia untuk koordinator program.</div>');
 $("addMemberForm")?.addEventListener("submit",async event=>{event.preventDefault();const d=new FormData(event.currentTarget);const {error}=await db.from("program_members").upsert({program_id:activeProgram.id,user_id:String(d.get("user_id")).trim(),team_name:String(d.get("team_name")||"").trim()||null,role:d.get("role")},{onConflict:"program_id,user_id"});if(error){toast("Anggota gagal ditambahkan: "+error.message);return}toast("Anggota dan peran program tersimpan.");renderTeamPage()});
}

async function renderLogisticsPage(){
 const root=$("programBackend");if(!root)return;
 if(!activeProgram){root.innerHTML='<div class="empty-state">Belum ada program yang dapat diakses.</div>';return}
 const [{data:items,error:itemError},{data:tx,error:txError}]=await Promise.all([
  db.from("logistics_items").select("id,item_name,unit,planned_quantity").eq("program_id",activeProgram.id).order("item_name"),
  db.from("inventory_transactions").select("id,item_id,transaction_type,quantity,batch_number,occurred_at").eq("program_id",activeProgram.id).order("occurred_at",{ascending:false}).limit(50)
 ]);
 if(itemError||txError){root.innerHTML='<div class="empty-state">Data logistik belum dapat dimuat untuk program ini.</div>';return}
 const itemList=items||[], transactions=tx||[];
 const txRows=transactions.map(t=>{const item=itemList.find(i=>i.id===t.item_id);return '<tr><td>'+new Date(t.occurred_at).toLocaleDateString("id-ID")+'</td><td>'+esc(item?.item_name||"Item")+'</td><td>'+esc(t.transaction_type)+'</td><td>'+Number(t.quantity).toLocaleString("id-ID")+' '+esc(item?.unit||"")+'</td><td>'+esc(t.batch_number||"—")+'</td></tr>'}).join("")||'<tr><td colspan="5">Belum ada transaksi logistik.</td></tr>';
 const itemOptions=itemList.map(i=>'<option value="'+i.id+'">'+esc(i.item_name)+' ('+esc(i.unit)+')</option>').join("");
 root.innerHTML='<article class="card panel"><div class="panel-head"><div><h2>Logistik program · '+esc(activeProgram.program_code)+'</h2><p>Rencana kebutuhan, penerimaan, distribusi, pemakaian, dan sisa logistik.</p></div></div><div class="table-wrap"><table><thead><tr><th>Item</th><th>Satuan</th><th>Rencana kebutuhan</th></tr></thead><tbody>'+(itemList.map(i=>'<tr><td>'+esc(i.item_name)+'</td><td>'+esc(i.unit)+'</td><td>'+Number(i.planned_quantity).toLocaleString("id-ID")+'</td></tr>').join("")||'<tr><td colspan="3">Belum ada item logistik.</td></tr>')+'</tbody></table></div></article>'+
 (canManage()||role("logistics_officer")?'<form id="itemForm" class="card panel backend-form"><h2>Tambah item kebutuhan</h2><div class="form-grid"><label>Nama item<input name="item_name" required placeholder="Vaksin rabies"></label><label>Satuan<input name="unit" required placeholder="dosis"></label><label>Jumlah rencana<input name="planned_quantity" type="number" min="0" step="0.01" value="0"></label></div><div class="form-actions"><button class="button primary">Simpan item</button></div></form>':"")+
 (role("logistics_officer")?'<form id="transactionForm" class="card panel backend-form"><h2>Catat pergerakan stok</h2><div class="form-grid"><label>Item<select name="item_id" required>'+itemOptions+'</select></label><label>Jenis transaksi<select name="transaction_type"><option>received</option><option>issued</option><option>used</option><option>wasted</option><option>returned</option></select></label><label>Jumlah<input name="quantity" type="number" min="0.01" step="0.01" required></label><label>Nomor batch<input name="batch_number"></label><label>Kode desa (jika relevan)<input name="village_code"></label></div><div class="form-actions"><button class="button primary">Simpan transaksi</button></div></form>':'<div class="alert-note">Pencatatan transaksi hanya tersedia untuk petugas logistik.</div>')+
 '<article class="card panel"><div class="panel-head"><div><h2>Transaksi terbaru</h2><p>Riwayat pergerakan stok program</p></div></div><div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Item</th><th>Transaksi</th><th>Jumlah</th><th>Batch</th></tr></thead><tbody>'+txRows+'</tbody></table></div></article>';
 $("itemForm")?.addEventListener("submit",async event=>{event.preventDefault();const d=new FormData(event.currentTarget);const {error}=await db.from("logistics_items").insert({program_id:activeProgram.id,item_name:String(d.get("item_name")).trim(),unit:String(d.get("unit")).trim(),planned_quantity:Number(d.get("planned_quantity"))||0});if(error){toast("Item gagal disimpan: "+error.message);return}toast("Item logistik tersimpan.");renderLogisticsPage()});
 $("transactionForm")?.addEventListener("submit",async event=>{event.preventDefault();const d=new FormData(event.currentTarget);const {error}=await db.from("inventory_transactions").insert({client_event_id:crypto.randomUUID(),program_id:activeProgram.id,item_id:d.get("item_id"),transaction_type:d.get("transaction_type"),quantity:Number(d.get("quantity")),batch_number:String(d.get("batch_number")||"").trim()||null,village_code:String(d.get("village_code")||"").trim()||null});if(error){toast("Transaksi gagal disimpan: "+error.message);return}toast("Transaksi logistik tersimpan.");renderLogisticsPage()});
}
