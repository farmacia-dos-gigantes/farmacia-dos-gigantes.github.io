// Farmácia dos Gigantes
// Quando o grupo VIP existir, cole o link entre as aspas de GROUP_LINK.
// Exemplo: "https://chat.whatsapp.com/XXXXXXXX"
const CONFIG = {
  GROUP_LINK: "",
  // Banco de dados (Supabase). A chave abaixo é pública por natureza: quem protege os dados são as regras do banco.
  SUPABASE_URL: "https://wwkxyhyosgvelhizbqop.supabase.co",
  SUPABASE_KEY: "sb_publishable_CAEZkOdgcQtBgLI1cFZFJA_GifjYAMc",
  // Cartões vazios (espaço reservado): o catálogo mostra cartões vazios até chegar a este total.
  // Cada produto novo cadastrado no painel ocupa o lugar de um cartão vazio. Use 0 para não mostrar nenhum.
  TOTAL_SLOTS: 7,
};

/* ---------- botões do grupo ---------- */
const toast = document.querySelector(".toast");
let toastTimer;

function bindGroupButtons(root) {
  root.querySelectorAll("[data-group-link]").forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = "1";

    if (CONFIG.GROUP_LINK) {
      btn.href = CONFIG.GROUP_LINK;
      btn.target = "_blank";
      btn.rel = "noopener";
      return;
    }
    // Sem link ainda: o botão avisa em vez de levar a lugar nenhum.
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      toast.textContent = "O link do grupo VIP ainda não foi configurado.";
      toast.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
    });
  });
}

bindGroupButtons(document);

/* ---------- catálogo (vem do banco de dados) ---------- */
// Todo texto vindo do banco entra na página com textContent, nunca como HTML.
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function photoUrl(path) {
  return CONFIG.SUPABASE_URL + "/storage/v1/object/public/products/" + encodeURIComponent(path);
}

function priceBlock(p) {
  const box = el("div", "price");
  if (p.price == null) {
    box.textContent = "Consulte no grupo";
    return box;
  }
  if (p.promo_price != null) {
    box.append(
      el("span", "sr", "De "),
      el("s", "price__old", money.format(p.price)),
      el("span", "sr", " por "),
      el("span", "price__now", money.format(p.promo_price))
    );
  } else {
    box.append(el("span", "price__now", money.format(p.price)));
  }
  return box;
}

function buildCard(p, index) {
  const li = el("li", "card");

  // quadros alternam vermelho e preto, como num tabuleiro (2 colunas)
  const media = el("div", "media");
  media.dataset.tone = (index + Math.floor(index / 2)) % 2 === 0 ? "vermelho" : "preto";
  if (p.image_path) {
    const img = document.createElement("img");
    img.src = photoUrl(p.image_path);
    img.alt = p.name;
    img.decoding = "async";
    img.loading = index < 2 ? "eager" : "lazy";
    media.appendChild(img);
  }
  li.appendChild(media);

  const body = el("div", "card__body");
  body.appendChild(el("h3", null, p.name));
  if (p.description) body.appendChild(el("p", null, p.description));

  const foot = el("div", "card__foot");
  foot.appendChild(priceBlock(p));
  const btn = el("a", "btn btn--dark", "Pedir no grupo VIP");
  btn.href = "#grupo";
  btn.setAttribute("data-group-link", "");
  btn.appendChild(el("span", "sr", ": " + p.name));
  foot.appendChild(btn);
  body.appendChild(foot);

  li.appendChild(body);
  return li;
}

// Cartão vazio: só o quadro, sem foto. Fica "inert" (não clica, não recebe foco, leitor de tela pula).
function buildPlaceholder(index) {
  const li = el("li", "card");
  li.inert = true;

  const media = el("div", "media");
  media.dataset.tone = (index + Math.floor(index / 2)) % 2 === 0 ? "vermelho" : "preto";
  li.appendChild(media);

  const body = el("div", "card__body");
  body.appendChild(el("h3", null, "Nome do produto"));
  body.appendChild(el("p", null, "Descrição do produto."));
  const foot = el("div", "card__foot");
  foot.appendChild(el("div", "price", "Consulte no grupo"));
  foot.appendChild(el("span", "btn btn--dark", "Pedir no grupo VIP"));
  body.appendChild(foot);

  li.appendChild(body);
  return li;
}

async function loadCatalog() {
  const list = document.getElementById("produtos");
  const status = document.getElementById("status");
  if (!list || !status) return;

  const url =
    CONFIG.SUPABASE_URL +
    "/rest/v1/products?select=id,name,description,price,promo_price,image_path" +
    "&order=position.asc,created_at.asc";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      headers: { apikey: CONFIG.SUPABASE_KEY },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const products = await res.json();

    list.textContent = "";
    products.forEach((p, i) => list.appendChild(buildCard(p, i)));
    for (let i = products.length; i < CONFIG.TOTAL_SLOTS; i++) list.appendChild(buildPlaceholder(i));
    bindGroupButtons(list);

    if (products.length) status.hidden = true;
    else status.textContent = "Novos produtos em breve. Entre no grupo VIP para saber primeiro.";
  } catch (err) {
    status.textContent = "Não foi possível carregar o catálogo agora. Tente de novo em instantes.";
    const retry = el("button", "btn btn--dark", "Tentar de novo");
    retry.type = "button";
    retry.addEventListener("click", () => {
      status.textContent = "Carregando o catálogo...";
      loadCatalog();
    });
    status.appendChild(retry);
  } finally {
    clearTimeout(timer);
  }
}

loadCatalog();
