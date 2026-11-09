# Farmácia dos Gigantes

Site de catálogo com grupo VIP no WhatsApp e painel de administração. HTML, CSS e JS estáticos (GitHub Pages), com banco de dados, login e fotos no Supabase.

## Como funciona
- **Site** (`index.html`, `script.js`): lê a lista de produtos do Supabase e monta os cartões. Mostra só produtos ativos, na ordem definida no painel.
- **Painel** (`admin/`): endereço `/admin/`, sem link no site. Login com e-mail e senha. Cadastra, edita, esconde, apaga e reordena produtos, com foto, preço e preço promocional.
- **Banco** (`supabase/setup.sql`): tabela `products` e pasta de fotos `products`. Qualquer pessoa lê produtos ativos e vê as fotos; só a conta de administrador altera.
- A chave do Supabase em `script.js` e `admin/admin.js` é pública (publishable). A segurança vem das regras do banco. Nunca colocar no código a chave `secret` nem a `service_role`.

## Como rodar
```bash
python -m http.server 5177
```
Abra http://localhost:5177 (site) e http://localhost:5177/admin/ (painel).

## Configuração do Supabase (uma vez)
1. Rodar `supabase/setup.sql` no SQL Editor.
2. Em Authentication, desligar "Allow new users to sign up".
3. Em Authentication > Users, criar o usuário administrador (e-mail e senha) com "Auto Confirm User".

## Como editar
- **Produtos, fotos, preços e ordem:** pelo painel `/admin/`.
- **Link do grupo VIP:** `script.js`, em `CONFIG.GROUP_LINK`. Vazio = os botões mostram um aviso.
- **Cartões vazios:** `script.js`, em `CONFIG.TOTAL_SLOTS` (hoje 7). O catálogo completa com cartões vazios até esse total; cada produto novo no painel ocupa o lugar de um vazio. Use 0 para não mostrar nenhum.
- **Textos fixos da página** (título, bloco do grupo): `index.html`.

## Pendências (dependem do cliente)
- Link do grupo VIP do WhatsApp.
- Cadastrar os produtos reais no painel.
- Logo oficial (a atual é provisória).
- Cidade, endereço, telefone e horário.
- Dados regulatórios de farmácia: CNPJ, responsável técnico e CRF costumam ser exigidos na divulgação. Não cadastrar remédio de venda sob prescrição.
- Domínio próprio.

## Avisos
- O projeto gratuito do Supabase pausa após cerca de 1 semana sem acessos. Visitas normais ao site mantêm o projeto ativo; se pausar, reativar no painel do Supabase.
- Fotos são reduzidas para 1200 px e convertidas para WebP no navegador, antes do envio.
