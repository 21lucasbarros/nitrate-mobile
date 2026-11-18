# Nitrate (mobile)

O app do Nitrate para iOS e Android, feito com Expo (SDK 58) e Expo Router. Usa o mesmo backend e os mesmos endpoints do Nitrate web.

## Rodando

```bash
bun install
bunx expo start
```

O app fala com o backend do Nitrate. Sem configuração, em desenvolvimento ele usa o IP da máquina que roda o Metro na porta `8080` (o celular não enxerga o `localhost` do computador). Para apontar para outro servidor, crie um `.env`:

```bash
EXPO_PUBLIC_API_URL=https://sua-api.exemplo.com
# opcional: endereço do Nitrate web, usado nos links de compartilhar
EXPO_PUBLIC_WEB_URL=https://seu-nitrate.exemplo.com
```

> `expo-secure-store` e `expo-haptics` têm código nativo incluído no Expo Go. Se adicionar outra biblioteca nativa, gere um development build (`bunx expo run:ios`, `bunx expo run:android` ou `bunx eas-cli build --profile development`).

## Telas

- **Entrar / Criar conta**: login por e-mail ou usuário, checagem de usuário disponível, mostrar senha.
- **Início**: o que os amigos (ou a comunidade) assistiram, gostos parecidos, recomendações, watchlist com sorteio de "o que assistir", reviews, em alta e catálogo.
- **Buscar**: filmes (TMDB), pessoas e perfis; sem busca, o catálogo paginado.
- **Amigos**: feed de atividade paginado e sugestões de perfis com gosto parecido.
- **Perfil**: favoritos, contadores, diário, reviews, watchlist e listas; seguidores e seguindo.
- **Filme**: cena de fundo, nota rápida em meias estrelas, curtir, watchlist, adicionar à lista, histograma das notas, elenco, ficha técnica, onde assistir e reviews.
- **Registrar / editar review**: nota, curtida, data, reassistido, texto com negrito/itálico/citação e spoiler.
- **Review**: texto formatado, curtidas e comentários.
- **Pessoa**, **Lista**, **Radar de estreias** (notificações) e **Configurações** (perfil e sair).

## Estrutura

- `src/app/`: rotas (Expo Router). `(tabs)/` são as abas nativas; o resto abre por cima delas.
- `src/components/`: componentes de interface.
- `src/lib/`: API (`api.ts`, `services.ts`), tipos, sessão (`auth-store.ts`), formatação e o parser das reviews.

Estilo com NativeWind, usando a paleta do Nitrate web (`tailwind.config.js` e `src/lib/theme.ts`). Dados com TanStack Query; sessão com Zustand e o token no SecureStore.

## Verificação

```bash
bun run typecheck
bun run lint
bunx expo-doctor
```
