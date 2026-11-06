(() => {
  const el = document.getElementById("coverageMap");
  if (!el) return;
  const center = [-9.35, 121.35];
  const demoPoints = [
    {lat:-9.65,lng:120.26,village:"Contoh · Sumba",species:"Anjing",count:72,coverage:76},
    {lat:-10.17,lng:123.61,village:"Contoh · Kupang",species:"Sapi",count:84,coverage:58},
    {lat:-8.84,lng:121.66,village:"Contoh · Ende",species:"Kambing",count:61,coverage:34},
    {lat:-8.62,lng:122.21,village:"Contoh · Maumere",species:"Anjing",count:43,coverage:null},
    {lat:-9.11,lng:124.89,village:"Contoh · Atambua",species:"Kucing",count:28,coverage:81}
  ];
  let map = null;
  let layer = null;

  function ensureMap() {
    if (map || !window.L) return !!map;
    map = L.map(el, {zoomControl:true, scrollWheelZoom:false, preferCanvas:true}).setView(center, 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom:18,
      attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'
    }).addTo(map);
    layer = L.layerGroup().addTo(map);
    setTimeout(() => map && map.invalidateSize(), 120);
    return true;
  }

  function colorClass(percent) {
    if (percent == null || !Number.isFinite(percent)) return "none";
    if (percent >= 70) return "high";
    if (percent >= 40) return "mid";
    return "low";
  }

  function render(points, notice, fit) {
    const status = document.getElementById("mapEmptyState");
    const label = document.getElementById("mapDataNotice");
    if (label) label.textContent = notice;
    if (!ensureMap()) {
      if (status) { status.textContent = "Peta membutuhkan koneksi internet."; status.classList.add("visible"); }
      return;
    }
    layer.clearLayers();
    points.forEach(point => {
      const klass = colorClass(point.coverage);
      const icon = L.divIcon({
        className:"",
        html:'<span class="coverage-marker '+klass+'">'+String(point.count > 99 ? "99+" : point.count)+'</span>',
        iconSize:[34,34],
        iconAnchor:[17,17]
      });
      const marker = L.marker([point.lat, point.lng], {icon});
      const title = point.village || "Lokasi GPS";
      const meta = (point.species || "Berbagai spesies") + " · " + Number(point.count||0).toLocaleString("id-ID") + " vaksinasi";
      marker.bindPopup('<div class="map-popup-title">'+escapeHtml(title)+'</div><div class="map-popup-meta">'+escapeHtml(meta)+'</div>'+
        (point.demo?'<div class="map-popup-meta">Data ilustratif, bukan lokasi kegiatan riil.</div>':'')+
        (point.coverage==null?'':'<div class="map-popup-meta">Capaian desa: '+Math.round(point.coverage)+'%</div>'));
      marker.addTo(layer);
    });
    if (status) {
      status.textContent = points.length ? (points.some(p=>p.demo) ? "Lokasi contoh · bukan data riil" : points.length+" titik GPS kegiatan") : "Belum ada catatan GPS untuk program ini";
      status.classList.add("visible");
    }
    if (fit && points.length) {
      const bounds = L.latLngBounds(points.map(p=>[p.lat,p.lng]));
      map.fitBounds(bounds, {padding:[30,30],maxZoom:8});
    } else {
      map.setView(center, 6);
    }
    setTimeout(() => map && map.invalidateSize(), 100);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  }

  function renderVaccinations(detail) {
    const rows = detail?.vaccinations || [];
    const targets = detail?.targets || [];
    const valid = rows.filter(row => Number.isFinite(Number(row.latitude)) && Number.isFinite(Number(row.longitude)) &&
      row.latitude !== null && row.longitude !== null);
    const targetByVillage = new Map();
    targets.forEach(row => {
      const key = row.village_code;
      targetByVillage.set(key, (targetByVillage.get(key)||0) + Number(row.target_population||0));
    });
    const vaccinatedByVillage = new Map();
    rows.forEach(row => {
      vaccinatedByVillage.set(row.village_code, (vaccinatedByVillage.get(row.village_code)||0)+Number(row.vaccinated_count||0));
    });
    const grouped = new Map();
    valid.forEach(row => {
      const lat=Number(row.latitude), lng=Number(row.longitude);
      const key=lat.toFixed(4)+","+lng.toFixed(4);
      const item=grouped.get(key)||{lat,lng,count:0,villages:new Set(),species:new Set()};
      item.count+=Number(row.vaccinated_count||0);
      item.villages.add(row.village_code);
      item.species.add(row.species);
      grouped.set(key,item);
    });
    const points=[...grouped.values()].map(item=>{
      const village=[...item.villages][0];
      const target=targetByVillage.get(village)||0;
      const vaccinated=vaccinatedByVillage.get(village)||0;
      return {lat:item.lat,lng:item.lng,count:item.count,village,species:[...item.species].join(", "),coverage:target?Math.round(vaccinated/target*100):null};
    });
    render(points, points.length
      ? "Titik dari catatan GPS; batas administrasi desa belum ditampilkan"
      : "Belum ada catatan dengan koordinat GPS untuk program ini", true);
  }

  document.addEventListener("app:session-ready", event => {
    if (event.detail?.mode === "demo") render(demoPoints.map(p=>({...p,demo:true})), "Peta interaktif · lokasi dan capaian hanya ilustrasi", false);
    else render([], "Peta lokasi program", false);
  });
  document.addEventListener("app:mapdata", event => {
    if (window.appSessionMode === "live") renderVaccinations(event.detail);
  });
  window.addEventListener("resize", () => map && map.invalidateSize());
  if (!window.L) {
    const retry = setInterval(() => {
      if (window.L) { clearInterval(retry); if (window.appSessionMode) document.dispatchEvent(new Event("app:session-ready")); }
    }, 300);
    setTimeout(() => clearInterval(retry), 10000);
  }
})();
