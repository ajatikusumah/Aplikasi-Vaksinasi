const screen=document.getElementById("loginScreen");
const form=document.getElementById("loginForm");
const message=document.getElementById("loginMessage");
const submit=document.getElementById("loginSubmit");
const demoButton=document.getElementById("demoLogin");
let supabaseClient=null;
let sessionMode="demo";
const incomingAuthParams=new URLSearchParams(window.location.hash.slice(1));
const incomingAuthType=incomingAuthParams.get("type")||new URLSearchParams(window.location.search).get("type");

function showPasswordSetup(user){
  const original=screen.querySelector(".login-card");
  if(original) original.hidden=true;
  const side=screen.querySelector(".login-side");
  if(side) side.hidden=true;
  screen.classList.add("password-setup");
  const card=document.createElement("section");
  card.className="login-card password-setup-card";
  card.innerHTML='<div class="login-brand"><div class="brand-icon">✳</div><div><strong>iSIKHNAS</strong><span>VAKSINASI</span></div></div><div class="login-kicker">AKTIVASI AKUN</div><h1>Buat kata sandi</h1><p class="login-intro">Undangan untuk '+String(user?.email||"akun Anda").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","\\'":"&#39;"}[c]))+'. Buat kata sandi untuk menyelesaikan aktivasi.</p><form id="passwordSetupForm"><label for="newPassword">Kata sandi baru</label><input id="newPassword" type="password" autocomplete="new-password" minlength="12" required placeholder="Minimal 12 karakter"><label for="confirmPassword">Ulangi kata sandi</label><input id="confirmPassword" type="password" autocomplete="new-password" minlength="12" required placeholder="Ulangi kata sandi"><p id="passwordSetupMessage" class="login-message" role="status">Gunakan minimal 12 karakter.</p><button class="login-submit" type="submit">Simpan kata sandi <span>→</span></button></form>';
  screen.append(card);
  screen.hidden=false;
  const setupForm=card.querySelector("#passwordSetupForm");
  setupForm.addEventListener("submit",async event=>{
    event.preventDefault();
    const password=card.querySelector("#newPassword").value;
    const confirmation=card.querySelector("#confirmPassword").value;
    const status=card.querySelector("#passwordSetupMessage");
    const button=setupForm.querySelector("button");
    if(password.length<12){status.textContent="Kata sandi harus minimal 12 karakter.";return}
    if(password!==confirmation){status.textContent="Kedua kata sandi belum sama.";return}
    button.disabled=true;
    status.textContent="Menyimpan kata sandi…";
    const {data,error}=await supabaseClient.auth.updateUser({password});
    if(error){status.textContent="Kata sandi belum tersimpan. Tautan mungkin kedaluwarsa; minta undangan baru.";button.disabled=false;return}
    window.history.replaceState({},document.title,window.location.pathname+window.location.search);
    await openLiveSession(data.user||user);
  });
}

async function openLiveSession(user){
  showApp("live",user);
  try{const {initBackend}=await import("./backend.js");await initBackend(supabaseClient,user)}catch(error){const toast=document.getElementById("toast");toast.textContent="Login berhasil, tetapi data backend gagal dimuat.";toast.classList.add("show")}
}

function showApp(mode, user){
  sessionMode=mode;
  window.appSessionMode=mode;
  document.body.classList.add("authenticated");
  screen.hidden=true;
  const actions=document.querySelector(".top-actions");
  if(actions){
    let signout=document.getElementById("logoutBtn");
    if(!signout){
      signout=document.createElement("button");
      signout.id="logoutBtn";
      signout.className="logout-button";
      signout.type="button";
      actions.appendChild(signout);
    }
    signout.textContent=mode==="demo"?"Keluar demo":"Keluar";
    signout.onclick=async()=>{
      if(mode==="live"&&supabaseClient) await supabaseClient.auth.signOut();
      document.body.classList.remove("authenticated","demo-mode");
      window.appSessionMode=null;
      screen.hidden=false;
      form.reset();
    };
    const status=document.querySelector(".sidebar-footer");
    if(status) status.innerHTML=mode==="demo"
      ?'<span class="online-dot"></span> Mode demo · data ilustratif'
      :'<span class="online-dot"></span> Login aktif · angka dashboard masih demo';
    const sync=document.querySelector(".sync-status");
    if(sync) sync.innerHTML=mode==="demo"
      ?'<i></i> Demo · tanpa sinkronisasi'
      :'<i></i> Login aktif · data demo';
    const avatar=document.querySelector(".avatar");
    if(avatar) avatar.textContent=(user?.email||"DE").slice(0,2).toUpperCase();
  }
  document.body.classList.toggle("demo-mode",mode==="demo");
  document.dispatchEvent(new CustomEvent("app:session-ready",{detail:{mode}}));
}

async function configureAuth(){
  try{
    const config=window.SUPABASE_CONFIG || await (async()=>{
      const response=await fetch("/api/config",{cache:"no-store"});
      return response.json();
    })();
    if(config.url&&config.publishableKey){
      const {createClient}=await import("https://esm.sh/@supabase/supabase-js@2");
      supabaseClient=createClient(config.url,config.publishableKey);
      message.textContent="Gunakan akun yang dibuat oleh administrator.";
      submit.disabled=false;
      const {data:{session}}=await supabaseClient.auth.getSession();
      if(session && (incomingAuthType==="invite" || incomingAuthType==="recovery")){
        window.history.replaceState({},document.title,window.location.pathname+window.location.search);
        showPasswordSetup(session.user);
      }else if(session){
        await openLiveSession(session.user);
      }else if(incomingAuthType==="invite" || incomingAuthType==="recovery"){
        message.textContent="Tautan aktivasi tidak valid atau sudah kedaluwarsa. Minta undangan baru.";
      }
    }else{
      message.textContent="Login server belum dikonfigurasi. Mockup tersedia melalui akun demo.";
      submit.disabled=true;
    }
  }catch(error){
    message.textContent="Login server belum terhubung. Mockup demo tetap tersedia.";
    submit.disabled=true;
  }
}

form.addEventListener("submit",async(event)=>{
  event.preventDefault();
  if(!supabaseClient)return;
  submit.disabled=true;
  message.textContent="Memeriksa akun…";
  const {data,error}=await supabaseClient.auth.signInWithPassword({
    email:document.getElementById("loginEmail").value.trim(),
    password:document.getElementById("loginPassword").value
  });
  if(error){
    message.textContent="Email atau kata sandi tidak sesuai.";
    submit.disabled=false;
    return;
  }
  await openLiveSession(data.user);
});
demoButton.addEventListener("click",()=>showApp("demo",{email:"demo@isikhnas.local"}));
configureAuth();
