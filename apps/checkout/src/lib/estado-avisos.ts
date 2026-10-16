// Avisos de erro do checkout do comprador.
//
// Antes o checkout usava o `toast` do sonner. O sonner injeta no <head>, assim
// que o módulo carrega, uma folha de estilo inteira (inclusive com `transition:
// height`, que anima layout), mesmo quando nenhum aviso aparece. Para o comprador
// isso era custo de rede e de estilo sem retorno, então o checkout passou a ter
// um aviso próprio, pequeno, e o sonner ficou só no backoffice (ver `App.tsx`).
//
// Este arquivo é só o estado; o desenho está em `Avisos.tsx`. O nome é outro porque
// no Windows `avisos.ts` e `Avisos.tsx` colidem (sistema de arquivos sem distinção de caixa).
import { useSyncExternalStore } from 'react';

export interface Aviso {
  id: number;
  mensagem: string;
}

/** Tempo na tela. Erro precisa de tempo para ser lido, mas não fica para sempre. */
const DURACAO_MS = 7000;

let avisos: Aviso[] = [];
let ultimoId = 0;
const ouvintes = new Set<() => void>();

const emitir = (): void => {
  ouvintes.forEach((ouvinte) => ouvinte());
};

const assinar = (ouvinte: () => void): (() => void) => {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
};

export const fecharAviso = (id: number): void => {
  avisos = avisos.filter((aviso) => aviso.id !== id);
  emitir();
};

/** Mostra um erro. Só um aviso fica visível por vez: o mais novo substitui o anterior. */
export const avisoErro = (mensagem: string): void => {
  ultimoId += 1;
  const id = ultimoId;
  avisos = [{ id, mensagem }];
  emitir();
  window.setTimeout(() => fecharAviso(id), DURACAO_MS);
};

export const useAvisos = (): Aviso[] =>
  useSyncExternalStore(
    assinar,
    () => avisos,
    () => avisos
  );
