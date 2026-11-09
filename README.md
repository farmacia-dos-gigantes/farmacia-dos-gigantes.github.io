# Farmácia dos Gigantes

Site de catálogo com grupo VIP no WhatsApp. HTML, CSS e JS estáticos, sem build.

## Como rodar
```bash
python -m http.server 5177
```
Abra http://localhost:5177.

## Como editar
- **Link do grupo VIP:** `script.js`, em `CONFIG.GROUP_LINK`. Vazio = os botões mostram um aviso.
- **Produtos:** cada `<li class="card">` em `index.html` é um produto. Troque o nome (`h3`), a descrição (`p`) e o `aria-label` do botão. Para tirar um produto, apague o `<li>`; para somar, copie um. Aceita de 3 a 5 (com número ímpar, o último ocupa a linha toda).
- **Cor do quadro:** `data-tone="vermelho"` ou `"preto"` no `div.media`.
- **Foto no lugar do desenho:** troque o `<svg>` do quadro por `<img src="public/images/arquivo.webp" alt="Nome do produto">` e peça um ajuste de CSS.
- **Preço:** hoje cada card mostra "Consulte no grupo" (`span.price`).

## Pendências (dependem do cliente)
- Link do grupo VIP do WhatsApp.
- Lista real dos produtos (nome, descrição) e, se quiser, fotos.
- Logo oficial (a atual é provisória).
- Cidade, endereço, telefone e horário (para dados estruturados e rodapé).
- Dados regulatórios de farmácia: CNPJ, responsável técnico e CRF costumam ser exigidos em material de divulgação. Confirmar com o cliente. Não divulgar medicamento de venda sob prescrição.
- Domínio próprio.
