'use client';

import { useState } from 'react';
import Modal from '@/components/Modal/Modal';
import styles from './Secretarias.module.css';
import formStyles from '@/styles/forms.module.css';

const initialSecretarias = [
  { id: 'SEC-01', nome: 'Secretaria de Educação', responsavel: 'Maria Oliveira', email: 'educacao@municipio.gov.br', status: 'Ativo' },
  { id: 'SEC-02', nome: 'Secretaria de Saúde', responsavel: 'João Souza', email: 'saude@municipio.gov.br', status: 'Ativo' },
  { id: 'SEC-03', nome: 'Secretaria de Infrastructure', responsavel: 'Carlos Lima', email: 'obras@municipio.gov.br', status: 'Inativo' },
  { id: 'SEC-04', nome: 'Secretaria de Segurança', responsavel: 'Ana Rocha', email: 'seguranca@municipio.gov.br', status: 'Ativo' },
];

export default function SecretariasPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [secretarias, setSecretarias] = useState(initialSecretarias);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Secretarias</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gerencie os departamentos e unidades orçamentárias</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          + Adicionar Secretaria
        </button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome</th>
              <th>Responsável</th>
              <th>E-mail</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {secretarias.map((s) => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.id}</td>
                <td>{s.nome}</td>
                <td>{s.responsavel}</td>
                <td>{s.email}</td>
                <td>
                  <span className={`${styles.badge} ${s.status === 'Ativo' ? styles.badgeActive : styles.badgeInactive}`}>
                    {s.status}
                  </span>
                </td>
                <td className={styles.actions}>
                  <span className={styles.actionIcon} title="Editar">✏️</span>
                  <span className={styles.actionIcon} title="Excluir">🗑️</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Novo Cadastro de Secretaria"
        onSave={() => setIsModalOpen(false)}
        saveLabel="Salvar Secretaria"
      >
        <div className={formStyles.formGrid}>
          <div className={`${formStyles.formGroup} ${formStyles.fullWidth}`}>
            <label className={formStyles.label}>Nome da Secretaria <span className={formStyles.mandatory}>*</span></label>
            <input type="text" className={formStyles.input} placeholder="Ex: Secretaria de Cultura e Turismo" />
          </div>
          
          <div className={formStyles.formGroup}>
            <label className={formStyles.label}>Código da Unidade Orçamentária</label>
            <input type="text" className={formStyles.input} placeholder="00.00.00" />
          </div>

          <div className={formStyles.formGroup}>
            <label className={formStyles.label}>Status</label>
            <select className={formStyles.input}>
              <option>Ativo</option>
              <option>Inativo</option>
            </select>
          </div>

          <div className={`${formStyles.formGroup} ${formStyles.fullWidth}`} style={{ marginTop: '1rem' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--primary-color)' }}>Dados do Responsável</h4>
          </div>

          <div className={`${formStyles.formGroup} ${formStyles.fullWidth}`}>
            <label className={formStyles.label}>Secretário Responsável</label>
            <input type="text" className={formStyles.input} placeholder="Nome completo" />
          </div>

          <div className={formStyles.formGroup}>
            <label className={formStyles.label}>E-mail de Contato</label>
            <input type="email" className={formStyles.input} placeholder="exemplo@municipio.gov.br" />
          </div>

          <div className={formStyles.formGroup}>
            <label className={formStyles.label}>Telefone</label>
            <input type="text" className={formStyles.input} placeholder="(00) 00000-0000" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
