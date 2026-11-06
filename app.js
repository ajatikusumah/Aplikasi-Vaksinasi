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
speciesFilter.addEventListener("change",function(){renderSpecies(speciesFilter.value)});

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


const areaControls={
  province:document.getElementById("provinceFilter"),
  regency:document.getElementById("regencyFilter"),
  district:document.getElementById("districtFilter"),
  village:document.getElementById("villageFilter")
};
let areaRows=[
  {province:"NTT",provinceName:"Nusa Tenggara Timur",regency:"kupang",regencyName:"Kabupaten Kupang",district:"kupang-tengah",districtName:"Kupang Tengah",village:"baumata",villageName:"Baumata"},
  {province:"NTT",provinceName:"Nusa Tenggara Timur",regency:"kupang",regencyName:"Kabupaten Kupang",district:"kupang-timur",districtName:"Kupang Timur",village:"oelatimo",villageName:"Oelatimo"},
  {province:"NTT",provinceName:"Nusa Tenggara Timur",regency:"sumba-barat-daya",regencyName:"Sumba Barat Daya",district:"kodi",districtName:"Kodi",village:"watu-ulu",villageName:"Watu Ulu"},
  {province:"NTT",provinceName:"Nusa Tenggara Timur",regency:"ende",regencyName:"Kabupaten Ende",district:"ende",districtName:"Ende",village:"ende-contoh",villageName:"Contoh Desa · Ende"},
  {province:"NTT",provinceName:"Nusa Tenggara Timur",regency:"sikka",regencyName:"Kabupaten Sikka",district:"alok",districtName:"Alok",village:"maumere-contoh",villageName:"Contoh Desa · Maumere"},
  {province:"NTT",provinceName:"Nusa Tenggara Timur",regency:"belu",regencyName:"Kabupaten Belu",district:"atik",districtName:"Atik",village:"atambua-contoh",villageName:"Contoh Desa · Atambua"}
];
const allAreaOption={
  province:["all","Semua provinsi"],regency:["all","Semua kabupaten/kota"],
  district:["all","Semua kecamatan"],village:["all","Semua desa"]
};
function areaLabel(row,level){
  return row[level+"Name"]||row[level]||"Belum dipetakan";
}
function fillAreaSelect(level,rows,disabled){
  const select=areaControls[level];if(!select)return;
  const prior=select.value;
  const unique=new Map();
  rows.forEach(row=>{
    const value=row[level]||"unmapped";
    if(!unique.has(value))unique.set(value,areaLabel(row,level));
  });
  const first=allAreaOption[level];
  select.innerHTML='<option value="'+first[0]+'">'+first[1]+'</option>'+
    [...unique.entries()].map(([value,label])=>'<option value="'+String(value).replace(/&/g,"&amp;").replace(/"/g,"&quot;")+'">'+String(label).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")+'</option>').join("");
  select.disabled=disabled||unique.size===0;
  if([...select.options].some(option=>option.value===prior))select.value=prior;
}
function selectedAreas(){
  return {
    province:areaControls.province?.value||"all",
    regency:areaControls.regency?.value||"all",
    district:areaControls.district?.value||"all",
    village:areaControls.village?.value||"all"
  };
}
function renderAreaFilters(){
  const selected=selectedAreas();
  const provinces=areaRows;
  fillAreaSelect("province",provinces,false);
  const provinceRows=selected.province==="all"?areaRows:areaRows.filter(row=>row.province===selected.province);
  fillAreaSelect("regency",provinceRows,selected.province==="all");
  const regencyRows=selected.regency==="all"?provinceRows:provinceRows.filter(row=>row.regency===selected.regency);
  fillAreaSelect("district",regencyRows,selected.regency==="all");
  const districtRows=selected.district==="all"?regencyRows:regencyRows.filter(row=>row.district===selected.district);
  fillAreaSelect("village",districtRows,selected.district==="all");
  const villages=selected.village==="all"?districtRows:districtRows.filter(row=>row.village===selected.village);
  const legacy=document.getElementById("regionFilter");
  if(legacy){
    legacy.innerHTML='<option value="all">Semua desa</option>'+[...new Map(villages.map(row=>[row.village,row.villageName])).entries()]
      .map(([code,name])=>'<option value="'+String(code).replace(/&/g,"&amp;").replace(/"/g,"&quot;")+'">'+String(name).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")+'</option>').join("");
    legacy.value=selected.village==="all"?"all":selected.village;
  }
  document.dispatchEvent(new CustomEvent("app:area-change",{detail:selected}));
  if(legacy)legacy.dispatchEvent(new Event("change"));
}
function setAreaTargets(targets){
  if(!Array.isArray(targets)||!targets.length)return;
  const unique=new Map();
  targets.forEach(row=>{
    const village=String(row.village_code||row.village_id||row.village_name||"");
    if(!village)return;
    const provinceName=row.province_name||row.province||"Belum dipetakan";
    const regencyName=row.regency_name||row.kabupaten_name||row.regency||row.kabupaten||"Belum dipetakan";
    const districtName=row.district_name||row.kecamatan_name||row.district||row.kecamatan||"Belum dipetakan";
    unique.set(village,{
      province:String(row.province_code||provinceName),provinceName:String(provinceName),
      regency:String(row.regency_code||row.kabupaten_code||regencyName),regencyName:String(regencyName),
      district:String(row.district_code||row.kecamatan_code||districtName),districtName:String(districtName),
      village,villageName:String(row.village_name||village)
    });
  });
  areaRows=[...unique.values()];
  Object.values(areaControls).forEach(select=>{if(select)select.value="all"});
  renderAreaFilters();
}
window.getAreaSelection=selectedAreas;
window.setAreaTargets=setAreaTargets;
Object.entries(areaControls).forEach(([level,select])=>{
  if(select)select.addEventListener("change",()=>{
    if(level==="province"){areaControls.regency.value="all";areaControls.district.value="all";areaControls.village.value="all"}
    if(level==="regency"){areaControls.district.value="all";areaControls.village.value="all"}
    if(level==="district")areaControls.village.value="all";
    renderAreaFilters();
  });
});
renderAreaFilters();
