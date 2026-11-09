// Painel da Farmácia dos Gigantes
// Fala direto com o Supabase (login, produtos e fotos). Sem bibliotecas de terceiros.
// A chave abaixo é pública: quem protege os dados são as regras do banco (só a conta de admin altera).
const CFG = {
  URL: "https://wwkxyhyosgvelhizbqop.supabase.co",
  KEY: "sb_publishable_CAEZkOdgcQtBgLI1cFZFJA_GifjYAMc",
  BUCKET: "products",
};
const SESSION_KEY = "gigantes-admin-session";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const $ = (id) => document.getElementById(id);
let session = null;
let products = [];
let editing = null; // produto em edição (null = novo)
let pendingFile = null; // foto escolhida, ainda não enviada
let removePhoto = false;
let busy = false;

/* ---------- sessão e login ---------- */
function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}
function saveSession(s) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* navegador sem armazenamento: o login vale só nesta aba */ }
}

async function tokenRequest(grant, body) {
  const res = await fetch(CFG.URL + "/auth/v1/token?grant_type=" + grant, {
    method: "POST",
    headers: { apikey: CFG.KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.msg || data.message || "Erro de login");
    err.status = res.status;
    err.code = data.error_code || data.error;
    throw err;
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
  };
}

async function getToken() {
  if (!session) throw new Error("Sem sessão");
  if (session.expires_at - 60 > Date.now() / 1000) return session.access_token;
  try {
    session = await tokenRequest("refresh_token", { refresh_token: session.refresh_token });
    saveSession(session);
  } catch (err) {
    session = null;
    saveSession(null);
    showLogin();
    throw err;
  }
  return session.access_token;
}

async function api(path, { method = "GET", body, headers = {} } = {}) {
  const token = await getToken();
  const isBlob = body instanceof Blob;
  const res = await fetch(CFG.URL + path, {
    method,
    headers: {
      apikey: CFG.KEY,
      Authorization: "Bearer " + token,
      ...(body && !isBlob ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body == null ? undefined : isBlob ? body : JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.message || data.error || "HTTP " + res.status);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json().catch(() => null);
}

function show(which) {
  $("carregando").hidden = true;
  $("login").hidden = which !== "login";
  $("painel").hidden = which !== "painel";
  $("sair").hidden = which !== "painel";
}

function showLogin() {
  show("login");
  $("l-senha").value = "";
}

$("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const erro = $("login-erro");
  const btn = $("login-btn");
  erro.textContent = "";
  btn.disabled = true;
  btn.textContent = "Entrando...";
  try {
    session = await tokenRequest("password", {
      email: $("l-email").value.trim(),
      password: $("l-senha").value,
    });
    saveSession(session);
    $("l-senha").value = "";
    await openPanel();
  } catch (err) {
    if (err.status === 429) erro.textContent = "Muitas tentativas. Espere um pouco e tente de novo.";
    else if (err.status === 400) erro.textContent = "E-mail ou senha incorretos.";
    else erro.textContent = "Não foi possível entrar agora. Confira a internet e tente de novo.";
  } finally {
    btn.disabled = false;
    btn.textContent = "Entrar";
  }
});

$("sair").addEventListener("click", async () => {
  try { await api("/auth/v1/logout", { method: "POST" }); } catch { /* sai mesmo assim */ }
  session = null;
  saveSession(null);
  products = [];
  showLogin();
});

/* ---------- lista de produtos ---------- */
function photoUrl(path) {
  return CFG.URL + "/storage/v1/object/public/" + CFG.BUCKET + "/" + encodeURIComponent(path);
}

function setMsg(text, isError) {
  const node = $("msg");
  node.textContent = text || "";
  node.classList.toggle("is-erro", Boolean(isError));
}

function friendly(err) {
  if (err.status === 401 || err.status === 403) return "Sem permissão. Saia e entre de novo.";
  if (err.status === 413) return "A foto é grande demais.";
  return "Algo deu errado. Confira a internet e tente de novo.";
}

async function fetchProducts() {
  products = await api("/rest/v1/products?select=*&order=position.asc,created_at.asc");
}

async function openPanel() {
  show("painel");
  setMsg("Carregando produtos...");
  try {
    await fetchProducts();
    setMsg("");
  } catch (err) {
    if (!session) return; // voltou para o login
    setMsg(friendly(err), true);
  }
  render();
}

function mk(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function actionBtn(label, act, id, extra) {
  const b = mk("button", "btn btn--sm " + (extra || "btn--ghost-dark"), label);
  b.type = "button";
  b.dataset.act = act;
  b.dataset.id = id;
  return b;
}

function render() {
  const list = $("lista");
  list.textContent = "";
  if (!products.length) {
    list.appendChild(mk("li", "vazio", "Nenhum produto ainda. Toque em \"Novo produto\" para começar."));
    return;
  }
  products.forEach((p, i) => {
    const li = mk("li", "item" + (p.active ? "" : " is-off"));

    const thumb = mk("div", "thumb");
    if (p.image_path) {
      const img = document.createElement("img");
      img.src = photoUrl(p.image_path);
      img.alt = "";
      img.loading = "lazy";
      thumb.appendChild(img);
    } else {
      thumb.textContent = "Sem foto";
    }
    li.appendChild(thumb);

    const info = mk("div", "info");
    info.appendChild(mk("strong", null, p.name));
    const preco = mk("span", "preco");
    if (p.price == null) {
      preco.textContent = "Consulte no grupo";
    } else if (p.promo_price != null) {
      preco.append(mk("s", null, money.format(p.price)), mk("b", null, money.format(p.promo_price)));
    } else {
      preco.textContent = money.format(p.price);
    }
    info.appendChild(preco);
    if (!p.active) info.appendChild(mk("span", "badge", "Escondido do site"));
    li.appendChild(info);

    const acoes = mk("div", "acoes");
    const up = actionBtn("Subir", "up", p.id);
    up.disabled = i === 0;
    const down = actionBtn("Descer", "down", p.id);
    down.disabled = i === products.length - 1;
    acoes.append(
      up,
      down,
      actionBtn("Editar", "edit", p.id),
      actionBtn(p.active ? "Esconder" : "Mostrar", "toggle", p.id),
      actionBtn("Apagar", "delete", p.id)
    );
    li.appendChild(acoes);
    list.appendChild(li);
  });
}

async function guarded(fn) {
  if (busy) return;
  busy = true;
  document.querySelectorAll("#lista button, #novo").forEach((b) => (b.disabled = true));
  try {
    await fn();
  } finally {
    busy = false;
    render();
    $("novo").disabled = false;
  }
}

$("lista").addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-act]");
  if (!btn) return;
  const id = btn.dataset.id;
  const p = products.find((x) => x.id === id);
  if (!p) return;
  const act = btn.dataset.act;

  if (act === "edit") return openForm(p);
  if (act === "up" || act === "down") return guarded(() => move(id, act === "up" ? -1 : 1));
  if (act === "toggle") return guarded(() => toggle(p));
  if (act === "delete") {
    if (!confirm('Apagar "' + p.name + '" de vez? Isso não pode ser desfeito.\n\nSe só acabou o estoque, use "Esconder".')) return;
    return guarded(() => remove(p));
  }
});

async function move(id, dir) {
  const i = products.findIndex((p) => p.id === id);
  const j = i + dir;
  if (j < 0 || j >= products.length) return;
  setMsg("");
  [products[i], products[j]] = [products[j], products[i]];
  render();
  try {
    await Promise.all(
      products.map((p, idx) =>
        p.position === idx
          ? null
          : api("/rest/v1/products?id=eq." + p.id, {
              method: "PATCH",
              body: { position: idx },
              headers: { Prefer: "return=minimal" },
            }).then(() => { p.position = idx; })
      )
    );
  } catch (err) {
    setMsg(friendly(err), true);
    try { await fetchProducts(); } catch { /* mantém a lista atual */ }
  }
}

async function toggle(p) {
  setMsg("");
  try {
    await api("/rest/v1/products?id=eq." + p.id, {
      method: "PATCH",
      body: { active: !p.active },
      headers: { Prefer: "return=minimal" },
    });
    p.active = !p.active;
  } catch (err) {
    setMsg(friendly(err), true);
  }
}

async function remove(p) {
  setMsg("");
  try {
    await api("/rest/v1/products?id=eq." + p.id, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    products = products.filter((x) => x.id !== p.id);
    if (p.image_path) await deleteImage(p.image_path);
  } catch (err) {
    setMsg(friendly(err), true);
  }
}

async function deleteImage(path) {
  try { await api("/storage/v1/object/" + CFG.BUCKET + "/" + encodeURIComponent(path), { method: "DELETE" }); }
  catch { /* foto órfã não atrapalha o site */ }
}

/* ---------- cadastro e edição ---------- */
const dlg = $("dlg");

function parseMoney(value) {
  let v = value.trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (!v) return null;
  if (v.includes(",")) v = v.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(v)) v = v.replace(/\./g, "");
  const n = Number(v);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100) / 100;
}

function moneyInput(n) {
  return n == null ? "" : String(n.toFixed(2)).replace(".", ",");
}

function updatePreview() {
  const img = $("f-prev");
  let src = "";
  if (pendingFile) src = URL.createObjectURL(pendingFile);
  else if (editing && editing.image_path && !removePhoto) src = photoUrl(editing.image_path);
  if (src) {
    img.src = src;
    img.hidden = false;
    $("f-vazio").hidden = true;
  } else {
    img.removeAttribute("src");
    img.hidden = true;
    $("f-vazio").hidden = false;
  }
  $("f-remover").hidden = !src;
}

function openForm(p) {
  editing = p || null;
  pendingFile = null;
  removePhoto = false;
  $("dlg-titulo").textContent = p ? "Editar produto" : "Novo produto";
  $("f-nome").value = p ? p.name : "";
  $("f-desc").value = p ? p.description : "";
  $("f-preco").value = p ? moneyInput(p.price) : "";
  $("f-promo").value = p ? moneyInput(p.promo_price) : "";
  $("f-ativo").checked = p ? p.active : true;
  $("f-foto").value = "";
  $("f-erro").textContent = "";
  updatePreview();
  dlg.showModal();
  $("f-nome").focus();
}

$("novo").addEventListener("click", () => openForm(null));
$("f-cancelar").addEventListener("click", () => dlg.close());

$("f-foto").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    $("f-erro").textContent = "Escolha um arquivo de imagem.";
    event.target.value = "";
    return;
  }
  $("f-erro").textContent = "";
  pendingFile = file;
  removePhoto = false;
  updatePreview();
});

$("f-remover").addEventListener("click", () => {
  pendingFile = null;
  removePhoto = true;
  $("f-foto").value = "";
  updatePreview();
});

// Reduz a foto (no máximo 1200 px) e converte para WebP, para o site abrir rápido.
async function prepareImage(file) {
  let bmp;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Não consegui ler essa foto. Tente outra, em JPG ou PNG.");
  }
  const scale = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  let blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  if (!blob || blob.type !== "image/webp") {
    blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
  }
  if (!blob) throw new Error("Não foi possível preparar a foto.");
  return blob;
}

$("form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy) return;
  const erro = $("f-erro");
  erro.textContent = "";

  const name = $("f-nome").value.trim();
  const description = $("f-desc").value.trim();
  const price = parseMoney($("f-preco").value);
  const promo = parseMoney($("f-promo").value);

  if (!name) return void (erro.textContent = "Escreva o nome do produto.");
  if (Number.isNaN(price) || (price !== null && price <= 0)) return void (erro.textContent = "O preço não parece certo. Use só números, como 29,90.");
  if (Number.isNaN(promo) || (promo !== null && promo <= 0)) return void (erro.textContent = "O preço promocional não parece certo. Use só números, como 24,90.");
  if (promo !== null && price === null) return void (erro.textContent = "Para ter preço promocional, preencha também o preço.");
  if (promo !== null && promo >= price) return void (erro.textContent = "O preço promocional precisa ser menor que o preço.");
  if (price !== null && price > 1000000) return void (erro.textContent = "O preço está alto demais.");

  busy = true;
  const saveBtn = $("f-salvar");
  saveBtn.disabled = true;
  saveBtn.textContent = "Salvando...";

  let uploaded = null;
  try {
    let imagePath = editing ? editing.image_path : null;
    let oldImage = null;

    if (pendingFile) {
      const blob = await prepareImage(pendingFile);
      const ext = blob.type === "image/webp" ? "webp" : "jpg";
      uploaded = crypto.randomUUID() + "." + ext;
      await api("/storage/v1/object/" + CFG.BUCKET + "/" + uploaded, {
        method: "POST",
        body: blob,
        headers: { "Content-Type": blob.type, "x-upsert": "false" },
      });
      oldImage = editing ? editing.image_path : null;
      imagePath = uploaded;
    } else if (removePhoto) {
      oldImage = editing ? editing.image_path : null;
      imagePath = null;
    }

    const row = {
      name,
      description,
      price,
      promo_price: promo,
      image_path: imagePath,
      active: $("f-ativo").checked,
    };

    if (editing) {
      await api("/rest/v1/products?id=eq." + editing.id, {
        method: "PATCH",
        body: row,
        headers: { Prefer: "return=minimal" },
      });
    } else {
      const last = products.reduce((max, p) => Math.max(max, p.position), -1);
      await api("/rest/v1/products", {
        method: "POST",
        body: { ...row, position: last + 1 },
        headers: { Prefer: "return=minimal" },
      });
    }

    uploaded = null; // deu certo: a foto nova fica
    if (oldImage) await deleteImage(oldImage);
    dlg.close();
    await fetchProducts();
    setMsg(editing ? "Produto salvo." : "Produto cadastrado no fim da lista.");
  } catch (err) {
    if (uploaded) await deleteImage(uploaded); // desfaz a foto enviada se o produto não foi salvo
    erro.textContent = err.status ? friendly(err) : (err.message || "Algo deu errado. Tente de novo.");
  } finally {
    busy = false;
    saveBtn.disabled = false;
    saveBtn.textContent = "Salvar";
    render();
  }
});

/* ---------- início ---------- */
(async function init() {
  session = loadSession();
  if (!session || !session.refresh_token) return showLogin();
  try {
    await getToken();
    await openPanel();
  } catch {
    showLogin();
  }
})();
