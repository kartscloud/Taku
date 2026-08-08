/* taku · accounts  ——  BUILT BUT NOT SHIPPED
   ============================================================================
   Off by default. Nothing in this file runs unless store.get("authEnabled") is
   true, so current users are untouched until someone deliberately flips it.

   TWO BACKENDS behind one interface:
     · "mock"     — no network, no project needed. Lets the whole flow be walked
                    and tested today. NEVER ship with this active.
     · "firebase" — the real one. Selected automatically as soon as a real config
                    is present in auth-config.js.

   SECURITY RULES THIS FILE OBEYS, and why:
     1. The password is read from the input element, handed to the backend, and
        dropped. It is never stored, never logged, never hashed here, never put
        in localStorage. Not even by the mock — the mock holds no credential at
        all, precisely so it cannot teach the pattern it exists to avoid.
     2. No session token is written by us. The Firebase SDK owns persistence.
        OWASP session-management guidance is explicit that auth tokens do not
        belong in localStorage/sessionStorage, so we never put them there.
     3. Login/reset failures return one generic message regardless of whether
        the account exists, so the form can't be used to enumerate who has one.
     4. Client-side "is this user verified" checks are CONVENIENCE ONLY. They
        are bypassable from devtools. Real enforcement lives in the Firestore
        security rules (see firestore.rules) — that is the only thing that
        actually protects data. */

const AUTH_FLAG="authEnabled";
function authEnabled(){return !!store.get(AUTH_FLAG,false);}

/* NIST SP 800-63B: length is what matters, composition rules do not. Minimum 8,
   generous maximum, no forced symbol/case nonsense — that only pushes people
   toward Password1! and a sticky note. */
const PW_MIN=8, PW_MAX=200;
const PW_WORST=["password","12345678","qwertyui","11111111","iloveyou","letmein1",
  "sunshine","princess","football","password1","abc12345","123456789","qwerty123"];
function pwProblem(pw){
  if(!pw||pw.length<PW_MIN)return "Use at least "+PW_MIN+" characters.";
  if(pw.length>PW_MAX)return "That's too long.";
  if(PW_WORST.includes(pw.toLowerCase()))return "That password is on every breach list. Pick another.";
  return null;
}
function pwStrength(pw){
  if(!pw)return 0;
  let s=Math.min(4,Math.floor(pw.length/5));
  if(/[^a-zA-Z0-9]/.test(pw))s++;
  if(/[0-9]/.test(pw)&&/[a-zA-Z]/.test(pw))s++;
  return Math.max(0,Math.min(4,s-1));
}
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function emailProblem(e){return EMAIL_RE.test((e||"").trim())?null:"That doesn't look like an email address.";}
/* Usernames are a public handle, so keep the character set boring: it avoids
   homograph impersonation and URL-encoding surprises later. */
const USER_RE=/^[a-z0-9_]{3,18}$/;

/* Usernames are public, so they need moderation before they need anything else.
   App Store guideline 1.2 requires a content filter on user-generated content;
   an unfiltered handle field is a submission blocker on its own.

   The list is base64 so this source file is not itself a slur dump. It is
   checked against a NORMALISED form of the name, because "n1gg3r" and "n_i_g_g"
   are the same word to a human and a plain substring match catches neither. */
const _BAN_SUB_B64="bmlnZXI=,ZmFnb3Q=,d2V0YmFjaw==,Y2hpbGRwb3Ju,bW9sZXN0,cmFwaXN0,dHJhbnk=,aGl0bGVy,d2hvcmU=";   // matched anywhere in the handle
const _BAN_EXACT_B64="aw==,Y29u,c3BpYw==,Y2hpbms=,a2lrZQ==,cGFraQ==,Z29r,ZHlrZQ==,cGVkbw==,bmF6aQ==,Y3A=,bmlnYQ==,bmlnZXI=,ZmFn,ZmFnb3Q=,cmV0YXJk,Y3VudA==,cmFwZQ==,c2x1dA=="; // matched only as the WHOLE handle
const _RESERVED=["admin","administrator","taku","support","help","staff","mod","moderator",
  "official","root","system","security","billing","null","undefined","me","you"];
let _banCache=null;
function _banLists(){
  if(!_banCache){
    const dec=b=>b.split(",").map(x=>{try{return atob(x);}catch(e){return "";}}).filter(Boolean);
    _banCache={sub:dec(_BAN_SUB_B64),exact:dec(_BAN_EXACT_B64)};
  }
  return _banCache;
}
/* Collapse the usual evasions: digit-for-letter swaps, separators, and repeated
   characters, so "n1gg3r" and "n_i_g_g_e_r" reduce to the same string.
   The stored terms are collapsed the same way at build time, which is why the
   two lists are split: collapsing "kkk" yields "k", and a substring rule on
   that would reject every handle containing the letter k. */
function _normalizeHandle(u){
  return (u||"").toLowerCase()
    .replace(/[^a-z0-9]/g,"")
    .replace(/0/g,"o").replace(/1/g,"i").replace(/3/g,"e").replace(/4/g,"a")
    .replace(/5/g,"s").replace(/7/g,"t").replace(/8/g,"b").replace(/9/g,"g")
    .replace(/(.)\1+/g,"$1");
}
function usernameProblem(u){
  if(!u)return "Pick a username.";
  if(!USER_RE.test(u))return "3–18 characters: lowercase letters, numbers and _ only.";
  const n=_normalizeHandle(u);
  if(_RESERVED.includes(u)||_RESERVED.includes(n))return "That username is reserved.";
  const B=_banLists();
  if(B.exact.includes(n))return "Pick a different username.";
  if(B.sub.some(w=>n.includes(w)))return "Pick a different username.";
  return null;
}

/* ---------------------------------------------------------------- mock backend
   Deliberately stores no credential. Sign-in accepts any password that passes
   the same validation the real backend would apply, and rejects the literal
   "wrongpassword" so the failure path is walkable. */
const MockAuth={
  name:"mock",
  _db(){return store.get("mockauth",{users:{},names:{},session:null});},
  _save(d){store.set("mockauth",d);},
  async signUp({email,password,name,username}){
    const d=this._db(), key=email.toLowerCase();
    if(d.users[key])throw authError("email-in-use");
    if(d.names[username])throw authError("username-taken");
    const uid="mock_"+Math.abs(hashStr(key)).toString(36);
    d.users[key]={uid,email:key,name,username,verified:false,created:Date.now()};
    d.names[username]=uid;
    d.session=key;
    this._save(d);
    await this.sendVerification();     // real backends send on signup; match that
    return this.current();
  },
  async signIn({email,password}){
    const d=this._db(), key=(email||"").toLowerCase();
    if(!d.users[key]||password==="wrongpassword")throw authError("bad-credentials");
    d.session=key;this._save(d);
    return this.current();
  },
  async signOut(){const d=this._db();d.session=null;this._save(d);},
  current(){const d=this._db();if(!d.session)return null;const u=d.users[d.session];return u?{...u}:null;},
  async reload(){return this.current();},
  async sendVerification(){
    /* Simulates the inbox trip. The real backend cannot do this — only the user
       clicking the emailed link flips the flag there. */
    const d=this._db();if(!d.session)return;
    setTimeout(()=>{const x=this._db();if(x.users[x.session]){x.users[x.session].verified=true;this._save(x);}},4000);
  },
  async resetPassword(){/* no-op: nothing to reset without a credential store */},
  async deleteAccount(){
    const d=this._db();if(!d.session)return;
    const u=d.users[d.session];
    if(u)delete d.names[u.username];
    delete d.users[d.session];d.session=null;this._save(d);
  },
  async pushData(blob){const d=this._db();d.cloud=d.cloud||{};if(d.session)d.cloud[d.session]=blob;this._save(d);},
  async pullData(){const d=this._db();return (d.cloud&&d.session)?d.cloud[d.session]||null:null;}
};
function hashStr(s){let h=0;for(let i=0;i<s.length;i++){h=(h<<5)-h+s.charCodeAt(i);h|=0;}return h;}
function authError(code){const e=new Error(code);e.code=code;return e;}

/* ------------------------------------------------------------ firebase backend
   Loaded lazily from gstatic as UMD "compat" builds, which work from plain
   script tags — this project has no bundler. Counter-intuitively the compat
   build is SMALLER than the modular one here (~49KB vs ~63KB gz), because
   gstatic's prebuilt ESM files are not tree-shaken. */
const FB_VER="10.12.2";
const FirebaseAuth={
  name:"firebase",
  _ready:null,
  async _init(){
    if(this._ready)return this._ready;
    this._ready=(async()=>{
      await loadScript(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-app-compat.js`);
      await loadScript(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-auth-compat.js`);
      await loadScript(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-firestore-compat.js`);
      firebase.initializeApp(window.TAKU_FIREBASE);
      /* WKWebView drops the default persistence on cold start, which on a swipe
         app means a login screen every single launch. IndexedDB survives it. */
      await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      return firebase;
    })();
    return this._ready;
  },
  _shape(u,extra){
    if(!u)return null;
    return {uid:u.uid,email:u.email,name:u.displayName||"",
            username:(extra&&extra.username)||_fbUsername||"",verified:!!u.emailVerified};
  },
  async signUp({email,password,name,username}){
    const fb=await this._init();
    /* Create the account, then claim the username, and delete the account again
       if the claim loses a race. Firestore's create() fails when the document
       already exists, which is what makes the claim atomic without a server of
       our own — but the claim needs an authenticated uid to write, so it cannot
       come first. The rollback is what keeps a lost race from stranding a
       nameless account. */
    const cred=await fb.auth().createUserWithEmailAndPassword(email,password)
      .catch(e=>{throw authError(e.code==="auth/email-already-in-use"?"email-in-use":"signup-failed");});
    try{
      await fb.firestore().collection("usernames").doc(username).set({uid:cred.user.uid});
    }catch(e){
      await cred.user.delete().catch(()=>{});    // roll back rather than strand a nameless account
      throw authError("username-taken");
    }
    await cred.user.updateProfile({displayName:name});
    await fb.firestore().collection("users").doc(cred.user.uid)
      .set({name,username,email:cred.user.email,created:Date.now()},{merge:true});
    _fbUsername=username;
    await this.sendVerification();
    return this._shape(cred.user,{username});
  },
  async signIn({email,password}){
    const fb=await this._init();
    const cred=await fb.auth().signInWithEmailAndPassword(email,password)
      .catch(()=>{throw authError("bad-credentials");});   // one message for every failure
    const snap=await fb.firestore().collection("users").doc(cred.user.uid).get().catch(()=>null);
    _fbUsername=(snap&&snap.exists&&snap.data().username)||"";
    return this._shape(cred.user);
  },
  async signOut(){const fb=await this._init();_fbUsername="";await fb.auth().signOut();},
  current(){try{return this._shape(firebase.auth().currentUser);}catch(e){return null;}},
  async reload(){
    const fb=await this._init();
    const u=fb.auth().currentUser;if(!u)return null;
    await u.reload();
    return this._shape(fb.auth().currentUser);
  },
  async sendVerification(){
    const fb=await this._init();const u=fb.auth().currentUser;
    if(u)await u.sendEmailVerification();
  },
  async resetPassword(email){
    const fb=await this._init();
    await fb.auth().sendPasswordResetEmail(email).catch(()=>{});   // never reveal whether it existed
  },
  async deleteAccount(){
    /* Apple 5.1.1(v) requires deletion in-app, and requires the DATA to go, not
       just the login. deleteUser does not cascade, so the documents must go
       first — while still authenticated — or they are orphaned forever. */
    const fb=await this._init();
    const u=fb.auth().currentUser;if(!u)return;
    const db=fb.firestore();
    const snap=await db.collection("users").doc(u.uid).get().catch(()=>null);
    const uname=snap&&snap.exists?snap.data().username:null;
    if(uname)await db.collection("usernames").doc(uname).delete().catch(()=>{});
    await db.collection("users").doc(u.uid).delete().catch(()=>{});
    await u.delete();
  },
  async pushData(blob){
    const fb=await this._init();const u=fb.auth().currentUser;if(!u)return;
    await fb.firestore().collection("users").doc(u.uid).set({data:blob,syncedAt:Date.now()},{merge:true});
  },
  async pullData(){
    const fb=await this._init();const u=fb.auth().currentUser;if(!u)return null;
    const s=await fb.firestore().collection("users").doc(u.uid).get().catch(()=>null);
    return s&&s.exists?(s.data().data||null):null;
  }
};
let _fbUsername="";
function loadScript(src){
  return new Promise((ok,fail)=>{
    if(document.querySelector(`script[src="${src}"]`))return ok();
    const s=document.createElement("script");
    s.src=src;s.onload=()=>ok();s.onerror=()=>fail(new Error("load failed: "+src));
    document.head.appendChild(s);
  });
}

/* Firebase's six config values are safe in public client code — Google documents
   that API keys "do not need to be treated as secrets"; security rules are what
   protect data. The service-account JSON is the dangerous one and must never
   appear in this folder. */
function authBackend(){
  const c=window.TAKU_FIREBASE;
  const real=c&&c.apiKey&&!/PASTE|YOUR_|xxx/i.test(c.apiKey);
  return real?FirebaseAuth:MockAuth;
}
function authIsMock(){return authBackend().name==="mock";}

/* ------------------------------------------------------------------ migration
   The highest-risk part of the whole feature. Everyone already using taku has
   their entire history in localStorage; an account system that appears one day
   and strands it is not recoverable from their side. So on the first sign-in,
   if there is local data and the account is empty, the local copy wins and is
   uploaded. We never delete the local copy. */
const SYNC_KEYS=["want","watched","seen","affinity","trash","passed","profile","deckGenres","browseFilters","swipePrefs","tz"];
function localBlob(){
  const b={};SYNC_KEYS.forEach(k=>{const v=store.get(k,null);if(v!==null)b[k]=v;});
  return b;
}
function localHasData(){
  return (store.get("want",[]).length+store.get("watched",[]).length+
          store.get("seen",[]).length+store.get("passed",[]).length)>0;
}
function applyBlob(b){
  if(!b)return 0;
  let n=0;
  SYNC_KEYS.forEach(k=>{if(b[k]!==undefined){store.set(k,b[k]);n++;}});
  return n;
}
async function syncOnSignIn(){
  const be=authBackend();
  let cloud=null;
  try{cloud=await be.pullData();}catch(e){console.warn("taku: pull failed",e);}
  const cloudEmpty=!cloud||!((cloud.watched||[]).length||(cloud.want||[]).length||(cloud.seen||[]).length);
  if(localHasData()&&cloudEmpty){
    try{await be.pushData(localBlob());return {action:"uploaded"};}
    catch(e){return {action:"failed"};}
  }
  if(!localHasData()&&!cloudEmpty){
    const n=applyBlob(cloud);
    return {action:"downloaded",keys:n};
  }
  return {action:"none"};      // both sides have data — never silently clobber either
}

/* ============================================================ gate UI ====== */
let _agMode="signup", _agBusy=false;
const _agShow=(el,on)=>{if(el)el.hidden=!on;};
function _agErr(id,msg){const e=$(id);if(e){e.textContent=msg||"";e.classList.toggle("on",!!msg);}}
function _agClearErrs(){["#agNameErr","#agUserErr","#agAgeErr","#agEmailErr","#agPassErr"].forEach(i=>_agErr(i,""));}

function _agSyncMode(){
  document.querySelectorAll("#agTabs .seg").forEach(b=>b.classList.toggle("on",b.dataset.ag===_agMode));
  document.querySelectorAll("#authGate [data-only]").forEach(el=>{
    el.hidden = el.dataset.only!==_agMode;
  });
  const go=$("#agGo");
  if(go)go.innerHTML=(_agMode==="signup"?"Create account":"Log in")+`<span class="icw">${icSvg("arrowR")}</span>`;
  const pw=$("#agPass");
  if(pw)pw.autocomplete=_agMode==="signup"?"new-password":"current-password";
  const tag=$("#agTag");
  if(tag)tag.textContent=_agMode==="signup"
    ? "Make an account to keep your tiers safe."
    : "Welcome back.";
  _agClearErrs();
}
function _agPwBar(){
  const s=pwStrength($("#agPass").value);
  document.querySelectorAll("#authGate .pwbar i").forEach((b,i)=>{
    b.className=i<s?["","weak","ok","good","strong"][s]:"";
  });
}
function openAuthGate(){
  const g=$("#authGate");if(!g)return;
  _agSyncMode();
  showOverlay(g);
  const note=$("#agNote");
  if(note&&authIsMock())note.innerHTML="<b>Test mode.</b> No account server is connected, so nothing leaves this device and no real email is sent. Paste a Firebase config into auth-config.js to go live.";
}
function _agFieldVals(){
  return {name:($("#agName").value||"").trim().slice(0,20),
          username:($("#agUser").value||"").trim().toLowerCase(),
          age:parseInt($("#agAge").value,10),
          email:($("#agEmail").value||"").trim(),
          password:$("#agPass").value||""};
}
function _agValidate(v){
  let ok=true;
  _agClearErrs();
  const ep=emailProblem(v.email);    if(ep){_agErr("#agEmailErr",ep);ok=false;}
  const pp=pwProblem(v.password);    if(pp){_agErr("#agPassErr",pp);ok=false;}
  if(_agMode==="signup"){
    if(!v.name){_agErr("#agNameErr","What should we call you?");ok=false;}
    const up=usernameProblem(v.username); if(up){_agErr("#agUserErr",up);ok=false;}
    if(!Number.isFinite(v.age)||v.age<5||v.age>120){_agErr("#agAgeErr","Enter your age.");ok=false;}
  }
  return ok;
}
async function _agSubmit(e){
  if(e)e.preventDefault();
  if(_agBusy)return;
  const v=_agFieldVals();
  if(!_agValidate(v))return;
  const go=$("#agGo");
  _agBusy=true;go.disabled=true;go.textContent=_agMode==="signup"?"Creating…":"Signing in…";
  try{
    const be=authBackend();
    const user=_agMode==="signup"
      ? await be.signUp({email:v.email,password:v.password,name:v.name,username:v.username})
      : await be.signIn({email:v.email,password:v.password});
    /* The password variable dies with this scope. Nothing else in the app ever
       sees it, and the input is cleared so it isn't sitting in the DOM either. */
    $("#agPass").value="";
    if(_agMode==="signup"){
      profile.name=v.name;profile.handle=v.username;profile.age=v.age;
      if(!profile.created)profile.created=Date.now();
      if(!canAdult())store.set("searchAdult",false);
      store.set("profile",profile);
      $("#miniAv").textContent=profile.avatar||"🍥";
    }
    await afterAuth(user);
  }catch(err){
    const map={"email-in-use":"That email already has an account — log in instead.",
               "username-taken":"That username is taken.",
               "bad-credentials":"Login failed — check your email and password.",
               "signup-failed":"Couldn't create the account. Try again in a moment."};
    const msg=map[err&&err.code]||"Something went wrong. Try again.";
    _agErr(err&&err.code==="username-taken"?"#agUserErr":"#agPassErr",msg);
  }finally{
    _agBusy=false;go.disabled=false;_agSyncMode();
  }
}
/* Verified users land in the app; unverified ones get the inbox screen.
   Both are client-side conveniences — the server-side gate is in firestore.rules. */
async function afterAuth(user){
  if(!user)return;
  if(!user.verified){
    hideOverlay($("#authGate"));
    const av=$("#avEmail");if(av)av.textContent=user.email;
    showOverlay($("#authVerify"));
    const n=$("#avNote");
    if(n&&authIsMock())n.innerHTML="<b>Test mode.</b> No mail was sent — this will confirm itself in about 4 seconds, then tap the button.";
    return;
  }
  hideOverlay($("#authGate"));hideOverlay($("#authVerify"));
  const r=await syncOnSignIn();
  if(r.action==="uploaded")toast("Your list is backed up to your account");
  else if(r.action==="downloaded"){toast("Restored your list");renderDeck();refreshCounts();}
  else toast("Signed in");
  store.set("authDone",true);
  if(!store.get("onboarded",false)){store.set("onboarded",true);renderDeck();}
}
function initAuth(){
  if(!$("#authGate"))return;
  document.querySelectorAll("#agTabs .seg").forEach(b=>b.onclick=()=>{_agMode=b.dataset.ag;_agSyncMode();buzz(6);});
  const form=$("#agForm");if(form)form.onsubmit=_agSubmit;
  const pw=$("#agPass");if(pw)pw.addEventListener("input",_agPwBar);
  const eye=$("#agPassEye");
  if(eye)eye.onclick=()=>{const p=$("#agPass");const show=p.type==="password";
    p.type=show?"text":"password";eye.classList.toggle("on",show);
    eye.setAttribute("aria-label",show?"Hide password":"Show password");};
  const skip=$("#agSkip");
  if(skip)skip.onclick=()=>{hideOverlay($("#authGate"));store.set("authSkipped",true);
    if(!store.get("onboarded",false))initOnboard();};
  const forgot=$("#agForgot");
  if(forgot)forgot.onclick=async()=>{
    const v=_agFieldVals();
    if(emailProblem(v.email)){_agErr("#agEmailErr","Enter your email first.");return;}
    await authBackend().resetPassword(v.email);
    // deliberately identical whether or not that address has an account
    toast("If that email has an account, a reset link is on its way");
  };
  const chk=$("#avCheck");
  if(chk)chk.onclick=async()=>{
    chk.disabled=true;chk.textContent="Checking…";
    const u=await authBackend().reload().catch(()=>null);
    chk.disabled=false;chk.textContent="I've confirmed it";
    if(u&&u.verified)await afterAuth(u);
    else toast("Not confirmed yet — tap the link in the email");
  };
  const rs=$("#avResend");
  if(rs)rs.onclick=async()=>{rs.disabled=true;await authBackend().sendVerification().catch(()=>{});
    toast("Sent again");setTimeout(()=>{rs.disabled=false;},30000);};   // the provider rate-limits too
  const out=$("#avOut");
  if(out)out.onclick=async()=>{await authBackend().signOut().catch(()=>{});
    hideOverlay($("#authVerify"));openAuthGate();};
}
/* Boot hook. Returns true when it has taken over the screen, so the normal
   onboarding stays out of the way. */
function authBoot(){
  if(!authEnabled())return false;
  initAuth();
  const u=authBackend().current();
  if(u&&u.verified)return false;
  if(u&&!u.verified){afterAuth(u);return true;}
  if(store.get("authSkipped",false))return false;
  openAuthGate();
  return true;
}

/* ============================================ preview switch + account admin */
function renderAuthZone(){
  const st=$("#authState"),act=$("#authActions"),hint=$("#authHint");
  if(!st)return;
  const on=authEnabled(), u=on?authBackend().current():null;
  st.textContent = !on ? "preview · off" : (u?(u.verified?"signed in":"unconfirmed"):"signed out");
  hint.innerHTML = !on
    ? "Email + password accounts with a confirmation email. Built and testable, not launched — turning this on only affects this device."
    : (authIsMock()
       ? "<b>Test mode.</b> No account server is connected: nothing leaves this device and no real email is sent. Paste a Firebase config into <b>auth-config.js</b> to go live."
       : "Live. Your password is handled by Firebase and never stored by taku.");
  let html=`<button class="fbtn ghost" id="authToggle">${on?"Turn off":"Turn on"}</button>`;
  if(on&&u)html+=`<button class="fbtn ghost" id="authOut">Sign out</button>`;
  if(on&&!u)html+=`<button class="fbtn" id="authIn">Sign in</button>`;
  act.innerHTML=html;
  /* Apple 5.1.1(v): an app that creates accounts MUST let you delete one from
     inside the app. Not a support email, not a deactivation. */
  if(on&&u){
    act.insertAdjacentHTML("afterend",
      `<div class="frow-actions" id="authDangerRow"><button class="fbtn danger" id="authDelete">Delete my account</button></div>`);
  }else{const d=$("#authDangerRow");if(d)d.remove();}
}
document.addEventListener("click",async e=>{
  if(!e.target.closest)return;
  if(e.target.closest("#authToggle")){
    const on=!authEnabled();store.set(AUTH_FLAG,on);
    if(!on)store.set("authSkipped",false);
    buzz(8);renderAuthZone();
    toast(on?"Accounts on for this device":"Accounts off");
    if(on){initAuth();openAuthGate();}
    return;
  }
  if(e.target.closest("#authIn")){initAuth();openAuthGate();return;}
  if(e.target.closest("#authOut")){
    await authBackend().signOut().catch(()=>{});
    store.set("authSkipped",false);renderAuthZone();toast("Signed out");return;
  }
  if(e.target.closest("#authDelete")){
    /* Deliberately a two-step confirm: this is irreversible and takes the cloud
       copy with it. The local copy is left alone — losing both to one tap would
       be indefensible. */
    if(!confirm("Delete your account?\n\nThis removes your account and everything synced to it. It cannot be undone.\n\nThe list on this device stays put."))return;
    try{
      await authBackend().deleteAccount();
      store.set("authSkipped",true);
      renderAuthZone();toast("Account deleted");
    }catch(err){toast("Couldn't delete — sign in again, then retry");}
    return;
  }
});
