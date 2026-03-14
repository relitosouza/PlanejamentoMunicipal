'use client';

import React from 'react';
import Link from 'next/link';

export default function ImportarPPAPage() {
  return (
    <div className="layout-container flex h-full grow flex-col bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between border-b border-primary/10 bg-white dark:bg-background-dark px-6 py-3 lg:px-40">
        <div className="flex items-center gap-4 text-primary">
          <div className="flex items-center justify-center bg-primary text-white p-1.5 rounded-lg">
            <span className="material-symbols-outlined">account_balance</span>
          </div>
          <h2 className="text-primary dark:text-slate-100 text-lg font-bold leading-tight tracking-tight">Gestão Pública</h2>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-primary/10 text-primary dark:text-slate-100 hover:bg-primary/20 transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-primary/10 text-primary dark:text-slate-100 hover:bg-primary/20 transition-colors">
            <span className="material-symbols-outlined">help</span>
          </button>
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">JS</div>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-6 py-8 lg:px-40 max-w-7xl mx-auto w-full">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm font-medium mb-6">
          <Link href="/" className="text-slate-500 hover:text-primary transition-colors">Início</Link>
          <span className="text-slate-400 material-symbols-outlined text-sm">chevron_right</span>
          <Link href="/ppa" className="text-slate-500 hover:text-primary transition-colors">Planejamento</Link>
          <span className="text-slate-400 material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-primary font-semibold">Importação de PPA</span>
        </nav>

        {/* Page Title & Stepper */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Importar PPA Existente</h1>
          <p className="text-slate-600 dark:text-slate-400">Processo assistido para migração de dados de Planos Plurianuais anteriores.</p>
        </div>

        {/* Wizard Stepper Visual */}
        <div className="flex items-center w-full max-w-2xl mb-10">
          <div className="flex flex-col items-center flex-1">
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold mb-2">1</div>
            <span className="text-xs font-semibold text-primary">Upload</span>
          </div>
          <div className="h-0.5 bg-primary/20 flex-1 -mt-6"></div>
          <div className="flex flex-col items-center flex-1 opacity-50">
            <div className="w-10 h-10 rounded-full border-2 border-slate-300 text-slate-500 flex items-center justify-center font-bold mb-2">2</div>
            <span className="text-xs font-semibold text-slate-500">Validação</span>
          </div>
          <div className="h-0.5 bg-primary/20 flex-1 -mt-6"></div>
          <div className="flex flex-col items-center flex-1 opacity-50">
            <div className="w-10 h-10 rounded-full border-2 border-slate-300 text-slate-500 flex items-center justify-center font-bold mb-2">3</div>
            <span className="text-xs font-semibold text-slate-500">Conclusão</span>
          </div>
        </div>

        {/* Tabs Selection */}
        <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mb-8">
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button className="flex-1 py-4 px-6 flex flex-col items-center gap-2 border-b-2 border-primary text-primary bg-primary/5">
              <span className="material-symbols-outlined text-2xl">description</span>
              <span className="font-bold text-sm uppercase tracking-wider">Excel / XLSX</span>
            </button>
            <button className="flex-1 py-4 px-6 flex flex-col items-center gap-2 border-b-2 border-transparent text-slate-500 hover:bg-slate-50 transition-colors">
              <span className="material-symbols-outlined text-2xl">csv</span>
              <span className="font-bold text-sm uppercase tracking-wider">CSV</span>
            </button>
            <button className="flex-1 py-4 px-6 flex flex-col items-center gap-2 border-b-2 border-transparent text-slate-500 hover:bg-slate-50 transition-colors">
              <span className="material-symbols-outlined text-2xl">sync_alt</span>
              <span className="font-bold text-sm uppercase tracking-wider">Integração Contábil</span>
            </button>
          </div>
          {/* Upload Area */}
          <div className="p-10">
            <div className="border-2 border-dashed border-primary/30 rounded-xl bg-slate-50 dark:bg-background-dark/50 p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-primary/5 transition-colors group">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-primary text-4xl">upload_file</span>
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Arraste seu arquivo Excel aqui</h3>
              <p className="text-slate-500 mb-6 max-w-sm">Certifique-se que o arquivo segue o modelo padrão de colunas do sistema (.xlsx ou .xls)</p>
              <button className="bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-8 rounded-lg transition-colors">
                Selecionar Arquivo
              </button>
            </div>
          </div>
        </div>

        {/* Validation Panel */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">analytics</span>
              Resumo da Validação Previa
            </h2>
            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold uppercase tracking-wide">Aguardando Confirmação</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Stat Card */}
            <div className="bg-white dark:bg-background-dark p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <p className="text-slate-500 text-sm font-medium mb-1">Programas</p>
              <div className="flex items-end justify-between">
                <h4 className="text-3xl font-bold text-primary">12</h4>
                <span className="material-symbols-outlined text-slate-300">account_tree</span>
              </div>
              <p className="text-xs text-emerald-600 mt-2 font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">check_circle</span> Todos válidos
              </p>
            </div>
            {/* Stat Card */}
            <div className="bg-white dark:bg-background-dark p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <p className="text-slate-500 text-sm font-medium mb-1">Ações Importadas</p>
              <div className="flex items-end justify-between">
                <h4 className="text-3xl font-bold text-primary">148</h4>
                <span className="material-symbols-outlined text-slate-300">list_alt</span>
              </div>
              <p className="text-xs text-emerald-600 mt-2 font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">check_circle</span> Estrutura correta
              </p>
            </div>
            {/* Stat Card */}
            <div className="bg-white dark:bg-background-dark p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <p className="text-slate-500 text-sm font-medium mb-1">Indicadores</p>
              <div className="flex items-end justify-between">
                <h4 className="text-3xl font-bold text-primary">34</h4>
                <span className="material-symbols-outlined text-slate-300">monitoring</span>
              </div>
              <p className="text-xs text-slate-500 mt-2 font-medium flex items-center gap-1">
                Métricas vinculadas
              </p>
            </div>
            {/* Stat Card (Alert) */}
            <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-xl shadow-sm border border-amber-200 dark:border-amber-800/50">
              <p className="text-amber-700 dark:text-amber-500 text-sm font-bold mb-1">Possíveis Inconsistências</p>
              <div className="flex items-end justify-between">
                <h4 className="text-3xl font-bold text-amber-600">03</h4>
                <span className="material-symbols-outlined text-amber-400">warning</span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-500 mt-2 font-medium">Requer atenção manual</p>
            </div>
          </div>

          {/* Alert Details */}
          <div className="bg-white dark:bg-background-dark rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 dark:text-slate-300">Detalhes dos Alertas</h3>
              <button className="text-primary text-sm font-bold hover:underline">Ver todos</button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              <div className="px-6 py-4 flex gap-4 items-start">
                <span className="material-symbols-outlined text-amber-500 mt-0.5">error_outline</span>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">Código de Ação Duplicado</p>
                  <p className="text-sm text-slate-500">A ação 'Pavimentação Urbana' (Cód. 2045) aparece duas vezes no arquivo com valores diferentes.</p>
                </div>
              </div>
              <div className="px-6 py-4 flex gap-4 items-start">
                <span className="material-symbols-outlined text-amber-500 mt-0.5">error_outline</span>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">Indicador sem Unidade de Medida</p>
                  <p className="text-sm text-slate-500">O programa 'Saúde para Todos' possui indicadores sem definição de unidade (%, km, un).</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <button className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
            Voltar
          </button>
          <div className="flex gap-3">
            <button className="px-6 py-2.5 rounded-lg font-bold text-primary hover:bg-primary/5 transition-colors">
              Cancelar Importação
            </button>
            <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-8 rounded-lg shadow-lg shadow-primary/20 transition-all">
              Prosseguir e Revisar
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
      </main>

      {/* Context Footer */}
      <footer className="mt-auto px-6 py-8 lg:px-40 bg-white dark:bg-background-dark border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-400">
          <p>© 2024 Sistema de Gestão Pública. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <a className="hover:text-primary" href="#">Termos de Uso</a>
            <a className="hover:text-primary" href="#">Privacidade</a>
            <a className="hover:text-primary" href="#">Suporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
