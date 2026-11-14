(function(){
  "use strict";
  const root="data/boundaries/indonesia/";
  const files={kabkota:root+"kabkota/all.geojson.gz",provinceList:root+"provinces.json"};
  const codeFields={desa:"KDEPUM",kecamatan:"KDCPUM",kabkota:"KDPKAB"};
  const nameFields={desa:"WADMKD",kecamatan:"WADMKC",kabkota:"WADMKK"};
  const codeLengths={desa:10,kecamatan:6,kabkota:4};
  const cache=new Map();
  let level="kabkota",province="all",payload={targets:[],vaccinations:[],species:"all",region:"all"};
  let renderSequence=0;
  const svg=document.getElementById("coveragePolygonMap");
  const provinceSelect=document.getElementById("regionProvince"),kabupatenSelect=document.getElementById("regionKabupaten"),kecamatanSelect=document.getElementById("regionKecamatan"),desaSelect=document.getElementById("regionDesa");
  const info=document.getElementById("mapSelectionInfo");
  const notice=document.getElementById("mapDataNotice");
  if(!svg)return;

  function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function digits(value){return String(value??"").replace(/\D/g,"")}
  function formatCode(value){
    const d=digits(value);
    if(d.length>=10)return d.slice(0,2)+"."+d.slice(2,4)+"."+d.slice(4,6)+"."+d.slice(6,10);
    if(d.length>=6)return d.slice(0,2)+"."+d.slice(2,4)+"."+d.slice(4,6);
    if(d.length>=4)return d.slice(0,2)+"."+d.slice(2,4);
    return d;
  }
  function areaCode(value){const d=digits(value);return formatCode(d.slice(0,codeLengths[level]))}
  function provinceCode(value){return digits(value).slice(0,2)}
  function unitCode(feature){return formatCode(feature?.properties?.[codeFields[level]])}
  function aggregate(){
    const totals=new Map();
    const ensure=code=>{if(!totals.has(code))totals.set(code,{target:0,vaccinated:0});return totals.get(code)};
    if(payload.demo){
      const names=payload.demo.species||[],selected=payload.species&&payload.species!=="all"?names.indexOf(payload.species):-1;
      const from=payload.dateFrom?new Date(payload.dateFrom+"T00:00:00").getTime():-Infinity,to=payload.dateTo?new Date(payload.dateTo+"T23:59:59").getTime():Infinity,now=Date.now();
      const ranges=[[now-7*864e5,now],[now-30*864e5,now-7*864e5],[now-90*864e5,now-30*864e5],[now-180*864e5,now-90*864e5],[now-365*864e5,now-180*864e5],[-Infinity,now-365*864e5]];
      const bucketFractions=ranges.map(([a,b])=>{const lo=Math.max(a,from),hi=Math.min(b,to);if(hi<=lo)return 0;return Number.isFinite(a)?Math.min(1,(hi-lo)/(b-a)):1});
      for(const [villageCode,targets,vaccineBuckets] of payload.demo.rows||[]){
        if(payload.region&&payload.region!=="all"&&!digits(villageCode).startsWith(digits(payload.region)))continue;
        const code=areaCode(villageCode);if(!code)continue;const tally=ensure(code);
        if(selected>=0){tally.target+=Number(targets[selected]||0);for(let b=0;b<6;b++)tally.vaccinated+=Number(vaccineBuckets[b]?.[selected]||0)*bucketFractions[b]}
        else for(let i=0;i<names.length;i++){tally.target+=Number(targets[i]||0);for(let b=0;b<6;b++)tally.vaccinated+=Number(vaccineBuckets[b]?.[i]||0)*bucketFractions[b]}
      }
      return totals;
    }
    for(const row of payload.targets||[]){
      if(payload.species&&payload.species!=="all"&&row.species!==payload.species)continue;
      if(payload.region&&payload.region!=="all"&&!digits(row.village_code).startsWith(digits(payload.region)))continue;
      const code=areaCode(row.village_code);if(code)ensure(code).target+=Number(row.target_population||0);
    }
    for(const row of payload.vaccinations||[]){
      if(payload.species&&payload.species!=="all"&&row.species!==payload.species)continue;
      if(payload.region&&payload.region!=="all"&&!digits(row.village_code).startsWith(digits(payload.region)))continue;
      const code=areaCode(row.village_code);if(code)ensure(code).vaccinated+=Number(row.vaccinated_count||0);
    }
    return totals;
  }
  function geometryRings(geometry){
    if(!geometry)return [];
    if(geometry.type==="Polygon")return geometry.coordinates||[];
    if(geometry.type==="MultiPolygon")return (geometry.coordinates||[]).flat(1);
    return [];
  }
  function collectBounds(features){
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const feature of features)for(const ring of geometryRings(feature.geometry))for(const point of ring){
      const x=Number(point[0]),y=Number(point[1]);
      if(Number.isFinite(x)&&Number.isFinite(y)){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}
    }
    return {minX,minY,maxX,maxY};
  }
  function projector(b){
    const width=900,height=520,pad=20,dx=Math.max(.0001,b.maxX-b.minX),dy=Math.max(.0001,b.maxY-b.minY);
    const scale=Math.min((width-pad*2)/dx,(height-pad*2)/dy);
    const drawnW=dx*scale,drawnH=dy*scale,offsetX=(width-drawnW)/2,offsetY=(height-drawnH)/2;
    return ([lon,lat])=>[offsetX+(lon-b.minX)*scale,height-offsetY-(lat-b.minY)*scale];
  }
  function ringPath(ring,project){
    if(!ring?.length)return "";
    let d="";
    for(let i=0;i<ring.length;i++){const [x,y]=project(ring[i]);d+=(i?"L":"M")+x.toFixed(1)+" "+y.toFixed(1)}
    return d+"Z";
  }
  function geometryPath(geometry,project){return geometryRings(geometry).map(r=>ringPath(r,project)).filter(Boolean).join("")}
  function coverageClass(tally){if(!tally||!tally.target)return "none";const p=tally.vaccinated/tally.target*100;return p>=70?"high":p>=40?"mid":"low"}
  function coverageText(tally){if(!tally||!tally.target)return "Belum ada target";return `${Math.round(tally.vaccinated/tally.target*100)}% (${tally.vaccinated.toLocaleString("id-ID")}/${tally.target.toLocaleString("id-ID")})`}
  async function fetchJson(path){
    if(cache.has(path))return cache.get(path);
    const response=await fetch(path);if(!response.ok)throw new Error("Data polygon gagal dimuat.");
    let data;
    if(path.endsWith(".gz")){
      if(!window.DecompressionStream)throw new Error("Browser ini belum mendukung pembukaan layer polygon terkompresi.");
      const stream=response.body.pipeThrough(new DecompressionStream("gzip"));data=JSON.parse(await new Response(stream).text());
    }else data=await response.json();
    cache.set(path,data);return data;
  }
  function loading(message){svg.innerHTML=`<rect width="900" height="520" rx="12" fill="#edf4ef"/><text x="450" y="260" text-anchor="middle" class="map-loading">${escapeHtml(message)}</text>`}
  function render(features){
    if(!features?.length){loading(level==="desa"||level==="kecamatan"?"Pilih provinsi untuk melihat polygon.":"Tidak ada polygon pada pilihan ini.");return}
    const bounds=collectBounds(features),project=projector(bounds),totals=aggregate();
    const paths=features.map(feature=>{
      const props=feature.properties||{},code=unitCode(feature),name=props[nameFields[level]]||props.NAMOBJ||code||"Wilayah";
      const tally=totals.get(code),coverage=coverageText(tally),target=Number(tally?.target||0),vaccinated=Number(tally?.vaccinated||0),d=geometryPath(feature.geometry,project);
      if(!d)return "";
      return `<path class="boundary-polygon coverage-${coverageClass(tally)}" data-code="${escapeHtml(code)}" data-name="${escapeHtml(name)}" data-coverage="${escapeHtml(coverage)}" data-target="${target}" data-vaccinated="${vaccinated}" tabindex="0" role="button" aria-label="${escapeHtml(name)}, ${escapeHtml(code)}, cakupan ${escapeHtml(coverage)}" d="${d}"><title>${escapeHtml(name)} · ${escapeHtml(code)} · ${escapeHtml(coverage)}</title></path>`;
    }).join("");
    svg.innerHTML=`<rect width="900" height="520" rx="12" fill="#edf4ef"/><g class="boundary-layer">${paths}</g>`;
    const showInfo=path=>{
      const target=Number(path.dataset.target||0),vaccinated=Number(path.dataset.vaccinated||0);
      const amount=target?`${vaccinated.toLocaleString("id-ID")} divaksinasi dari target ${target.toLocaleString("id-ID")}`:`${vaccinated.toLocaleString("id-ID")} divaksinasi · belum ada target populasi`;
      const species=payload.species&&payload.species!=="all"?payload.species:"gabungan semua spesies";
      const program=payload.programName||"Simulasi Nasional";
      const period=payload.dateFrom||payload.dateTo?`${payload.dateFrom||"awal data"} sampai ${payload.dateTo||"sekarang"}`:"semua tanggal";
      info.textContent=`${path.dataset.name} (${path.dataset.code}) · Program ${program} · Cakupan ${path.dataset.coverage.split(" ")[0]} · ${amount} · ${species} · ${period}.`;
    };
    const clearInfo=()=>{const selected=svg.querySelector(".boundary-polygon.selected");if(selected)showInfo(selected);else info.textContent="Sorot atau ketuk polygon untuk melihat rincian cakupan wilayah."};
    // Event delegation avoids adding several listeners to every village polygon.
    const pathFrom=target=>target instanceof Element?target.closest(".boundary-polygon"):null;
    svg.onpointerover=event=>{const path=pathFrom(event.target);if(path&&!path.contains(event.relatedTarget))showInfo(path)};
    svg.onpointerout=event=>{const path=pathFrom(event.target);if(path&&!path.contains(event.relatedTarget))clearInfo()};
    svg.onfocusin=event=>{const path=pathFrom(event.target);if(path)showInfo(path)};
    svg.onfocusout=event=>{const path=pathFrom(event.target);if(path)clearInfo()};
    svg.onclick=event=>{const path=pathFrom(event.target);if(!path)return;svg.querySelector(".boundary-polygon.selected")?.classList.remove("selected");path.classList.add("selected");showInfo(path)};
    svg.onkeydown=event=>{const path=pathFrom(event.target);if(path&&(event.key==="Enter"||event.key===" ")){event.preventDefault();path.click()}};
    const levelName={desa:"desa/kelurahan",kecamatan:"kecamatan/distrik",kabkota:"kabupaten/kota"}[level];
    const pName=province==="all"?"seluruh Indonesia":provinceSelect?.selectedOptions[0]?.textContent||"provinsi terpilih";
    if(notice)notice.textContent=window.appSessionMode==="demo"?`SIMULASI · data ilustrasi, bukan capaian lapangan · ${levelName} ${pName} · Program ${payload.programName||"Simulasi Nasional"}.`:`Batas ${levelName} · ${pName} · Program ${payload.programName||""} · geodatabase 1 Juni 2026.`;
  }
  async function refresh(){
    const sequence=++renderSequence;
    level=desaSelect?.value&&desaSelect.value!=="all"?"desa":kecamatanSelect?.value&&kecamatanSelect.value!=="all"?"desa":kabupatenSelect?.value&&kabupatenSelect.value!=="all"?"kecamatan":"kabkota";
    province=provinceSelect?.value||"all";loading("Memuat polygon administrasi…");
    try{
      if(level==="kabkota"){
        const data=await fetchJson(files.kabkota);
        if(sequence!==renderSequence)return;
        let features=province==="all"?data.features:(data.features||[]).filter(f=>provinceCode(f.properties?.KDPPUM)===province);
        if(kabupatenSelect?.value&&kabupatenSelect.value!=="all")features=features.filter(f=>digits(f.properties?.[codeFields.kabkota])===digits(kabupatenSelect.value));
        render(features);return;
      }
      if(province==="all"){render([]);if(notice)notice.textContent="Pilih provinsi untuk memuat polygon desa atau kecamatan.";return}
      const layer=level==="kecamatan"?"kecamatan":"desa";
      const data=await fetchJson(`${root}${layer}/${province}.geojson.gz`);if(sequence!==renderSequence)return;
      let features=data.features||[];
      if(kabupatenSelect?.value&&kabupatenSelect.value!=="all")features=features.filter(f=>digits(f.properties?.["KDPKAB"])===digits(kabupatenSelect.value));
      if(kecamatanSelect?.value&&kecamatanSelect.value!=="all")features=features.filter(f=>digits(f.properties?.["KDCPUM"])===digits(kecamatanSelect.value));
      if(desaSelect?.value&&desaSelect.value!=="all")features=features.filter(f=>digits(f.properties?.["KDEPUM"])===digits(desaSelect.value));
      render(features);
    }catch(error){if(sequence!==renderSequence)return;loading("Layer batas wilayah tidak dapat dimuat.");if(notice)notice.textContent=error.message||"Data polygon tidak tersedia."}
  }
  window.getSelectedRegionCode=()=>[desaSelect,kecamatanSelect,kabupatenSelect,provinceSelect].map(s=>s?.value).find(v=>v&&v!=="all")||"all";
  window.updateCoverageMap=function(next){if("targets" in next||"vaccinations" in next)payload.demo=null;payload={...payload,...next};refresh()};
  window.loadDemoCoverage=async function(){const demo=await fetchJson(root+"demo-coverage.json.gz");window.demoCoverageData=demo;payload={...payload,targets:[],vaccinations:[],demo,species:document.getElementById("speciesFilter")?.value||"all",region:"all",programName:"Simulasi Nasional"};refresh();return demo};
  const reset=(select,label,disabled=true)=>{if(!select)return;select.innerHTML=`<option value="all">${label}</option>`;select.value="all";select.disabled=disabled};
  async function cascade(levelChanged){
    if(levelChanged==="province"){province=provinceSelect.value;reset(kabupatenSelect,"Semua kabupaten/kota",!province||province==="all");reset(kecamatanSelect,"Semua kecamatan",true);reset(desaSelect,"Semua desa",true);
      if(province&&province!=="all"){const d=await fetchJson(files.kabkota);const rows=d.features.filter(f=>provinceCode(f.properties?.KDPPUM)===province);kabupatenSelect.insertAdjacentHTML("beforeend",[...new Map(rows.map(f=>[digits(f.properties.KDPKAB),f.properties.WADMKK])).entries()].map(([c,n])=>`<option value="${c}">${escapeHtml(n)}</option>`).join(""))}}
    if(levelChanged==="kabupaten"){const code=kabupatenSelect.value;reset(kecamatanSelect,"Semua kecamatan",!code||code==="all");reset(desaSelect,"Semua desa",true);if(code&&code!=="all"){const d=await fetchJson(`${root}kecamatan/${provinceSelect.value}.geojson.gz`);const rows=d.features.filter(f=>digits(f.properties?.KDPKAB)===digits(code));kecamatanSelect.insertAdjacentHTML("beforeend",[...new Map(rows.map(f=>[digits(f.properties.KDCPUM),f.properties.WADMKC])).entries()].map(([c,n])=>`<option value="${c}">${escapeHtml(n)}</option>`).join(""))}}
    if(levelChanged==="kecamatan"){const code=kecamatanSelect.value;reset(desaSelect,"Semua desa",!code||code==="all");if(code&&code!=="all"){const d=await fetchJson(`${root}desa/${provinceSelect.value}.geojson.gz`);const rows=d.features.filter(f=>digits(f.properties?.KDCPUM)===digits(code));desaSelect.insertAdjacentHTML("beforeend",[...new Map(rows.map(f=>[digits(f.properties.KDEPUM),f.properties.WADMKD])).entries()].map(([c,n])=>`<option value="${c}">${escapeHtml(n)}</option>`).join(""))}}
    refresh();document.dispatchEvent(new CustomEvent("coverage:region-change"));
  }
  provinceSelect?.addEventListener("change",()=>cascade("province"));kabupatenSelect?.addEventListener("change",()=>cascade("kabupaten"));kecamatanSelect?.addEventListener("change",()=>cascade("kecamatan"));desaSelect?.addEventListener("change",()=>{refresh();document.dispatchEvent(new CustomEvent("coverage:region-change"))});
  document.getElementById("mapFitBtn")?.addEventListener("click",()=>{if(info)info.textContent="Tampilan disesuaikan dengan wilayah yang dipilih.";refresh()});
  async function init(){
    try{
      const items=await fetchJson(files.provinceList);
      if(provinceSelect)provinceSelect.insertAdjacentHTML("beforeend",items.map(p=>`<option value="${escapeHtml(p.code)}">${escapeHtml(p.name)}</option>`).join(""));
    }catch(error){if(notice)notice.textContent="Daftar provinsi tidak dapat dimuat."}
    // Defer the large geometry download and SVG render until the dashboard opens.
  }
  init();
})();
