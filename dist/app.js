const dataBySpecies={
  all:{target:"12.450",vaccinated:"8.740",percent:70.2,items:[["🐕","Anjing","4.820","91%"],["🐄","Sapi","2.140","85%"],["🐐","Kambing","1.780","79%"],["🐈","Kucing","—","—"]]},
  Anjing:{target:"6.800",vaccinated:"4.820",percent:70.9,items:[["🐕","Anjing","4.820","71%"]]},
  Sapi:{target:"2.900",vaccinated:"2.140",percent:73.8,items:[["🐄","Sapi","2.140","74%"]]},
  Kambing:{target:"2.300",vaccinated:"1.780",percent:77.4,items:[["🐐","Kambing","1.780","77%"]]},
  Kucing:{target:"450",vaccinated:"—",percent:0,items:[["🐈","Kucing","—","Belum ada data"]]}
};
const speciesFilter=document.getElementById("speciesFilter");
const summary=document.getElementById("speciesSummary");
function renderSpecies(key){
  const data=dataBySpecies[key]||dataBySpecies.all;
  document.getElementById("targetValue").textContent=data.target;
  document.getElementById("vaccinatedValue").textContent=data.vaccinated;
  document.getElementById("coverageBar").style.width=data.percent+"%";
  summary.innerHTML=data.items.map(function(item){
    const percent=parseInt(item[3],10)||0;
    return '<div class="species-row"><div class="animal-icon">'+item[0]+'</div><div><div class="species-name">'+item[1]+'</div><div class="species-meta">Target program</div></div><div class="species-val">'+item[2]+'<small>'+item[3]+'</small></div><div class="species-track"><i style="width:'+percent+'%"></i></div></div>';
  }).join("");
}
renderSpecies("all");

const gpsButton=document.getElementById("captureGpsBtn");
if(gpsButton){
  gpsButton.addEventListener("click",function(){
    const summary=document.getElementById("gpsSummary"),coordinates=document.getElementById("gpsCoordinates");
    if(!navigator.geolocation){showToast("Perangkat ini tidak menyediakan GPS.");return}
    gpsButton.disabled=true;gpsButton.textContent="Mencari lokasi…";
    navigator.geolocation.getCurrentPosition(function(position){
      window.currentCapturedGps={latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy,capturedAt:new Date().toISOString()};
      if(summary)summary.textContent="⌖ GPS ±"+Math.round(position.coords.accuracy)+" m";
      if(coordinates)coordinates.textContent=position.coords.latitude.toFixed(6)+", "+position.coords.longitude.toFixed(6)+" · akurasi ±"+Math.round(position.coords.accuracy)+" m";
      gpsButton.disabled=false;gpsButton.textContent="↻ Perbarui GPS";showToast("Koordinat lokasi berhasil direkam.");
    },function(){gpsButton.disabled=false;gpsButton.textContent="⌖ Ambil GPS";showToast("Lokasi belum tersedia. Aktifkan izin lokasi lalu coba lagi.")},{enableHighAccuracy:true,timeout:20000,maximumAge:0});
  });
}
window.addEventListener("online",function(){document.body.classList.remove("offline-mode")});
window.addEventListener("offline",function(){document.body.classList.add("offline-mode")});
if(!navigator.onLine)document.body.classList.add("offline-mode");

window.updateDemoCoverageDashboard=function(summary){
  window.demoCoverageSummary=summary;
  const species=["Anjing","Sapi","Kambing","Kucing"],icons={Anjing:"🐕",Sapi:"🐄",Kambing:"🐐",Kucing:"🐈"},selected=speciesFilter.value||"all";
  const from=document.getElementById("dateFromFilter")?.value,to=document.getElementById("dateToFilter")?.value,days=from&&to?Math.max(1,(new Date(to)-new Date(from))/86400000):0,period=!days?"all":days<=7?"7d":days<=30?"30d":days<=90?"90d":days<=183?"6m":days<=365?"1y":"all",rows=summary[period]||summary.all||[],index=species.indexOf(selected),demoRows=window.demoCoverageData?.rows,region=window.getSelectedRegionCode?.()||"all",bucketRows=species.map(()=>[0,0]);
  if(demoRows){const now=Date.now(),start=from?new Date(from+"T00:00:00").getTime():-Infinity,end=to?new Date(to+"T23:59:59").getTime():Infinity,ranges=[[now-7*864e5,now],[now-30*864e5,now-7*864e5],[now-90*864e5,now-30*864e5],[now-180*864e5,now-90*864e5],[now-365*864e5,now-180*864e5],[-Infinity,now-365*864e5]],fractions=ranges.map(([a,b])=>{const lo=Math.max(a,start),hi=Math.min(b,end);return hi<=lo?0:Number.isFinite(a)?Math.min(1,(hi-lo)/(b-a)):1});for(const [code,targets,buckets] of demoRows){if(region!=="all"&&!String(code).replace(/\D/g,"").startsWith(String(region).replace(/\D/g,"")))continue;for(let i=0;i<species.length;i++){bucketRows[i][0]+=Number(targets[i]||0);for(let j=0;j<6;j++)bucketRows[i][1]+=Number(buckets[j]?.[i]||0)*fractions[j]}}}
  const totalRows=demoRows?bucketRows:rows,target=index<0?totalRows.reduce((n,x)=>n+Number(x[0]||0),0):Number(totalRows[index]?.[0]||0),vaccinated=index<0?totalRows.reduce((n,x)=>n+Number(x[1]||0),0):Number(totalRows[index]?.[1]||0),percent=target?Math.round(vaccinated/target*100):0;
  document.getElementById("targetValue").textContent=target.toLocaleString("id-ID");
  document.getElementById("vaccinatedValue").textContent=vaccinated.toLocaleString("id-ID");
  document.getElementById("coverageBar").style.width=percent+"%";
  document.getElementById("completenessValue").textContent="—";
  document.getElementById("completenessNote").textContent="Simulasi geografis untuk demo";
  document.getElementById("speciesSummary").innerHTML=species.filter((_,i)=>index<0||index===i).map((name)=>{
    const i=species.indexOf(name),t=Number(totalRows[i]?.[0]||0),v=Number(totalRows[i]?.[1]||0),p=t?Math.round(v/t*100):0;
    return '<div class="species-row"><div class="animal-icon">'+icons[name]+'</div><div><div class="species-name">'+name+'</div><div class="species-meta">Data simulasi nasional</div></div><div class="species-val">'+v.toLocaleString("id-ID")+'<small>'+p+'%</small></div><div class="species-track"><i style="width:'+p+'%"></i></div></div>';
  }).join("");
};
speciesFilter.addEventListener("change",function(){
  if(document.body.classList.contains("demo-mode")&&window.demoCoverageSummary)window.updateDemoCoverageDashboard(window.demoCoverageSummary);else renderSpecies(speciesFilter.value);
  window.updateCoverageMap?.({species:speciesFilter.value||"all"});
});
function refreshDemoFilters(){
  if(document.body.classList.contains("demo-mode")&&window.demoCoverageSummary)window.updateDemoCoverageDashboard(window.demoCoverageSummary);
  window.updateCoverageMap?.({species:speciesFilter.value||"all",region:window.getSelectedRegionCode?.()||"all",dateFrom:document.getElementById("dateFromFilter")?.value||"",dateTo:document.getElementById("dateToFilter")?.value||""});
}
document.querySelectorAll("#dateFromFilter,#dateToFilter").forEach(el=>el.addEventListener("change",refreshDemoFilters));
document.addEventListener("coverage:region-change",refreshDemoFilters);
document.getElementById("programFilter")?.addEventListener("change",()=>window.updateCoverageMap?.({programName:document.getElementById("programFilter").selectedOptions[0]?.textContent||"Simulasi Nasional"}));

const views={
  dashboard:{node:"coordinatorView",title:"Dashboard"},
  coverage:{node:"coverageView",title:"Survei coverage"},
  program:{node:"genericView",title:"Program",heading:"Daftar program vaksinasi"},
  teams:{node:"genericView",title:"Tim lapangan",heading:"Pengelolaan tim lapangan"},
  logistics:{node:"genericView",title:"Logistik",heading:"Stok dan alokasi logistik"},
  reports:{node:"genericView",title:"Laporan",heading:"Laporan program"}
};
function openView(name){
  if(!views[name])return;
  document.getElementById("coordinatorView").classList.add("hidden");
  document.getElementById("coverageView").classList.add("hidden");
  document.getElementById("genericView").classList.add("hidden");
  document.getElementById(views[name].node).classList.remove("hidden");
  document.getElementById("crumbTitle").textContent=views[name].title;
  if(views[name].node==="genericView"){
    document.getElementById("genericTitle").textContent=views[name].title;
    if(document.getElementById("genericHeading"))document.getElementById("genericHeading").textContent=views[name].heading;
  }
  document.querySelectorAll("[data-view]").forEach(function(button){
    button.classList.toggle("active",button.dataset.view===name);
  });
}
document.querySelectorAll("[data-view]").forEach(function(button){
  button.addEventListener("click",function(){if(!document.body.classList.contains("field-mode"))openView(button.dataset.view)});
});
document.querySelectorAll("[data-open-view]").forEach(function(button){
  button.addEventListener("click",function(){openView(button.dataset.openView)});
});
function showToast(message){
  const toast=document.getElementById("toast");
  toast.textContent=message;
  toast.classList.add("show");
  window.setTimeout(function(){toast.classList.remove("show")},2500);
}
const coordinatorView=document.getElementById("coordinatorView");
const coverageView=document.getElementById("coverageView");
const genericView=document.getElementById("genericView");
const fieldView=document.getElementById("fieldView");
const fieldModeBtn=document.getElementById("fieldModeBtn");
function setFieldMode(enabled){
  document.body.classList.toggle("field-mode",enabled);
  coordinatorView.classList.toggle("hidden",enabled);
  coverageView.classList.add("hidden");
  genericView.classList.add("hidden");
  fieldView.classList.toggle("hidden",!enabled);
  fieldModeBtn.querySelector("span").textContent=enabled?"Kembali ke koordinator":"Mode petugas";
  document.getElementById("crumbTitle").textContent=enabled?"Tugas lapangan":"Dashboard";
}
fieldModeBtn.addEventListener("click",function(){setFieldMode(!document.body.classList.contains("field-mode"))});
document.getElementById("coordinatorModeBtn").addEventListener("click",function(){setFieldMode(false)});
document.getElementById("newRecordBtn").addEventListener("click",function(){setFieldMode(true)});
document.getElementById("mobileRecord").addEventListener("click",function(){setFieldMode(true)});

let selectedSpecies="Anjing";
document.querySelectorAll("#speciesChips button").forEach(function(button){
  button.addEventListener("click",function(){
    selectedSpecies=button.dataset.animal;
    document.querySelectorAll("#speciesChips button").forEach(function(chip){chip.classList.toggle("selected",chip===button)});
    const pet=selectedSpecies==="Anjing"||selectedSpecies==="Kucing";
    document.getElementById("sterileWrap").classList.toggle("hidden",!pet);
    document.getElementById("tagWrap").classList.toggle("hidden",pet);
  });
});
document.getElementById("groupBtn").addEventListener("click",function(){
  document.getElementById("animalCount").value="10";
  document.getElementById("saveAnimalBtn").textContent="▧ Simpan kelompok";
  showToast("Mode catat kelompok dipilih");
});
document.getElementById("saveAnimalBtn").addEventListener("click",function(){
  if(window.appSessionMode==="live"){
    document.dispatchEvent(new Event("app:save-vaccination"));
    return;
  }
  const count=Math.max(1,parseInt(document.getElementById("animalCount").value,10)||1);
  const current=parseInt(document.getElementById("sessionVaccines").textContent,10)||0;
  document.getElementById("sessionVaccines").textContent=String(current+count);
  showToast(count+" "+selectedSpecies.toLowerCase()+" disimpan di perangkat");
  document.getElementById("saveAnimalBtn").textContent="＋ Catat individu";
});
document.querySelector(".full-width").addEventListener("click",function(){showToast(window.appSessionMode==="live"?"Penutupan sesi belum disambungkan; catatan per kejadian tersimpan terpisah.":"Sesi demo ditutup.")});
