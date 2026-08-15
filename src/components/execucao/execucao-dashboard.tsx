'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface DashboardRow {
  nome: string
  dotado: number
  realizado: number
  historicoMedio: number
}

interface ExecucaoDashboardProps {
  data: DashboardRow[]
  exercicio: number
}

const COLORS = { dotado: '#1c385f', realizado: '#3b82f6', historicoMedio: '#94a3b8' }

export function ExecucaoDashboard({ data, exercicio }: ExecucaoDashboardProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <span className="material-symbols-outlined text-slate-300 text-5xl">bar_chart</span>
        <p className="text-slate-500 mt-4">Nenhum dado de execução disponível para {exercicio}.</p>
        <p className="text-sm text-slate-400 mt-2">Importe o histórico e a execução mensal para ver os gráficos.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="font-bold text-slate-700 mb-6">Planejado × Realizado × Histórico Médio</h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
          <Legend />
          <Bar dataKey="dotado" name="Dotado LOA" fill={COLORS.dotado} radius={[3, 3, 0, 0]} />
          <Bar dataKey="realizado" name="Realizado 2027" fill={COLORS.realizado} radius={[3, 3, 0, 0]} />
          <Bar dataKey="historicoMedio" name="Histórico Médio" fill={COLORS.historicoMedio} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
