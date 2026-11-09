// Farmácia dos Gigantes
// Quando o grupo VIP existir, cole o link entre as aspas de GROUP_LINK.
// Exemplo: "https://chat.whatsapp.com/XXXXXXXX"
const CONFIG = {
  GROUP_LINK: "",
};

/* ---------- botões do grupo ---------- */
(function () {
  const buttons = document.querySelectorAll("[data-group-link]");
  const toast = document.querySelector(".toast");
  let timer;

  buttons.forEach((btn) => {
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
      clearTimeout(timer);
      timer = setTimeout(() => { toast.hidden = true; }, 3500);
    });
  });
})();
