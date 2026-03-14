'use client';

import styles from './PPA.module.css';

const stats = [
  { label: 'Total Plurianual', value: 'R$ 2.450.000.000', trend: '+12%', isUp: true },
  { label: 'Programas Ativos', value: '42', trend: '4 Novos', isUp: true },
  { label: 'Metas Físicas', value: '1.240', trend: '85% Atingido', isUp: true },
  { label: 'Divergências LOA', value: '3', trend: '-2 este mês', isUp: false },
];

export default function PPADashboard() {
  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>Dashboard PPA 2024-2027</h1>
          <p className={styles.subtitle}>Gestão e Acompanhamento do Plano Plurianual</p>
        </div>
        <button className="btn-primary">
          + Criar Novo Programa
        </button>
      </div>

      <div className={styles.statsGrid}>
        {stats.map((stat, i) => (
          <div key={i} className={styles.statCard}>
            <span className={styles.label}>{stat.label}</span>
            <span className={styles.value}>{stat.value}</span>
            <span className={`${styles.trend} ${stat.isUp ? styles.trendUp : styles.trendDown}`}>
              {stat.isUp ? '↑' : '↓'} {stat.trend}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.contentArea}>
        <div className={`${styles.mainCard} card`}>
          <h2 className={styles.sectionTitle}>Distribuição por Eixo Estratégico</h2>
          <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fcfcfc', border: '1px dashed #ddd', borderRadius: '8px' }}>
            <span style={{ color: '#999' }}>[Gráfico de Distribuição Orçamentária]</span>
          </div>
        </div>
        
        <div className="card">
          <h2 className={styles.sectionTitle}>Status por Secretaria</h2>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {['Educação', 'Saúde', 'Infraestrutura', 'Segurança'].map(sec => (
              <li key={sec} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span>{sec}</span>
                <span style={{ fontWeight: 600 }}>R$ 450M</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
