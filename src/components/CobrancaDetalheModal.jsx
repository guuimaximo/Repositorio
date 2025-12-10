// src/components/CobrancaDetalheModal.jsx
// Versão simplificada e estável:
// - Mostra detalhes básicos da avaria
// - Permite editar motorista, valor cobrado e observações
// - Dispara onAtualizarStatus para Pendente / Cobrada / Cancelada

import React, { useState } from "react";

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(
    typeof value === "string"
      ? value.replace(/\./g, "").replace(",", ".")
      : value
  );
  if (Number.isNaN(num)) return "";
  return num.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const parseCurrencyToNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const cleaned = value.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? null : num;
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
};

export default function CobrancaDetalheModal({
  avaria,
  onClose,
  onAtualizarStatus,
}) {
  if (!avaria) return null;

  // Estados locais para edição
  const [motorista, setMotorista] = useState(avaria.motoristaId || "");
  const [valorCobradoInput, setValorCobradoInput] = useState(
    avaria.valor_cobrado != null
      ? String(avaria.valor_cobrado)
      : avaria.valor_total_orcamento != null
      ? String(avaria.valor_total_orcamento)
      : ""
  );
  const [observacoes, setObservacoes] = useState(
    avaria.observacoes_cobranca || avaria.observacoes || ""
  );
  const [dataCobranca, setDataCobranca] = useState(
    avaria.data_cobranca
      ? avaria.data_cobranca.substring(0, 10)
      : new Date().toISOString().substring(0, 10)
  );
  const [salvando, setSalvando] = useState(false);

  const statusAtual = avaria.status_cobranca || "Pendente";

  const handleSalvarComStatus = async (novoStatus) => {
    const valorNumerico = parseCurrencyToNumber(valorCobradoInput);

    if (novoStatus === "Cobrada" && (valorNumerico === null || valorNumerico <= 0)) {
      alert("Informe um valor cobrado válido antes de marcar como Cobrada.");
      return;
    }

    setSalvando(true);
    try {
      const updateData = {
        status_cobranca: novoStatus,
        motoristaId: motorista || null,
        valor_cobrado: valorNumerico,
        data_cobranca: dataCobranca || null,
        observacoes_cobranca: observacoes || null,
      };

      await onAtualizarStatus(avaria.id, novoStatus, updateData);
    } finally {
      setSalvando(false);
    }
  };

  const handleSalvarRascunho = async () => {
    setSalvando(true);
    try {
      const valorNumerico = parseCurrencyToNumber(valorCobradoInput);

      const updateData = {
        status_cobranca: statusAtual, // mantém o status atual (normalmente Pendente)
        motoristaId: motorista || null,
        valor_cobrado: valorNumerico,
        data_cobranca: dataCobranca || null,
        observacoes_cobranca: observacoes || null,
      };

      await onAtualizarStatus(avaria.id, statusAtual, updateData);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Cobrança de Avaria #{avaria.numero_da_avaria || avaria.id}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Status atual:{" "}
              <span
                className={
                  statusAtual === "Cobrada"
                    ? "text-green-700 font-semibold"
                    : statusAtual === "Cancelada"
                    ? "text-red-700 font-semibold"
                    : "text-yellow-700 font-semibold"
                }
              >
                {statusAtual}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Corpo */}
        <div className="px-6 py-4 space-y-4">
          {/* Linha básica de identificação */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="block text-gray-500 text-xs">Prefixo</span>
              <span className="font-semibold text-gray-800">
                {avaria.prefixo || "-"}
              </span>
            </div>
            <div>
              <span className="block text-gray-500 text-xs">
                Tipo de Avaria
              </span>
              <span className="font-semibold text-gray-800">
                {avaria.tipoOcorrencia || "-"}
              </span>
            </div>
            <div>
              <span className="block text-gray-500 text-xs">
                Data da Avaria
              </span>
              <span className="font-semibold text-gray-800">
                {formatDate(avaria.dataAvaria || avaria.data_avaria)}
              </span>
            </div>
          </div>

          {/* Motorista + Datas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">Motorista</label>
              <input
                type="text"
                className="border rounded-md px-2 py-1 text-sm"
                value={motorista}
                onChange={(e) => setMotorista(e.target.value)}
                placeholder="ID ou nome do motorista"
              />
            </div>

            <div>
              <span className="block text-gray-500 text-xs">
                Data Aprovação
              </span>
              <span className="font-semibold text-gray-800">
                {formatDate(avaria.aprovado_em)}
              </span>
            </div>

            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">
                Data da Cobrança
              </label>
              <input
                type="date"
                className="border rounded-md px-2 py-1 text-sm"
                value={dataCobranca}
                onChange={(e) => setDataCobranca(e.target.value)}
              />
            </div>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="block text-gray-500 text-xs">Valor Orçado</span>
              <span className="font-semibold text-gray-800">
                {formatCurrency(avaria.valor_total_orcamento)}
              </span>
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">
                Valor a Cobrar / Cobrado
              </label>
              <input
                type="text"
                className="border rounded-md px-2 py-1 text-sm"
                value={valorCobradoInput}
                onChange={(e) => setValorCobradoInput(e.target.value)}
                placeholder="Ex: 1.234,56"
              />
              <span className="text-[10px] text-gray-400 mt-1">
                Aceita vírgula ou ponto, será convertido para número.
              </span>
            </div>
          </div>

          {/* Observações */}
          <div className="flex flex-col text-sm">
            <label className="text-xs text-gray-500 mb-1">
              Observações da Cobrança
            </label>
            <textarea
              className="border rounded-md px-2 py-1 text-sm min-h-[80px]"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Descreva acordos com o motorista, forma de cobrança, etc."
            />
          </div>
        </div>

        {/* Rodapé / Ações */}
        <div className="px-6 py-4 border-t flex flex-wrap gap-2 justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Fechar
          </button>

          <div className="flex flex-wrap gap-2">
            <button
              disabled={salvando}
              onClick={handleSalvarRascunho}
              className="px-4 py-2 rounded-md text-sm bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-60"
            >
              💾 Salvar rascunho
            </button>

            <button
              disabled={salvando}
              onClick={() => handleSalvarComStatus("Cancelada")}
              className="px-4 py-2 rounded-md text-sm bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-60"
            >
              ❌ Cancelar cobrança
            </button>

            <button
              disabled={salvando}
              onClick={() => handleSalvarComStatus("Cobrada")}
              className="px-4 py-2 rounded-md text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
            >
              ✅ Marcar como Cobrada
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
