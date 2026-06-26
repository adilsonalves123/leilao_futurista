# Aetherion Auctions — Architecture Instructions

> **Never forget these pillars.** This document is the source of truth for product, UX, data, and delivery decisions across Web, iOS, and Android (Expo / React Native).

---

## Pillar 1 — Business & Bids

| Rule | Specification |
|------|----------------|
| **Real-time bidding** | Bid propagation and UI updates must complete in **under 1 second** (target p95 &lt; 800ms). Use Supabase Realtime on `bids` + optimistic UI. |
| **Anti-sniping** | If a bid occurs in the **last 30 seconds** of an auction, **reset the countdown timer to 30s**. |
| **Platform commission** | **10%** fee on winning sale; deducted at checkout settlement. |
| **Bid increments** | Auto-calculated tiers: **+R$5**, **+R$50**, **+R$200** (based on current price band). |
| **Escrow** | Winning funds held in **secured escrow** until delivery confirmation / dispute window closes. |

### Increment bands (BRL)

| Current price | Minimum increment |
|---------------|-------------------|
| R$0 – R$99 | R$5 |
| R$100 – R$999 | R$50 |
| R$1,000+ | R$200 |

---

## Pillar 2 — Screens

| Screen | Purpose & key UI |
|--------|------------------|
| **Splash** | Brand reveal, session bootstrap, preload fonts (Orbitron). |
| **Login (Futurista Fluida)** | Tema claro, vidro fosco, e-mail/senha + **login social** (Google, Apple, Facebook). Ver Pillar 4 — Login. |
| **Home Dashboard** | Glassmorphic item cards, live status badges, quick filters. |
| **Detailed Item** | Live countdown (Orbitron), bid history ticker, state colors (active / ending / won). |
| **Vendor Panel** | 3D stats visualization, create/edit listings, sales overview. |
| **Checkout** | Escrow payment, commission breakdown, delivery selection. |
| **Admin Dashboard** | Fraud intervention, **freeze auction** button, real-time profit flow chart. |

### Item screen state colors (leilão — tema escuro HUD)

- **Active bidding** — Neon Cyan `#00F2FE`
- **Countdown alert (&lt; 30s)** — Neon Pink `#FF007A`
- **Winning / won** — Cyber Green `#05FF9B`

---

## Pillar 3 — Database (Supabase)

Enable **Realtime** on `bids` (and optionally `auctions` for timer extensions).

### Core entities

```
users ──┬── auctions (seller_id)
        ├── bids (bidder_id, auction_id)
        └── checkouts (buyer_id, auction_id)
```

### Schema overview

- **`users`** — profile, role (`bidder` \| `vendor` \| `admin`), wallet_address, escrow_balance.
- **`auctions`** — title, images, start/end_at, current_price, status, anti_snipe_extended_count.
- **`bids`** — auction_id, user_id, amount, created_at (Realtime channel: `bids:auction_id=eq.{id}`).
- **`checkouts`** — auction_id, buyer_id, subtotal, commission_10pct, escrow_status, shipping_label_url.

### Auth social (Supabase)

Habilitar provedores **Google**, **Apple** e **Facebook** no painel Supabase → Authentication → Providers. Redirect URI: scheme `aetherion://` (ver `app.json`). Variáveis em `.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

Migrations live in `supabase/migrations/`. Client types in `src/types/database.ts`. Lógica em `src/lib/socialAuth.ts`.

---

## Pillar 4 — UI Design Tokens

### Login — Futurista Fluida (tema claro)

| Token | Value |
|-------|--------|
| **Background** | `#F8F9FD` |
| **Esferas gradiente** | Lilás / roxo borrados (`#C4B5FD`, `#A78BFA`, `#8B5CF6` com opacidade) |
| **Cartão vidro fosco** | `rgba(255, 255, 255, 0.72)` + blur + borda branca sutil |
| **Acento** | Roxo `#7C3AED` |
| **Texto** | `#1E1B2E` primário, `#5B5675` secundário |
| **Campos** | Fundo branco suave, borda lilás, foco roxo |
| **Social** | Botões dedicados: **Entrar com o Google**, **Entrar com a Apple**, **Entrar com o Facebook** |
| **Idioma** | Português (Brasil) |

Tokens em `src/theme/lightTokens.ts`. Componentes em `app/(auth)/_components/`.

### Leilões — HUD escuro (demais telas)

| Token | Value |
|-------|--------|
| **Background** | `#0A0A0C` (space dark) |
| **Glass panel** | `rgba(18, 20, 28, 0.6)` + `backdrop-blur-md` + `border: 1px solid rgba(255,255,255,0.1)` |
| **Primary / HUD** | Neon Cyan `#00F2FE` |
| **Countdown alert** | Neon Pink `#FF007A` |
| **Winning bid** | Cyber Green `#05FF9B` |
| **Timer font** | **Orbitron** |

Tokens escuros em `src/theme/tokens.ts`.

---

## Support & Delivery

| Capability | Implementation |
|------------|----------------|
| **AI support chatbot** | Reads **real-time Supabase bid logs** for context-aware answers (auction status, last bids, disputes). |
| **Freight calculation** | Logistics API integration at listing/checkout (CEP → quote). |
| **Delivery payments** | Checkout flow charges item + shipping; escrow holds until confirmed. |
| **Shipping labels** | Auto-generate **QR Code shipping label** PDF/PNG on paid checkout. |

---

## Pillar 5 — Regras Operacionais e Segurança (Ponta a Ponta)

> Implementação mock em `src/store/operationsStore.ts` + serviços em `src/services/`. UI em Painel Vendedor, Pagamento, Meu Pedido e Painel Admin.

### 5.1 Cadastro de item e Nota Fiscal (compliance)

| Regra | Especificação |
|-------|----------------|
| **NF-e obrigatória** | Leilão só publica com **Chave de Acesso (44 dígitos)** **ou** upload/URI do **PDF** da NF-e. |
| **Peso e dimensões** | **Peso (kg)** e **C × L × A (cm)** obrigatórios para cálculo de frete futuro. |
| **Validação** | `src/services/listingCompliance.ts` + `src/lib/nfValidation.ts` |
| **UI** | Formulário no **Painel do Vendedor** (`VendorListingForm`) |

### 5.2 Pagamento e custódia segura (escrow)

| Regra | Especificação |
|-------|----------------|
| **Meios de pagamento** | Cartão de Crédito, Pix, Criptomoedas (simulados). |
| **Custódia** | Após pagamento (item + frete), status **`RETIDO_EM_CUSTODIA`**. Saque do vendedor **desativado** enquanto retido. |
| **Timeout postagem** | Vendedor tem **72 horas úteis** para postar. Falha → **`EXPIRADO`** + estorno automático simulado ao comprador. |
| **Serviços** | `src/services/escrowService.ts`, `src/lib/businessHours.ts` |

### 5.3 Integração de frete e QR Code automático

| Regra | Especificação |
|-------|----------------|
| **Gatilho** | Pagamento em custódia → gera objeto de entrega mock (Melhor Envio / Correios). |
| **Conteúdo** | Código de rastreio + URL de etiqueta com **QR Code de postagem**. |
| **Visibilidade** | Etiqueta/QR **exclusivos no Painel do Vendedor** (custo zero no balcão). |
| **Trânsito** | Bip na agência → status **`EM_TRANSITO`**. |
| **Serviços** | `src/services/shippingService.ts`, `src/services/logistics.ts` |

### 5.4 Entrega, disputa e split de comissão (10%)

| Regra | Especificação |
|-------|----------------|
| **Entrega** | Rastreamento **`ENTREGUE`** → cronômetro **48h** para confirmação/disputa. |
| **Split automático** | Confirmar recebimento **ou** 48h sem reclamação → **90%** do lote + **100%** do frete ao vendedor; **10%** comissão líquida ao Admin. |
| **Disputa** | Dentro de 48h → **`EM_DISPUTA`**, saldo congelado; Admin resolve (favor vendedor = split, favor comprador = estorno). |
| **Serviços** | `src/services/settlementService.ts`, `src/services/operationsOrchestrator.ts` |

### Fluxo de telas (demo)

1. **Vendedor** → cadastrar item (NF + dimensões) → publicar  
2. **Comprador** → Checkout → pagar (Pix/Cartão/Cripto)  
3. **Vendedor** → ver etiqueta QR → simular postagem → simular entrega  
4. **Comprador** → Meu Pedido → confirmar ou disputar (48h)  
5. **Admin** → carteira comissão 10% + resolver disputas  

### Arquivos principais

```
src/types/operations.ts
src/constants/operations.ts
src/store/operationsStore.ts
src/services/listingCompliance.ts
src/services/escrowService.ts
src/services/shippingService.ts
src/services/settlementService.ts
src/services/operationsOrchestrator.ts
src/hooks/useOperationsStore.ts
```

---

## Tech stack (reference)

- **Client:** Expo (React Native) — Web, iOS, Android
- **Backend / DB / Realtime:** Supabase (Auth, Postgres, Realtime, Storage)
- **State:** React Query + Zustand (or Context) for session and live auction slice
- **Navigation:** Expo Router (file-based)

---

## Non-negotiables checklist

- [ ] Bid latency &lt; 1s end-to-end
- [ ] Anti-snipe: +30s reset when bid in final 30s
- [x] 10% commission on checkout
- [ ] Increment tiers: R$5 / R$50 / R$200
- [x] Escrow on winning bids
- [x] Compliance NF-e + peso/dimensões no cadastro vendedor
- [x] Custódia RETIDO_EM_CUSTODIA + timeout 72h postagem
- [x] Etiqueta QR automática no painel vendedor
- [x] Split 90/10 + frete 100% vendedor após confirmação 48h
- [x] Fluxo de disputa com intervenção Admin
- [ ] All seven screen groups implemented
- [ ] Login claro + social (Google, Apple, Facebook)
- [ ] Design tokens applied consistently (claro no auth, escuro no leilão)
- [ ] Supabase schema + Realtime on bids
- [ ] AI bot + logistics + QR labels wired in delivery phase
