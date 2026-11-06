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
const allAreaOption={province:"Semua provinsi",regency:"Semua kabupaten/kota",district:"Semua kecamatan",village:"Semua desa/kelurahan"};
let areaTree=[
  ["demo-ntt","Nusa Tenggara Timur",[
    ["demo-kupang","Kabupaten Kupang",[
      ["demo-kupang-tengah","Kupang Tengah",[["demo-baumata","Baumata","Desa"]]],
      ["demo-kupang-timur","Kupang Timur",[["demo-oelatimo","Oelatimo","Desa"]]]
    ]],
    ["demo-sumba-barat-daya","Kabupaten Sumba Barat Daya",[
      ["demo-kodi","Kodi",[["demo-watu-ulu","Watu Ulu","Desa"]]]
    ]],
    ["demo-ende","Kabupaten Ende",[["demo-ende-kota","Ende",[["demo-ende-village","Contoh Desa · Ende","Desa"]]]]],
    ["demo-sikka","Kabupaten Sikka",[["demo-alok","Alok",[["demo-maumere-village","Contoh Desa · Maumere","Kelurahan"]]]]],
    ["demo-belu","Kabupaten Belu",[["demo-atik","Atik",[["demo-atambua-village","Contoh Desa · Atambua","Desa"]]]]]
  ]]
];
const areaChildren={province:2,regency:2,district:2};
const escapeArea=value=>String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
function selectedAreas(){
  return {
    province:areaControls.province?.value||"all",
    regency:areaControls.regency?.value||"all",
    district:areaControls.district?.value||"all",
    village:areaControls.village?.value||"all"
  };
}
function fillAreaSelect(level,nodes,disabled,selected){
  const select=areaControls[level];if(!select)return;
  const optionName=allAreaOption[level];
  const nameCounts=level==="village"?nodes.reduce((counts,node)=>{counts[node[1]]=(counts[node[1]]||0)+1;return counts;},{}):{};
  const labels=nodes.map(node=>{
    let label=node[1];
    if(level==="village"){
      if(node[2])label+=" ("+node[2].toLowerCase()+")";
      if(nameCounts[node[1]]>1)label+=" · "+node[0];
    }
    return '<option value="'+escapeArea(node[0])+'">'+escapeArea(label)+'</option>';
  }).join("");
  select.innerHTML='<option value="all">'+optionName+'</option>'+labels;
  select.disabled=disabled||nodes.length===0;
  if([...select.options].some(option=>option.value===selected))select.value=selected;
}
function renderAreaFilters(){
  const selected=selectedAreas();
  fillAreaSelect("province",areaTree,false,selected.province);
  const province=areaTree.find(node=>node[0]===selected.province);
  const regencies=province?province[2]:[];
  fillAreaSelect("regency",regencies,selected.province==="all",selected.regency);
  const regency=regencies.find(node=>node[0]===selected.regency);
  const districts=regency?regency[2]:[];
  fillAreaSelect("district",districts,selected.regency==="all",selected.district);
  const district=districts.find(node=>node[0]===selected.district);
  const villages=district?district[2]:[];
  fillAreaSelect("village",villages,selected.district==="all",selected.village);
  document.dispatchEvent(new CustomEvent("app:area-change",{detail:selectedAreas()}));
}
function resetAreaChildren(level){
  if(level==="province"){areaControls.regency.value="all";areaControls.district.value="all";areaControls.village.value="all"}
  if(level==="regency"){areaControls.district.value="all";areaControls.village.value="all"}
  if(level==="district")areaControls.village.value="all";
}
Object.entries(areaControls).forEach(([level,select])=>{
  if(select)select.addEventListener("change",()=>{resetAreaChildren(level);renderAreaFilters()});
});
window.getAreaSelection=selectedAreas;
renderAreaFilters();
async function loadOfficialAreaData(){
  try{
    const response=await fetch("./data/wilayah.gz.b64");
    if(!response.ok)throw new Error("Daftar wilayah tidak tersedia");
    const encoded=(await response.text()).trim();
    const binary=atob(encoded);
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    const data=await new Response(stream).json();
    if(Array.isArray(data.p)&&data.p.length){areaTree=data.p;renderAreaFilters()}
  }catch(error){
    console.warn("Data wilayah resmi belum dapat dimuat; pilihan contoh tetap tersedia.",error);
  }
}
loadOfficialAreaData();
