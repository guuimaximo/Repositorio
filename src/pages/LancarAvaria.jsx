// src/pages/LancarAvaria.jsx
// (Com campo "Número da Avaria" inserido)

import React, { useState, useMemo } from 'react';
import { supabase } from '../supabase';
import CampoMotorista from '../components/CampoMotorista';
import CampoPrefixo from '../components/CampoPrefixo';

// --- Componente OrcamentoLinha (Item do Orçamento) ---
function OrcamentoLinha({ item, index, onRemove, onChange }) {
  const totalLinha = (item.qtd || 0) * (item.valorUnitario || 0);
  
  return (
    <div className="grid grid-cols-12 gap-3 mb-2 items-center">
      <input
        type="text"
        placeholder="Descrição do item"
        className="col-span-5 border rounded-md px-3 py-2"
        value={item.descricao}
        onChange={(e) => onChange(index, 'descricao', e.target.value)}
      />
      <input
        type="number"
        placeholder="Qtd"
        className="col-span-2 border rounded-md px-3 py-2"
        value={item.qtd}
        min="0"
        onChange={(e) => onChange(index, 'qtd', parseFloat(e.target.value))}
      />
      <input
        type="number"
        placeholder="Vl. Unitário"
        className="col-span-2 border rounded-md px-3 py-2"
        value={item.valorUnitario}
        min="0"
        step="0.01"
        onChange={(e) => onChange(index, 'valorUnitario', parseFloat(e.target.value))}
      />
      <span className="col-span-2 p-2 text-right font-medium text-gray-700">
        {totalLinha.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </span>
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="col-span-1 text-red-500 hover:text-red-700 font-bold"
      >
        X
      </button>
    </div>
  );
}

export default function LancarAvaria() {

  // --- Estados do formulário (NOVO CAMPO INCLUÍDO) ---
  const [formData, setFormData] = useState({
    dataAvaria: '',
    tipoOcorrencia: '',
    descricao: '',
    numero_da_avaria: ''   // <<< ADICIONADO AQUI
  });

  // Prefixo e Motorista
  const [prefixo, setPrefixo] = useState('');
  const [motorista, setMotorista] = useState({ chapa: '', nome: '' });

  // Itens
  const [pecas, setPecas] = useState([]);
  const [servicos, setServicos] = useState([]);

  // Uploads
  const [arquivos, setArquivos] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- Alterações simples ---
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddPeca = () => setPecas([...pecas, { id: Date.now(), descricao: '', qtd: 1, valorUnitario: 0 }]);
  const handleRemovePeca = (i) => setPecas(pecas.filter((_, idx) => idx !== i));
  const handleChangePeca = (i, field, value) => {
    const arr = [...pecas];
    arr[i][field] = value;
    setPecas(arr);
  };

  const handleAddServico = () => setServicos([...servicos, { id: Date.now(), descricao: '', qtd: 1, valorUnitario: 0 }]);
  const handleRemoveServico = (i) => setServicos(servicos.filter((_, idx) => idx !== i));
  const handleChangeServico = (i, field, value) => {
    const arr = [...servicos];
    arr[i][field] = value;
    setServicos(arr);
  };

  const totalPecas = useMemo(() => pecas.reduce((t, p) => t + p.qtd * p.valorUnitario, 0), [pecas]);
  const totalServicos = useMemo(() => servicos.reduce((t, s) => t + s.qtd * s.valorUnitario, 0), [servicos]);
  const totalOrcamento = totalPecas + totalServicos;

  const handleFileChange = (e) => setArquivos([...e.target.files]);

  // --- SALVAR AVARIA ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Upload
    const uploadedUrls = [];
    for (const file of arquivos) {
      const name = `${Date.now()}_${file.name}`;
      const { data: uploadData, error } = await supabase.storage.from('avarias').upload(name, file);
      if (error) { alert(error.message); setLoading(false); return; }
      const { data: url } = supabase.storage.from('avarias').getPublicUrl(uploadData.path);
      uploadedUrls.push(url.publicUrl);
    }

    // Motorista
    const motoristaString = motorista.chapa || motorista.nome
      ? [motorista.chapa, motorista.nome].filter(Boolean).join(' - ')
      : null;

    // INSERT
    const { data: avariaData, error: avariaError } = await supabase
      .from('avarias')
      .insert({
        ...formData,                     // <<< INCLUI numero_da_avaria
        prefixo,
        motoristaId: motoristaString,
        status: 'Pendente de Aprovação',
        urls_evidencias: uploadedUrls,
        valor_total_orcamento: totalOrcamento,
      })
      .select()
      .single();

    if (avariaError) {
      alert(avariaError.message);
      setLoading(false);
      return;
    }

    const avariaId = avariaData.id;

    // Itens
    const itens = [
      ...pecas.map(p => ({ ...p, tipo: 'Peca', avaria_id: avariaId })),
      ...servicos.map(s => ({ ...s, tipo: 'Servico', avaria_id: avariaId }))
    ];

    await supabase.from('cobrancas_avarias').insert(itens);

    alert("Avaria lançada com sucesso!");
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Registrar Lançamento de Avaria</h1>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* IDENTIFICAÇÃO */}
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3 text-gray-700 border-b pb-2">
            Identificação e Detalhes
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <CampoPrefixo value={prefixo} onChange={setPrefixo} label="Prefixo" />

            <CampoMotorista value={motorista} onChange={setMotorista} label="Motorista (Opcional)" />

            {/* DATA */}
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">Data e Hora da Avaria</label>
              <input
                type="datetime-local"
                name="dataAvaria"
                className="border rounded-md px-3 py-2"
                value={formData.dataAvaria}
                onChange={handleFormChange}
                required
              />
            </div>

            {/* TIPO OCORRÊNCIA */}
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">Tipo de Ocorrência</label>
              <input
                type="text"
                name="tipoOcorrencia"
                className="border rounded-md px-3 py-2"
                value={formData.tipoOcorrencia}
                onChange={handleFormChange}
                required
              />
            </div>

            {/* 🔥 NOVO CAMPO — NÚMERO DA AVARIA */}
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">Número da Avaria</label>
              <input
                type="text"
                name="numero_da_avaria"
                className="border rounded-md px-3 py-2"
                placeholder="Ex: 12345 / 2025"
                value={formData.numero_da_avaria}
                onChange={handleFormChange}
              />
            </div>

            {/* DESCRIÇÃO */}
            <div className="flex flex-col md:col-span-3">
              <label className="text-sm text-gray-600 mb-1">Descrição</label>
              <textarea
                name="descricao"
                rows="3"
                className="border rounded-md px-3 py-2"
                value={formData.descricao}
                onChange={handleFormChange}
              />
            </div>
          </div>
        </div>

        {/* OUTRAS SEÇÕES PERMANECEM IGUAIS */}
        {/* Orçamento + Upload + Enviar */}

        {/* AÇÕES */}
        <div className="flex justify-end gap-4 pt-4">
          <button type="submit" disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md">
            {loading ? "Salvando..." : "Enviar para Aprovação"}
          </button>
        </div>

      </form>
    </div>
  );
}
