/* =====================================================
   AI Medical Hub - script.js (final merged & cleaned)
   - Combines body-map hotspots, symptom wizard, quick-scan,
     predictions, triage flow, booking, chat, admin, analytics
   - No external dependencies required (uses localStorage + jsPDF if loaded)
   ===================================================== */

/* =========================
   Utilities & state
   ========================= */
const ESC_KEY = 27;
const ENTER_KEY = 13;
function escapeHtml(str) { if (!str) return ''; return String(str).replace(/[&<>",'\/`=]/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'})[s]); }
function isoNow(){ return new Date().toLocaleString(); }

// Year stamp
document.addEventListener('DOMContentLoaded', ()=>{ const y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear(); });

/* =========================
   Local storage keys & constants
   ========================= */
const APPT_KEY = 'ai_medical_appointments_v2';
const CHECKS_KEY = 'ai_medical_checks_v1';
const DOCTORS_KEY = 'ai_medical_doctors';

/* =========================
   Built-in doctors (seed)
   ========================= */
const DOCTORS = [
  {id:'aarti',name:'Dr. Aarti Anand',role:'General Physician',exp:12,avatar:'AA', available:true, rating:4.7, bio:'MBBS, MD (General Medicine). Experience: primary care, chronic disease management.' , slots: ['09:00','10:00','14:00','16:00']},
  {id:'rohan',name:'Dr. Rohan Kapoor',role:'Pulmonologist',exp:9,avatar:'RK', available:true, rating:4.6, bio:'Pulmonology specialist — asthma, COPD, respiratory infections.', slots:['11:00','13:00','15:00']},
  {id:'suman',name:'Dr. Suman Mishra',role:'Pediatrician',exp:7,avatar:'SM', available:false, rating:4.5, bio:'Paediatric care, immunization, growth monitoring.', slots:['10:00','12:00']},
  {id:'neha',name:'Dr. Neha Verma',role:'Psychiatrist',exp:8,avatar:'NV', available:true, rating:4.8, bio:'Mental health care: depression, anxiety, CBT-informed therapy.', slots:['09:30','11:30','14:30']},
  {id:'vikas',name:'Dr. Vikas Rao',role:'Cardiologist',exp:15,avatar:'VR', available:true, rating:4.9, bio:'Cardiology: hypertension, chest pain, preventive cardiology.', slots:['10:30','13:30','16:30']},
  {id:'maya',name:'Dr. Maya Sen',role:'Dermatologist',exp:6,avatar:'MS', available:false, rating:4.4, bio:'Skin disorders: rashes, acne, eczema.', slots:['15:00']},
  {id:'arjun',name:'Dr. Arjun Mehta',role:'Neurologist',exp:11,avatar:'AM', available:true, rating:4.8, bio:'Neurology expert — migraine, seizures, neuropathy, stroke evaluation.', slots:['09:00','11:00','15:00']},
  {id:'priya',name:'Dr. Priya Nair',role:'Gynecologist',exp:10,avatar:'PN', available:true, rating:4.7, bio:'Women\'s health specialist — PCOS, pregnancy care, menstrual disorders.', slots:['10:00','12:00','14:00']},
  {id:'imran',name:'Dr. Imran Sheikh',role:'Orthopedic Surgeon',exp:14,avatar:'IS', available:true, rating:4.9, bio:'Orthopedics — fractures, back pain, arthritis, joint pain specialist.', slots:['09:30','13:00','16:00']},
  {id:'anita',name:'Dr. Anita Bose',role:'ENT Specialist',exp:8,avatar:'AB', available:true, rating:4.5, bio:'ENT specialist — ear infections, sinusitis, hearing issues.', slots:['11:00','14:00']},
  {id:'rahul',name:'Dr. Rahul Sen',role:'Endocrinologist',exp:13,avatar:'RS', available:true, rating:4.8, bio:'Hormone and metabolism expert — diabetes, thyroid disorders.', slots:['10:00','12:30','15:30']},
  {id:'kavita',name:'Dr. Kavita Jain',role:'Ophthalmologist',exp:9,avatar:'KJ', available:true, rating:4.6, bio:'Eye specialist — vision check, cataract evaluation, infections.', slots:['09:30','11:30','14:00']},
  {id:'sunita',name:'Dr. Sunita Roy',role:'Gastroenterologist',exp:15,avatar:'SR', available:true, rating:4.9, bio:'Digestive system specialist — acidity, IBS, liver & stomach issues.', slots:['09:00','12:00','16:00']},
  {id:'harsh',name:'Dr. Harsh Malhotra',role:'Urologist',exp:10,avatar:'HM', available:true, rating:4.6, bio:'Urology — urinary infections, prostate care, kidney stone management.', slots:['10:30','13:30','15:00']},
  {id:'meera',name:'Dr. Meera Sharma',role:'Dermatologist',exp:7,avatar:'MS', available:true, rating:4.5, bio:'Skincare expert — acne, pigmentation, allergies, cosmetic dermatology.', slots:['11:00','13:00','15:00']}
];

/* =========================
   Hotspots (body map)
   ========================= */
const HOTSPOTS = {
  male: [
    { x: 50, y: 18, label: "Head" },
    { x: 50, y: 32, label: "Chest" },
    { x: 50, y: 47, label: "Stomach" },
    { x: 50, y: 64, label: "Pelvis" },
    { x: 36, y: 40, label: "Left Rib" },
    { x: 64, y: 40, label: "Right Rib" },
    { x: 28, y: 60, label: "Left Hip" },
    { x: 72, y: 60, label: "Right Hip" }
  ],
  female: [
    { x: 50, y: 18, label: "Head" },
    { x: 50, y: 33, label: "Chest" },
    { x: 50, y: 51, label: "Abdomen" },
    { x: 50, y: 68, label: "Pelvis" }
  ]
};

function renderHotspots(gender){
  try{
    const panel = document.getElementById(gender + 'Map');
    if(!panel) return;
    const wrap = panel.querySelector('.bodymap-image-wrap');
    if(!wrap) return;

    wrap.innerHTML = `<img src="./assets/body-${gender}.png" class="bodymap-image" alt="body map">`;

    HOTSPOTS[gender].forEach(h=>{
      const spot = document.createElement('div');
      spot.className = 'hotspot';
      spot.style.left = h.x + '%';
      spot.style.top = h.y + '%';
      spot.dataset.label = h.label;
      spot.title = h.label;
      spot.onclick = ()=> bodySelect(h.label);
      wrap.appendChild(spot);
    });
  }catch(e){ console.warn('renderHotspots', e); }
}

// If there are dedicated maleMap/femaleMap containers, render into them
if(typeof document !== 'undefined'){
  document.addEventListener('DOMContentLoaded', ()=>{
    try{ renderHotspots('male'); renderHotspots('female'); }catch(e){}
  });
}

function showGender(g){
  const maleMap = document.getElementById('maleMap');
  const femaleMap = document.getElementById('femaleMap');
  if(maleMap) maleMap.classList.toggle('active', g==='male');
  if(femaleMap) femaleMap.classList.toggle('active', g==='female');
  const maleBtn = document.getElementById('maleBtn');
  const femaleBtn = document.getElementById('femaleBtn');
  if(maleBtn) maleBtn.classList.toggle('active', g==='male');
  if(femaleBtn) femaleBtn.classList.toggle('active', g==='female');
}

/* =========================
   Suggestion map & Red flags
   ========================= */
const suggestionMap = [
  {keywords:['fever','temperature'],'suggest':'How high is the fever? Any chills or sweating?'},
  {keywords:['cough'],'suggest':'Is the cough dry or productive (with phlegm)? Any blood in sputum?'},
  {keywords:['shortness','breath','breathing'],'suggest':'Do you experience it at rest or with exertion? Any chest pain?'},
  {keywords:['diarrhea','vomit','nausea'],'suggest':'Any blood in stools? Frequency? Any recent travel or food changes?'},
  {keywords:['headache','migraine'],'suggest':'Onset, location, severity, and any vision changes?'},
  {keywords:['rash','itch'],'suggest':'Where is the rash? Any blisters or spreading?'}
];
function getSuggestions(text){ if(!text) return []; const t=text.toLowerCase(); const out=[]; suggestionMap.forEach(s=>{ s.keywords.forEach(k=>{ if(t.includes(k) && !out.includes(s.suggest)) out.push(s.suggest); }); }); return out; }

const RED_FLAGS = ['\\bchest pain\\b','\\bdifficulty breathing\\b','\\bnot breathing\\b','\\bsevere bleeding\\b','\\bunconscious\\b','\\bsudden weakness\\b','\\bslurred speech\\b','\\bbluish\\b',"\\bcouldn'?t breathe\\b","\\bsuicid(al|e)\\b","\\btrying to end my life\\b","\\bfainting\\b"];
const RED_FLAG_RE = new RegExp(RED_FLAGS.join('|'), 'i');
function containsRedFlag(text){ if(!text) return false; return RED_FLAG_RE.test(text.toLowerCase()); }

/* =========================
   Quick predictions (rule-based)
   ========================= */
function predictConditions(text){
  const t=(text||'').toLowerCase(); const preds=[]; if(!t) return preds;
  if(t.includes('fever') && t.includes('cough')) preds.push({label:'Respiratory infection', confidence:0.6});
  if(t.includes('fever') && t.includes('rash')) preds.push({label:'Viral exanthem', confidence:0.55});
  if(t.includes('chest') || t.includes('tight') || t.includes('chest pain')) preds.push({label:'Cardiac or respiratory — escalate', confidence:0.75});
  if(t.includes('stomach') || t.includes('abdomen') || t.includes('vomit')) preds.push({label:'Gastroenteritis', confidence:0.5});
  if(t.includes('headache') || t.includes('migraine')) preds.push({label:'Primary headache', confidence:0.45});
  if(t.includes('rash') || t.includes('itch')) preds.push({label:'Dermatologic issue', confidence:0.5});
  if(t.includes('shortness') || t.includes('breath')) preds.push({label:'Dyspnea — consider urgent review', confidence:0.7});
  return preds.slice(0,3);
}
function renderQuickPredictions(text){
  const container = document.getElementById('quickPredictions'); if(!container) return;
  container.innerHTML = '';
  const preds = predictConditions(text);
  if(!preds.length){ container.innerHTML = `<div class="feature" style="min-width:180px">No quick predictions. Try adding more details.</div>`; return; }
  preds.forEach(p=>{ const el = document.createElement('div'); el.className='feature'; el.style.minWidth='180px'; el.innerHTML = `<div style="font-weight:800">${escapeHtml(p.label)}</div><div class="small muted" style="margin-top:6px">Confidence: ${(p.confidence*100).toFixed(0)}%</div>`; container.appendChild(el); });
}

/* =========================
   Quick check flow
   ========================= */
async function quickCheck(){
  const text=(document.getElementById('quickInput')?.value||'').trim();
  const out=document.getElementById('quickResult'); const sug=document.getElementById('suggestions');
  if(out) out.textContent=''; if(sug) sug.textContent='';
  if(!text){ if(out) out.textContent='Please enter some symptoms.'; return; }
  if(containsRedFlag(text)){ if(out) out.innerHTML='⚠️ <strong>Red-flag detected.</strong> Call emergency services immediately or click "Call Now".'; showEmergencyModal('Red-flag symptom detected: please call emergency services now.'); return; }
  const suggestions = getSuggestions(text);
  if(suggestions.length && sug) sug.innerHTML = '<strong>Try answering:</strong> <ul style="margin-top:6px">' + suggestions.map(s=>`<li>${escapeHtml(s)}</li>`).join('') + '</ul>';
  const symptomsText = document.getElementById('symptomsText'); if(symptomsText) symptomsText.value = text;
  if(out) out.textContent='No immediate red-flag detected. Prefilled Symptom Checker.';
  renderQuickPredictions(text);
  document.querySelector('#symptoms')?.scrollIntoView({behavior:'smooth'});
  recordCheck({ text, timestamp: new Date().toISOString(), source:'quick' });
  // optional backend suggestion call (best-effort)
  try{ const res = await fetch('/api/suggest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})}); if(res.ok){ const data=await res.json(); if(data.suggestions && data.suggestions.length && sug) sug.innerHTML += '<div style="margin-top:8px" class="muted"><strong>AI suggestions:</strong><div>'+escapeHtml((data.suggestions||[]).join(' • '))+'</div></div>'; } }catch(e){}
}

/* =========================
   Voice support
   ========================= */
function startVoiceQuick(){ startVoice({targetId:'quickInput', autoAnalyze:true}); }
function startVoice(opts = { targetId: 'symptomsText', autoAnalyze:false }){
  const targetId = opts.targetId || 'symptomsText';
  const autoAnalyze = !!opts.autoAnalyze;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { alert("Your browser doesn't support speech recognition. Try Chrome on desktop or Android."); return; }
  const recog = new SpeechRecognition();
  recog.lang = "en-IN"; recog.interimResults = false; recog.maxAlternatives = 1;
  const targetInput = document.getElementById(targetId);
  const origPlaceholder = targetInput ? targetInput.placeholder : '';
  if(targetInput) { targetInput.placeholder = 'Listening... speak now'; targetInput.focus(); }
  recog.start();
  recog.onresult = function(e) {
    const text = e.results[0][0].transcript;
    if(targetInput) targetInput.value = text;
    if(autoAnalyze && targetId === 'quickInput') quickCheck();
    if(autoAnalyze && targetId === 'symptomsText') { document.getElementById('quickResult').textContent = 'Captured voice input. Continue the checker.'; }
  };
  recog.onerror = function(ev) { console.warn('Speech error', ev); alert("Voice recognition error. Try again or use text input."); };
  recog.onend = function(){ if(targetInput) targetInput.placeholder = origPlaceholder; };
}

/* =========================
   Body SVG (fallback) + hotspots injection (alternative)
   ========================= */
function defaultMaleSVG(){ return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="720" viewBox="0 0 360 720"><rect width="100%" height="100%" fill="rgba(0,0,0,0)"/><g fill="#0b2433"><rect x="140" y="40" width="80" height="80" rx="18" fill="#cfefff"/><rect x="120" y="120" width="120" height="220" rx="30" fill="#eaf6ff"/><rect x="90" y="350" width="180" height="300" rx="50" fill="#dff4ff"/></g></svg>`; }
function defaultFemaleSVG(){ return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="720" viewBox="0 0 360 720"><rect width="100%" height="100%" fill="rgba(0,0,0,0)"/><g fill="#0b2433"><circle cx="180" cy="80" r="38" fill="#cfefff"/><rect x="125" y="120" width="110" height="220" rx="40" fill="#eaf6ff"/><rect x="95" y="350" width="170" height="300" rx="48" fill="#dff4ff"/></g></svg>`; }

function injectHotspots(){
  const bodyImg = document.getElementById('bodyImg'); if(!bodyImg) return;
  const container = bodyImg.parentElement; if(!container) return;
  Array.from(container.querySelectorAll('.hotspot')).forEach(h=>h.remove());
  const hotspotData = [
    {x:'52%', y:'14%', label:'Head', value:'Headache / Head pain'},
    {x:'52%', y:'34%', label:'Chest', value:'Chest pain or tightness'},
    {x:'50%', y:'50%', label:'Abdomen', value:'Abdominal pain'},
    {x:'38%', y:'68%', label:'Left leg', value:'Left leg pain'},
    {x:'64%', y:'68%', label:'Right leg', value:'Right leg pain'}
  ];
  hotspotData.forEach(h=>{
    const el = document.createElement('button'); el.className='hotspot pulse'; el.style.left=h.x; el.style.top=h.y; el.setAttribute('aria-label', h.label); el.title = h.label; el.textContent=''; el.addEventListener('click', ()=>{ el.classList.add('clicked'); setTimeout(()=>el.classList.remove('clicked'),500); bodySelect(h.value); }); container.appendChild(el);
  });
}

// Initialize fallback inline bodies if bodyImg exists
if(typeof document !== 'undefined'){
  document.addEventListener('DOMContentLoaded', ()=>{
    const bodyImg = document.getElementById('bodyImg');
    if(bodyImg){ bodyImg.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(defaultMaleSVG()); injectHotspots(); }
  });
}

function bodySelect(text){ const el = document.getElementById('symptomsText'); if(el) el.value = text; const sug=document.getElementById('suggestions'); if(sug) sug.innerHTML = '<strong>Selected:</strong> ' + escapeHtml(text) + '<div class="small" style="margin-top:6px">Tap Next to continue or press Chat to discuss.</div>'; document.querySelector('#symptoms')?.scrollIntoView({behavior:'smooth'}); }

/* =========================
   Wizard & Steps
   ========================= */
let currentStep = 1;
function showStep(step){ currentStep=step; document.querySelectorAll('.step').forEach(s=>s.classList.toggle('active-step', Number(s.dataset.step)===step)); document.querySelectorAll('.step-panel').forEach(p=>p.style.display='none'); const panel = document.querySelector('.step-panel[data-panel="'+step+'"]'); if(panel) panel.style.display='block'; const focusable = panel && panel.querySelector('input,select,textarea,button'); if(focusable) focusable.focus(); }
function nextStep(){ showStep(Math.min(currentStep+1,4)); }
function prevStep(){ showStep(Math.max(currentStep-1,1)); }
if(typeof document !== 'undefined'){
  document.addEventListener('DOMContentLoaded', ()=>{
    showStep(1);
    document.querySelectorAll('.step').forEach(s=>{ s.addEventListener('click', ()=> showStep(Number(s.dataset.step))); s.addEventListener('keydown', (e)=>{ if(e.keyCode===ENTER_KEY) showStep(Number(s.dataset.step)); }); });
  });
}
function updateSeverityPreview(){ const sev=document.getElementById('severity')?.value; const el=document.getElementById('severityPreview'); if(!el) return; el.className='sev-badge'; if(sev==='mild'){ el.classList.add('sev-mild'); el.textContent='Mild'; } else if(sev==='moderate'){ el.classList.add('sev-moderate'); el.textContent='Moderate'; } else { el.classList.add('sev-severe'); el.textContent='Severe'; } }

/* =========================
   Triage flow (calls backend / fallback)
   ========================= */
let triageInProgress=false;
async function runTriage(){ if(triageInProgress) return; triageInProgress=true; const btn=document.getElementById('getRec'); if(btn){ btn.disabled=true; btn.innerHTML='Working ⏳'; }
  const text=(document.getElementById('symptomsText')?.value||'').trim(); const duration=document.getElementById('duration')?.value||''; const severity=document.getElementById('severity')?.value||'mild'; const age=(document.getElementById('age')?.value||'').trim(); const review=document.getElementById('reviewBox'); if(review){ review.innerHTML=`<div class="muted small">Symptoms:</div><div style="margin-top:6px">${escapeHtml(text||'<none provided>')}</div><div class="muted small" style="margin-top:8px">Duration: ${escapeHtml(duration)}</div><div class="muted small">Severity: ${escapeHtml(severity)}</div>`; }
  if(containsRedFlag(text)){ triageInProgress=false; if(btn){ btn.disabled=false; btn.innerHTML='Get Recommendation'; } showEmergencyModal('Red-flag symptom detected during review. Please call emergency services immediately.'); return; }
  try{
    const payload = { text, age: age || null, extra:{ duration, severity } };
    const res = await fetch('/api/chat',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    if(!res.ok) throw new Error('no-backend');
    const data = await res.json(); presentTriageResult(data); recordCheck({ text, timestamp:new Date().toISOString(), triage: data.triage || 'UNKNOWN', severity, source:'api' });
  }catch(e){
    // fallback conservative
    let actions = [];
    if(severity==='severe') actions=['Seek urgent care','Call emergency if worsens'];
    else if(severity==='moderate') actions=['Book a GP visit','Monitor symptoms','Use analgesics / hydration if appropriate'];
    else actions=['Self-care measures','Rest and hydrate'];
    const mock = { triage: severity==='severe'?'URGENT':(severity==='moderate'?'SEE_GP':'SELF_CARE'), reason:'Client-side conservative recommendation (fallback).', actions, confidence:0.6, source:'client-mock', timestamp: isoNow() };
    presentTriageResult(mock);
    recordCheck({ text, timestamp:new Date().toISOString(), triage: mock.triage, severity, source:'fallback' });
  } finally { triageInProgress=false; if(btn){ btn.disabled=false; btn.innerHTML='Get Recommendation'; } }
}

function presentTriageResult(res){ const box=document.createElement('div'); box.className='card'; let html=`<h4>Recommendation: ${escapeHtml(res.triage||'UNABLE_TO_DETERMINE')}</h4>`; html+=`<div class="muted small" style="margin-top:6px">${escapeHtml(res.reason||'')}</div>`; if(res.actions && res.actions.length){ html+='<ul style="margin-top:8px">'; res.actions.forEach(a=> html+=`<li>${escapeHtml(a)}</li>`); html+='</ul>'; } html+=`<div style="margin-top:10px;display:flex;gap:8px"><button class="btn btn-primary" onclick="openChat()">Discuss with assistant</button><button class="btn btn-ghost" onclick="openBooking()">Request clinician review</button><button class="btn btn-ghost" onclick="downloadTriagePDF()">Download PDF</button></div>`; html+=`<div class="timestamp" style="margin-top:8px">${escapeHtml(res.timestamp||new Date().toLocaleString())}</div>`; const reviewSlot=document.querySelector('.step-panel[data-panel="4"] #reviewBox'); if(reviewSlot){ reviewSlot.innerHTML=''; reviewSlot.appendChild(box); box.innerHTML=html; box.scrollIntoView({behavior:'smooth'}); } updateAnalyticsDisplay(res); }

/* =========================
   Appointments / Booking
   ========================= */
function openDoctorModal(docId){ const d = DOCTORS.find(x=>x.id===docId); if(!d) return; const modalRoot=document.getElementById('modalRoot'); modalRoot.style.display='block'; modalRoot.innerHTML = `
  <div class="modal-backdrop" onclick="closeModal(event)">
    <div class="modal" role="dialog" aria-modal="true" aria-label="Doctor profile" onclick="event.stopPropagation()">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:900;font-size:18px">${escapeHtml(d.name)}</div>
          <div class="small muted-2">${escapeHtml(d.role)} • ${escapeHtml(d.exp+' yrs')}</div>
          <div class="small" style="margin-top:6px">Rating: ${d.rating} ★</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <div class="doc-avatar" style="width:56px;height:56px">${escapeHtml(d.avatar)}</div>
          <div><button class="btn btn-primary" onclick="openBooking('${d.id}')">Book</button></div>
        </div>
      </div>

      <div style="margin-top:12px" class="muted small">${escapeHtml(d.bio)}</div>

      <div style="margin-top:12px">
        <div style="font-weight:800">Available times</div>
        <div class="small muted" style="margin-top:6px">${d.slots.join(' • ')}</div>
      </div>

      <div style="margin-top:12px;display:flex;justify-content:flex-end;gap:8px">
        <button class="btn btn-ghost" onclick="closeModal()">Close</button>
      </div>
    </div>
  </div>
`;
  document.addEventListener('keydown', escCloseModal);
}

function openBooking(doctorId='general'){ const doc = DOCTORS.find(x=>x.id===doctorId) || {id:'general', name: doctorId==='general' ? 'General clinician' : doctorId, slots:['09:00','10:00','14:00']}; const modalRoot=document.getElementById('modalRoot'); modalRoot.style.display='block'; modalRoot.innerHTML=`
  <div class="modal-backdrop" onclick="closeModal(event)">
    <div class="modal" role="dialog" aria-modal="true" aria-label="Appointment request" onclick="event.stopPropagation()">
      <h3>Request Appointment</h3>
      <div style="margin-top:8px" class="muted">Doctor: ${escapeHtml(doc.name)}</div>
      <div style="margin-top:12px">
        <label class="muted small">Your name</label>
        <input id="bookName" type="text" placeholder="Full name" />
      </div>
      <div style="margin-top:8px">
        <label class="muted small">Phone or email</label>
        <input id="bookContact" type="text" placeholder="Phone / Email" />
      </div>
      <div style="margin-top:8px">
        <label class="muted small">Choose a time slot</label>
        <div id="slotContainer" style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap"></div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="submitBookingBtn">Request</button>
      </div>
    </div>
  </div>
`;
  const slotContainer = modalRoot.querySelector('#slotContainer'); doc.slots.forEach(s=>{ const b=document.createElement('button'); b.className='btn btn-ghost'; b.textContent=s; b.onclick=()=>{ slotContainer.querySelectorAll('button').forEach(x=>x.classList.remove('selected-slot')); b.classList.add('selected-slot'); }; slotContainer.appendChild(b); });
  document.getElementById('submitBookingBtn').addEventListener('click', ()=> submitBooking(doc)); document.addEventListener('keydown', escCloseModal);
}

function escCloseModal(e){ if(e.keyCode===ESC_KEY) closeModal(); }
function closeModal(e){ const root=document.getElementById('modalRoot'); if(root){ root.style.display='none'; root.innerHTML=''; } document.removeEventListener('keydown', escCloseModal); }

function submitBooking(doc){ const name=(document.getElementById('bookName')?.value||'').trim(); const contact=(document.getElementById('bookContact')?.value||'').trim(); const slot = Array.from(document.querySelectorAll('#slotContainer button.selected-slot'))[0]?.textContent || ''; if(!name||!contact){ alert('Please provide your name and contact.'); return; } const appt = { id: Date.now(), doctor: doc.name, doctorId: doc.id||'general', name, contact, time: slot || 'Not specified', created: new Date().toLocaleString() }; const arr = JSON.parse(localStorage.getItem(APPT_KEY)||'[]'); arr.unshift(appt); localStorage.setItem(APPT_KEY, JSON.stringify(arr)); closeModal(); showAppointmentList(); showBookingReceipt(appt); try{ fetch('/api/appointments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(appt)}); }catch(e){}
}

function showAppointmentList(){ const container=document.getElementById('appointmentListContainer'); const arr=JSON.parse(localStorage.getItem(APPT_KEY)||'[]'); if(!container) return; if(!arr.length){ container.innerHTML = '<div class="muted" style="margin-top:10px">No appointment requests yet.</div>'; return; } let html='<div style="margin-top:12px"><h4>Your Requests</h4><ul>'; arr.forEach(a=>{ html += `<li>${escapeHtml(a.doctor)} — ${escapeHtml(a.name)} (${escapeHtml(a.contact)}) ${a.time?`<span class="muted">[${escapeHtml(a.time)}]</span>`:''} <span class="muted">[${escapeHtml(a.created)}]</span></li>`; }); html += '</ul></div>'; container.innerHTML = html; }
function showBookingReceipt(appt){ const modalRoot=document.getElementById('modalRoot'); modalRoot.style.display='block'; modalRoot.innerHTML=`
  <div class="modal-backdrop" onclick="closeModal(event)">
    <div class="modal" onclick="event.stopPropagation()">
      <h3>✔ Appointment Confirmed</h3>
      <div style="margin-top:12px" class="muted small">Your appointment request has been successfully submitted.</div>
      <div class="card" style="margin-top:12px;padding:14px;font-size:14px">
        <strong>Receipt</strong><br><br>
        <div><b>Booking ID:</b> ${appt.id}</div>
        <div><b>Patient:</b> ${escapeHtml(appt.name)}</div>
        <div><b>Contact:</b> ${escapeHtml(appt.contact)}</div>
        <div><b>Doctor:</b> ${escapeHtml(appt.doctor)}</div>
        <div><b>Preferred Time:</b> ${escapeHtml(appt.time || 'Not provided')}</div>
        <div><b>Date:</b> ${escapeHtml(appt.created)}</div>
      </div>
      <div style="margin-top:14px;display:flex;justify-content:flex-end;gap:8px">
        <button class="btn btn-ghost" onclick="closeModal()">Close</button>
        <button class="btn btn-primary" onclick="downloadReceipt(${appt.id})">Download PDF</button>
      </div>
    </div>
  </div>
`; }

function downloadReceipt(id){ const arr=JSON.parse(localStorage.getItem(APPT_KEY)||'[]'); const appt = arr.find(a=>a.id===id); if(!appt) return alert('Receipt not found'); try{ const { jsPDF } = window.jspdf; const doc = new jsPDF(); doc.set