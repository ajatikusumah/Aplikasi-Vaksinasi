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
    document.getElementById("genericHeading").textContent=views[name].heading;
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
  const count=Math.max(1,parseInt(document.getElementById("animalCount").value,10)||1);
  const current=parseInt(document.getElementById("sessionVaccines").textContent,10)||0;
  document.getElementById("sessionVaccines").textContent=String(current+count);
  showToast(count+" "+selectedSpecies.toLowerCase()+" disimpan di perangkat");
  document.getElementById("saveAnimalBtn").textContent="＋ Catat individu";
});
document.querySelector(".full-width").addEventListener("click",function(){showToast("Sesi ditutup · data menunggu sinkronisasi")});
