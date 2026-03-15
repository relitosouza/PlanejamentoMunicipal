-- CreateEnum
CREATE TYPE "PPAStatus" AS ENUM ('RASCUNHO', 'APROVADO', 'VIGENTE', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "ProgramaTipo" AS ENUM ('FINALISTICO', 'GESTAO');

-- CreateEnum
CREATE TYPE "AcaoTipo" AS ENUM ('ATIVIDADE', 'PROJETO', 'OPERACAO_ESPECIAL');

-- CreateEnum
CREATE TYPE "LDOStatus" AS ENUM ('RASCUNHO', 'REVISAO', 'APROVADO', 'VIGENTE');

-- CreateEnum
CREATE TYPE "AcaoLDOStatus" AS ENUM ('PRIORITARIA', 'NORMAL', 'SUSPENSA');

-- CreateEnum
CREATE TYPE "LOAStatus" AS ENUM ('RASCUNHO', 'REVISAO', 'APROVADO', 'VIGENTE');

-- CreateEnum
CREATE TYPE "ImportacaoStatus" AS ENUM ('PROCESSANDO', 'CONCLUIDO', 'ERRO');

-- CreateEnum
CREATE TYPE "AiAnaliseTipo" AS ENUM ('SUGESTAO_LOA', 'ADERENCIA_PPA', 'ALERTA_DESVIO', 'CLASSIFICACAO_MCASP');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SERVIDOR');

-- CreateTable
CREATE TABLE "Municipio" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "populacao" INTEGER,
    "logoUrl" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Municipio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Secretaria" (
    "id" TEXT NOT NULL,
    "municipioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,

    CONSTRAINT "Secretaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PPA" (
    "id" TEXT NOT NULL,
    "municipioId" TEXT NOT NULL,
    "anoInicio" INTEGER NOT NULL,
    "anoFim" INTEGER NOT NULL,
    "status" "PPAStatus" NOT NULL DEFAULT 'RASCUNHO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PPA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Programa" (
    "id" TEXT NOT NULL,
    "ppaId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "objetivo" TEXT NOT NULL,
    "justificativa" TEXT,
    "tipo" "ProgramaTipo" NOT NULL DEFAULT 'FINALISTICO',
    "secretariaId" TEXT NOT NULL,
    "odsIds" INTEGER[],
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Programa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcaoGoverno" (
    "id" TEXT NOT NULL,
    "programaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "metaFisica" DECIMAL(15,2),
    "unidadeMedida" TEXT,
    "tipo" "AcaoTipo" NOT NULL DEFAULT 'ATIVIDADE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcaoGoverno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndicadorDesempenho" (
    "id" TEXT NOT NULL,
    "programaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "valorBase" DECIMAL(15,4),
    "valorMeta" DECIMAL(15,4) NOT NULL,
    "periodicidade" TEXT NOT NULL,
    "fonte" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndicadorDesempenho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LDO" (
    "id" TEXT NOT NULL,
    "municipioId" TEXT NOT NULL,
    "exercicio" INTEGER NOT NULL,
    "ppaId" TEXT NOT NULL,
    "status" "LDOStatus" NOT NULL DEFAULT 'RASCUNHO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LDO_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcaoLDO" (
    "id" TEXT NOT NULL,
    "ldoId" TEXT NOT NULL,
    "acaoGovernoId" TEXT NOT NULL,
    "metaAnual" DECIMAL(15,2),
    "justificativaPrioridade" TEXT,
    "status" "AcaoLDOStatus" NOT NULL DEFAULT 'NORMAL',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcaoLDO_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LOA" (
    "id" TEXT NOT NULL,
    "municipioId" TEXT NOT NULL,
    "exercicio" INTEGER NOT NULL,
    "ldoId" TEXT NOT NULL,
    "totalReceita" DECIMAL(15,2) NOT NULL,
    "status" "LOAStatus" NOT NULL DEFAULT 'RASCUNHO',
    "dataAprovacao" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LOA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dotacao" (
    "id" TEXT NOT NULL,
    "loaId" TEXT NOT NULL,
    "acaoLdoId" TEXT NOT NULL,
    "naturezaDespesaId" TEXT NOT NULL,
    "fonteRecursoId" TEXT NOT NULL,
    "valor" DECIMAL(15,2) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dotacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NaturezaDespesa" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "NaturezaDespesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FonteRecurso" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "FonteRecurso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportacaoHistorico" (
    "id" TEXT NOT NULL,
    "municipioId" TEXT NOT NULL,
    "exercicio" INTEGER NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "totalLinhas" INTEGER NOT NULL DEFAULT 0,
    "status" "ImportacaoStatus" NOT NULL DEFAULT 'PROCESSANDO',
    "erros" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "ImportacaoHistorico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiquidacaoHistorica" (
    "id" TEXT NOT NULL,
    "municipioId" TEXT NOT NULL,
    "exercicio" INTEGER NOT NULL,
    "codigoPrograma" TEXT NOT NULL,
    "codigoAcao" TEXT NOT NULL,
    "naturezaDespesa" TEXT NOT NULL,
    "fonteRecurso" TEXT,
    "secretaria" TEXT,
    "valorLiquidado" DECIMAL(15,2) NOT NULL,
    "importacaoId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiquidacaoHistorica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAnalise" (
    "id" TEXT NOT NULL,
    "municipioId" TEXT NOT NULL,
    "tipo" "AiAnaliseTipo" NOT NULL,
    "contextoJson" JSONB NOT NULL,
    "resultadoTexto" TEXT NOT NULL,
    "modeloClaude" TEXT NOT NULL,
    "tokens" INTEGER,
    "aprovadoPor" TEXT,
    "aprovadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAnalise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "municipioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SERVIDOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "diff" JSONB,
    "usuarioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Municipio_cnpj_key" ON "Municipio"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Programa_ppaId_numero_key" ON "Programa"("ppaId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "AcaoGoverno_programaId_codigo_key" ON "AcaoGoverno"("programaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "LDO_municipioId_exercicio_key" ON "LDO"("municipioId", "exercicio");

-- CreateIndex
CREATE UNIQUE INDEX "AcaoLDO_ldoId_acaoGovernoId_key" ON "AcaoLDO"("ldoId", "acaoGovernoId");

-- CreateIndex
CREATE UNIQUE INDEX "LOA_municipioId_exercicio_key" ON "LOA"("municipioId", "exercicio");

-- CreateIndex
CREATE UNIQUE INDEX "NaturezaDespesa_codigo_key" ON "NaturezaDespesa"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "FonteRecurso_codigo_key" ON "FonteRecurso"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_municipioId_key" ON "Usuario"("email", "municipioId");

-- CreateIndex
CREATE INDEX "AuditLog_entidade_entidadeId_idx" ON "AuditLog"("entidade", "entidadeId");

-- CreateIndex
CREATE INDEX "AuditLog_usuarioId_idx" ON "AuditLog"("usuarioId");

-- AddForeignKey
ALTER TABLE "Secretaria" ADD CONSTRAINT "Secretaria_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "Municipio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PPA" ADD CONSTRAINT "PPA_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "Municipio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Programa" ADD CONSTRAINT "Programa_ppaId_fkey" FOREIGN KEY ("ppaId") REFERENCES "PPA"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Programa" ADD CONSTRAINT "Programa_secretariaId_fkey" FOREIGN KEY ("secretariaId") REFERENCES "Secretaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcaoGoverno" ADD CONSTRAINT "AcaoGoverno_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "Programa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndicadorDesempenho" ADD CONSTRAINT "IndicadorDesempenho_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "Programa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LDO" ADD CONSTRAINT "LDO_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "Municipio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LDO" ADD CONSTRAINT "LDO_ppaId_fkey" FOREIGN KEY ("ppaId") REFERENCES "PPA"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcaoLDO" ADD CONSTRAINT "AcaoLDO_ldoId_fkey" FOREIGN KEY ("ldoId") REFERENCES "LDO"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcaoLDO" ADD CONSTRAINT "AcaoLDO_acaoGovernoId_fkey" FOREIGN KEY ("acaoGovernoId") REFERENCES "AcaoGoverno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LOA" ADD CONSTRAINT "LOA_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "Municipio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LOA" ADD CONSTRAINT "LOA_ldoId_fkey" FOREIGN KEY ("ldoId") REFERENCES "LDO"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dotacao" ADD CONSTRAINT "Dotacao_loaId_fkey" FOREIGN KEY ("loaId") REFERENCES "LOA"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dotacao" ADD CONSTRAINT "Dotacao_acaoLdoId_fkey" FOREIGN KEY ("acaoLdoId") REFERENCES "AcaoLDO"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dotacao" ADD CONSTRAINT "Dotacao_naturezaDespesaId_fkey" FOREIGN KEY ("naturezaDespesaId") REFERENCES "NaturezaDespesa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dotacao" ADD CONSTRAINT "Dotacao_fonteRecursoId_fkey" FOREIGN KEY ("fonteRecursoId") REFERENCES "FonteRecurso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportacaoHistorico" ADD CONSTRAINT "ImportacaoHistorico_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "Municipio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportacaoHistorico" ADD CONSTRAINT "ImportacaoHistorico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidacaoHistorica" ADD CONSTRAINT "LiquidacaoHistorica_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "Municipio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidacaoHistorica" ADD CONSTRAINT "LiquidacaoHistorica_importacaoId_fkey" FOREIGN KEY ("importacaoId") REFERENCES "ImportacaoHistorico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAnalise" ADD CONSTRAINT "AiAnalise_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "Municipio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAnalise" ADD CONSTRAINT "AiAnalise_aprovadoPor_fkey" FOREIGN KEY ("aprovadoPor") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "Municipio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
