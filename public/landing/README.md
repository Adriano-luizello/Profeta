# Imagens da landing page

Coloque aqui screenshots reais da plataforma Profeta. A landing usa essas imagens quando os arquivos existem; caso contrário, mostra um placeholder.

## Arquivos esperados

| Arquivo        | Onde aparece na landing | Sugestão de captura                    |
|----------------|-------------------------|----------------------------------------|
| `hero.png`     | Hero (primeira seção)   | Dashboard principal, visão geral       |
| `demo.png`     | Seção "Veja em ação"    | Mesmo dashboard ou tela de análise     |

## Como gerar os screenshots

### Opção 1: Captura manual

1. Suba o app localmente: `npm run dev`
2. Faça login e vá até o dashboard (ou a tela que quiser destacar)
3. Ajuste a janela para ~1200×700px (ou use zoom para enquadrar)
4. Capture a tela (macOS: Cmd+Shift+4; Windows: Ferramenta de Captura)
5. Salve como `hero.png` e `demo.png` dentro de `public/landing/`

### Opção 2: Ferramenta de screenshot

- **CleanShot** (macOS), **Greenshot** (Windows) ou **Flameshot** (Linux) para recortar e exportar em PNG.
- Mantenha proporção próxima de 16:9 (ex: 1200×675) para caber bem no layout.

### Opção 3: Screenshot automatizado (Playwright/Puppeteer)

Se quiser gerar em CI ou script:

```bash
# Exemplo com Playwright (instale: npm i -D @playwright/test)
npx playwright install chromium
```

Script de exemplo (`scripts/capture-landing-screenshots.js`):

```js
// Requer servidor rodando em localhost:3000 e usuário logado
// Ajuste o script para fazer login e navegar até o dashboard, depois:
// await page.screenshot({ path: 'public/landing/hero.png', fullPage: false });
```

## Dicas

- Use tema claro e dados de exemplo que valorizem a interface.
- Evite informações sensíveis ou reais de clientes.
- PNG com boa qualidade (não comprima demais) para telas retina.
