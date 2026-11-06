const screen=document.getElementById("loginScreen");
const form=document.getElementById("loginForm");
const message=document.getElementById("loginMessage");
const submit=document.getElementById("loginSubmit");
const demoButton=document.getElementById("demoLogin");
let supabaseClient=null;
let sessionMode="demo";

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
      if(session) await openLiveSession(session.user);
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
