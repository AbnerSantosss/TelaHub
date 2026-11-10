import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./regrasDePublicacao.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const {
  dividirPorOrientacao, estadoDaPublicacao, descreverAlvo, validarJanela,
  paraDataHoraLocal, telaEstaOnline, descreverJanela, ROTULO_DO_ESTADO,
} = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));

// Datas em hora local, igual ao <input type="datetime-local">.
const ms = (texto) => new Date(texto).getTime();
const AGORA = ms('2026-10-31T12:00');

test('dividirPorOrientacao: um grupo quando todas as telas têm a mesma orientação', () => {
  assert.deepEqual(
    dividirPorOrientacao([{ id: 'a', orientation: 'horizontal' }, { id: 'b' }]),
    [{ orientation: 'horizontal', displayIds: ['a', 'b'] }],
  );
  assert.deepEqual(
    dividirPorOrientacao([{ id: 'c', orientation: 'vertical' }]),
    [{ orientation: 'vertical', displayIds: ['c'] }],
  );
});

test('dividirPorOrientacao: seleção mista vira duas publicações, deitadas primeiro', () => {
  const grupos = dividirPorOrientacao([
    { id: 'v1', orientation: 'vertical' },
    { id: 'h1', orientation: 'horizontal' },
    { id: 'v1', orientation: 'vertical' },
    { id: '' },
    null,
  ]);
  assert.deepEqual(grupos, [
    { orientation: 'horizontal', displayIds: ['h1'] },
    { orientation: 'vertical', displayIds: ['v1'] },
  ]);
  assert.deepEqual(dividirPorOrientacao([]), []);
});

test('estadoDaPublicacao: no ar, agendada e encerrada', () => {
  const janela = { active: true, is_permanent: false, start_time: '2026-10-31T10:00', end_time: '2026-10-31T14:00' };
  assert.equal(estadoDaPublicacao(janela, AGORA), 'no-ar');
  assert.equal(estadoDaPublicacao({ ...janela, start_time: '2026-11-01T08:00', end_time: '2026-11-01T18:00' }, AGORA), 'agendada');
  assert.equal(estadoDaPublicacao({ ...janela, end_time: '2026-10-31T11:00' }, AGORA), 'encerrada');
  assert.equal(estadoDaPublicacao({ ...janela, active: false }, AGORA), 'encerrada');
});

test('estadoDaPublicacao: permanente fica no ar mesmo com fim antigo', () => {
  const permanente = { active: true, is_permanent: true, start_time: '2026-10-01T09:00', end_time: '2026-10-02T09:00' };
  assert.equal(estadoDaPublicacao(permanente, AGORA), 'no-ar');
  assert.equal(estadoDaPublicacao({ ...permanente, end_time: '' }, AGORA), 'no-ar');
  assert.equal(estadoDaPublicacao({ ...permanente, active: false }, AGORA), 'encerrada');
  assert.equal(ROTULO_DO_ESTADO['no-ar'], 'No ar agora');
});

test('descreverAlvo: texto do alvo no cartão', () => {
  assert.equal(descreverAlvo(0, 3), 'Nenhuma tela');
  assert.equal(descreverAlvo(1, 3), '1 tela');
  assert.equal(descreverAlvo(2, 3), '2 telas');
  assert.equal(descreverAlvo(3, 3), 'Todas as telas');
  // Com uma tela só, "Todas as telas" confunde: fica "1 tela".
  assert.equal(descreverAlvo(1, 1), '1 tela');
});

test('validarJanela: exige início e fim, com o fim depois do início', () => {
  assert.equal(validarJanela('', '2026-10-31T14:00'), 'Informe o dia e a hora de início.');
  assert.equal(validarJanela('2026-10-31T10:00', ''), 'Informe o dia e a hora de fim.');
  assert.equal(validarJanela('2026-10-31T10:00', '2026-10-31T10:00'), 'O fim precisa ser depois do início.');
  assert.equal(validarJanela('2026-10-31T10:00', '2026-10-31T09:00'), 'O fim precisa ser depois do início.');
  assert.equal(validarJanela('2026-10-31T10:00', '2026-10-31T18:00'), null);
});

test('paraDataHoraLocal: formato do datetime-local, na hora local', () => {
  assert.equal(paraDataHoraLocal(ms('2026-03-05T07:09')), '2026-03-05T07:09');
  assert.equal(paraDataHoraLocal(ms('2026-12-31T23:59:59')), '2026-12-31T23:59');
});

test('telaEstaOnline: aparelho visto dentro do limite (2,5 batidas de 60 s)', () => {
  const aparelhos = [
    { display_id: 'tv-1', last_seen: AGORA - 10_000 },
    { display_id: 'tv-2', last_seen: AGORA - 200_000 },
    { display_id: 'tv-4', last_seen: AGORA - 120_000 },
    { display_id: null, last_seen: AGORA },
  ];
  assert.equal(telaEstaOnline('tv-1', aparelhos, AGORA), true);
  assert.equal(telaEstaOnline('tv-2', aparelhos, AGORA), false);
  // Uma batida perdida (player a cada 60 s) não derruba a tela.
  assert.equal(telaEstaOnline('tv-4', aparelhos, AGORA), true);
  assert.equal(telaEstaOnline('tv-3', aparelhos, AGORA), false);
});

test('descreverJanela: texto do horário no cartão', () => {
  assert.equal(
    descreverJanela({ active: true, is_permanent: true, start_time: '2026-10-31T09:30', end_time: '' }),
    'Desde 31/10 09:30, até você tirar do ar',
  );
  assert.equal(
    descreverJanela({ active: true, is_permanent: false, start_time: '2026-11-01T08:00', end_time: '2026-11-01T18:00' }),
    '01/11 08:00 até 01/11 18:00',
  );
  assert.equal(descreverJanela({ active: true, is_permanent: true }), 'Até você tirar do ar');
});
