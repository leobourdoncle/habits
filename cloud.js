/* ============================================================
   cloud.js — Version "entre potes" (Supabase)
   ------------------------------------------------------------
   Couche optionnelle ajoutée à l'app locale :
     - connexion par lien magique (email)
     - publication de ta complétion du jour dans le cloud
     - page "Team" avec classement entre potes (même code de groupe)

   L'app reste 100 % utilisable SANS être connecté (mode perso).
   On s'appuie sur les variables globales de app.js : habits,
   records, TODAY, dateKey().
   ============================================================ */

// Client Supabase (la lib expose window.supabase.createClient)
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let cloudUser    = null;   // session utilisateur (ou null)
let cloudProfile = null;   // { username, group_code } (ou null)

/* ── Helpers complétion du jour ─────────────────────────── */
function todayDone()  { const d = records[TODAY] || {}; return habits.filter(h => d[h.id]).length; }
function todayTotal() { return habits.length; }

/* ── Authentification ───────────────────────────────────── */

// Envoie un lien magique de connexion à l'email donné.
async function cloudSignIn(email) {
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.href.split('#')[0] },
  });
  if (error) throw error;
}

async function cloudSignOut() {
  await sb.auth.signOut();
  cloudUser = null; cloudProfile = null;
  renderTeam();
}

// Récupère (ou crée) le profil de l'utilisateur connecté.
async function loadProfile() {
  if (!cloudUser) return null;
  const { data } = await sb.from('profiles').select('username, group_code').eq('id', cloudUser.id).maybeSingle();
  cloudProfile = data || null;
  return cloudProfile;
}

// Crée/Met à jour le profil (pseudo + code de groupe).
async function saveProfile(username, groupCode) {
  const { error } = await sb.from('profiles').upsert({
    id: cloudUser.id,
    username: username.trim(),
    group_code: (groupCode.trim() || 'public').toLowerCase(),
  });
  if (error) throw error;
  await loadProfile();
  await cloudPushToday();   // publie aussitôt la journée en cours
}

/* ── Publication de la complétion du jour ───────────────── */
async function cloudPushToday() {
  if (!cloudUser || !cloudProfile) return;
  await sb.from('daily').upsert({
    user_id: cloudUser.id,
    day: TODAY,
    done: todayDone(),
    total: todayTotal(),
    updated_at: new Date().toISOString(),
  });
}

/* ── Classement (leaderboard) ───────────────────────────── */

// Série en cours d'un utilisateur (jours consécutifs avec au moins 1 habitude).
function streakFromDaily(byDate) {
  const d = new Date();
  const k = (x) => dateKey(x);
  if (!(byDate[k(d)] && byDate[k(d)].done > 0)) d.setDate(d.getDate() - 1);
  let s = 0;
  while (byDate[k(d)] && byDate[k(d)].done > 0) { s++; d.setDate(d.getDate() - 1); }
  return s;
}

// % de réussite sur les 7 derniers jours suivis.
function rate7FromDaily(byDate) {
  let done = 0, tot = 0;
  const d = new Date();
  for (let i = 0; i < 7; i++) {
    const e = byDate[dateKey(d)];
    if (e) { done += e.done; tot += e.total; }
    d.setDate(d.getDate() - 1);
  }
  return tot ? Math.round((done / tot) * 100) : 0;
}

async function fetchLeaderboard() {
  // 1. les membres de mon groupe
  const { data: members } = await sb.from('profiles')
    .select('id, username').eq('group_code', cloudProfile.group_code);
  if (!members || !members.length) return [];

  // 2. leurs 30 derniers jours
  const since = new Date(); since.setDate(since.getDate() - 30);
  const ids = members.map(m => m.id);
  const { data: rows } = await sb.from('daily')
    .select('user_id, day, done, total').in('user_id', ids).gte('day', dateKey(since));

  // 3. on regroupe par membre puis on calcule série + %
  const board = members.map(m => {
    const byDate = {};
    (rows || []).filter(r => r.user_id === m.id).forEach(r => { byDate[r.day] = r; });
    return {
      name: m.username,
      me: m.id === cloudUser.id,
      streak: streakFromDaily(byDate),
      rate7: rate7FromDaily(byDate),
    };
  });
  board.sort((a, b) => b.streak - a.streak || b.rate7 - a.rate7);
  return board;
}

/* ── Rendu de l'onglet Team ─────────────────────────────── */

async function renderTeam() {
  const el = document.getElementById('panel-team');
  if (!el) return;

  // Cas 1 : pas connecté → formulaire email
  if (!cloudUser) {
    el.innerHTML = `
      <div class="card">
        <div class="card-header"><span class="card-icon">👥</span><span class="card-title">Version entre potes</span></div>
        <p style="font-size:14px;color:var(--muted);margin-bottom:16px;line-height:1.6">
          Connecte-toi pour voir le <strong>classement</strong> avec tes potes
          (série 🔥 et % de réussite). Tu reçois un lien de connexion par email,
          pas de mot de passe.</p>
        <input class="name-input" id="cloud-email" type="email" placeholder="ton@email.com" style="width:100%;margin-bottom:10px" />
        <button class="btn btn-primary" id="cloud-signin">📧 Recevoir mon lien de connexion</button>
        <p id="cloud-msg" style="font-size:13px;color:var(--accent2);margin-top:12px;text-align:center"></p>
      </div>`;
    document.getElementById('cloud-signin').addEventListener('click', async () => {
      const email = document.getElementById('cloud-email').value;
      const msg = document.getElementById('cloud-msg');
      if (!email) { msg.textContent = 'Entre ton email.'; return; }
      try { await cloudSignIn(email); msg.textContent = '✅ Lien envoyé ! Regarde tes emails.'; }
      catch (e) { msg.textContent = '❌ ' + e.message; }
    });
    return;
  }

  // Cas 2 : connecté mais sans profil → pseudo + code de groupe
  if (!cloudProfile) {
    el.innerHTML = `
      <div class="card">
        <div class="card-header"><span class="card-icon">🙋</span><span class="card-title">Rejoindre une team</span></div>
        <p style="font-size:14px;color:var(--muted);margin-bottom:16px;line-height:1.6">
          Choisis ton pseudo et un <strong>code de groupe</strong> commun avec tes potes
          (inventez-en un, ex. <em>les-boys</em>). Ceux qui ont le même code se voient.</p>
        <input class="name-input" id="cloud-name" placeholder="Pseudo" style="width:100%;margin-bottom:10px" />
        <input class="name-input" id="cloud-group" placeholder="Code de groupe (ex. les-boys)" style="width:100%;margin-bottom:10px" />
        <button class="btn btn-primary" id="cloud-join">✅ Rejoindre</button>
        <button class="btn" id="cloud-logout" style="margin-top:8px">Se déconnecter</button>
      </div>`;
    document.getElementById('cloud-join').addEventListener('click', async () => {
      const name = document.getElementById('cloud-name').value;
      const group = document.getElementById('cloud-group').value;
      if (!name) return;
      try { await saveProfile(name, group); renderTeam(); showToast('🎉 Bienvenue dans la team !'); }
      catch (e) { showToast('❌ ' + e.message); }
    });
    document.getElementById('cloud-logout').addEventListener('click', cloudSignOut);
    return;
  }

  // Cas 3 : connecté avec profil → classement
  el.innerHTML = `
    <div class="card">
      <div class="card-header"><span class="card-icon">🏆</span><span class="card-title">Classement — groupe « ${escapeHtml(cloudProfile.group_code)} »</span></div>
      <div id="cloud-board"><p style="color:var(--muted);font-size:14px">Chargement…</p></div>
    </div>
    <div class="card">
      <p style="font-size:13px;color:var(--muted);line-height:1.6">Partage ce code à tes potes pour qu'ils te rejoignent :
        <strong style="color:var(--text)">${escapeHtml(cloudProfile.group_code)}</strong></p>
      <button class="btn" id="cloud-logout" style="margin-top:12px">Se déconnecter (${escapeHtml(cloudProfile.username)})</button>
    </div>`;
  document.getElementById('cloud-logout').addEventListener('click', cloudSignOut);

  await cloudPushToday();
  const board = await fetchLeaderboard();
  document.getElementById('cloud-board').innerHTML = board.map((b, i) => `
    <div class="hstat-row" style="display:flex;align-items:center;gap:12px">
      <span style="font-size:18px;font-weight:800;color:var(--muted);width:24px">${i + 1}</span>
      <span class="hstat-name" style="flex:1${b.me ? ';color:var(--accent2);font-weight:700' : ''}">${escapeHtml(b.name)}${b.me ? ' (toi)' : ''}</span>
      <span class="hstat-streak">🔥 ${b.streak} j</span>
      <span class="hstat-pct" style="color:var(--accent2);font-weight:700;margin-left:10px">${b.rate7}%</span>
    </div>`).join('');
}

/* ── Initialisation ─────────────────────────────────────── */
(async function initCloud() {
  const { data } = await sb.auth.getSession();
  cloudUser = data.session ? data.session.user : null;
  if (cloudUser) await loadProfile();

  // Réagit aux connexions/déconnexions (ex. retour du lien magique)
  sb.auth.onAuthStateChange(async (_e, session) => {
    cloudUser = session ? session.user : null;
    if (cloudUser) await loadProfile();
    renderTeam();
  });
})();
