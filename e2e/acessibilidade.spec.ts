import { expect, test } from '@playwright/test';
import { entrarComoAdmin, responderJson, SUPABASE } from './apoio';

test('deve prender o foco, fechar com Esc e devolver o foco quando o admin usa um modal', async ({
  page,
}) => {
  await entrarComoAdmin(page);
  await page.route(`${SUPABASE}/rest/v1/transactions*`, (rota) => responderJson(rota, []));
  await page.goto('/admin/#/caixa');

  const abrir = page.getByRole('button', { name: 'Novo lançamento' });
  await abrir.click();

  const dialogo = page.getByRole('dialog', { name: 'Novo lançamento' });
  await expect(dialogo).toBeVisible();

  // Tab repetido nunca chega à página de trás (o <dialog> a deixa inerte). Ao fim do modal o foco
  // pode sair para a barra do navegador, o que deixa o body como elemento ativo.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    const dentro = await page.evaluate(() => {
      const ativo = document.activeElement;
      return ativo === document.body || !!document.querySelector('dialog[open]')?.contains(ativo);
    });
    expect(dentro, `Tab ${i + 1} saiu do modal`).toBe(true);
  }

  await page.keyboard.press('Escape');
  await expect(dialogo).toBeHidden();
  await expect(abrir).toBeFocused();
});
