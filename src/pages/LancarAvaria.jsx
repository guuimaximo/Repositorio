// src/pages/LancarAvaria.jsx
// (Atualizado com CampoMotorista, CampoPrefixo e <select> para TipoOcorrencia)

import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../supabase';
import CampoMotorista from '../components/CampoMotorista'; // Importado
import CampoPrefixo from '../components/CampoPrefixo';     // Importado

// --- Componente OrcamentoLinha (Item do Orçamento) ---
// (Sem alterações)
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


// --- Componente Principal da Página ---
export default function LancarAvaria() {
  
  // --- Estados do Formulário ---
  const [formData, setFormData] = useState({
    // prefixo e motorista são controlados por states separados
    dataAvaria: '',
    tipoOcorrencia: '',
    descricao: '',
  });
  
  // States separados para os componentes de busca (igual ao seu SolicitacaoTratativa)
  const [prefixo, setPrefixo] = useState(''); // Controla CampoPrefixo
  const [motorista, setMotorista] = useState({ chapa: '', nome: '' }); // Controla CampoMotorista

  // --- Estados das Listas (Dropdowns) ---
  const [tiposOcorrencia, setTiposOcorrencia] = useState([]);
  const [loadingListas, setLoadingListas] = useState(true);

  // --- Estados do Orçamento ---
  const [pecas, setPecas] = useState([]);
  const [servicos, setServicos] = useState([]);

  // --- Estados de Upload e Loading ---
  const [arquivos, setArquivos] = useState([]);
  const [loading, setLoading] = useState(false);


  // --- EFEITO: Carregar Listas (Tipos de Ocorrência) ---
  useEffect(() => {
    async function carregarListas() {
      setLoadingListas(true);
      const { data: tiposData, error: tiposError } = await supabase
        .from('tipos_ocorrencia')
        .select('id, nome')
        .order('nome', { ascending: true });

      if (tiposError) console.error('Erro ao buscar tipos de ocorrência:', tiposError.message);
      else setTiposOcorrencia(tiposData || []);
      
      setLoadingListas(false);
    }
    carregarListas();
  }, []);


  // --- Handlers do Formulário ---
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ... (Handlers de Orçamento, Arquivos e Cálculos - Sem alterações) ...
  const handleAddPeca = () => setPecas([...pecas, { id: Date.now(), descricao: '', qtd: 1, valorUnitario: 0 }]);
  const handleRemovePeca = (index) => setPecas(pecas.filter((_, i) => i !== index));
  const handleChangePeca = (index, field, value) => { /* ...código... */ };
  const handleAddServico = () => setServicos([...servicos, { id: Date.now(), descricao: '', qtd: 1, valorUnitario: 0 }]);
  const handleRemoveServico = (index) => setServicos(servicos.filter((_, i) => i !== index));
  const handleChangeServico = (index, field, value) => { /* ...código... */ };
  const handleFileChange = (e) => setArquivos([...e.target.files]);
  const calcularTotal = (lista) => lista.reduce((acc, item) => acc + (item.qtd || 0) * (item.valorUnitario || 0), 0);
  const totalPecas = useMemo(() => calcularTotal(pecas), [pecas]);
  const totalServicos = useMemo(() => calcularTotal(servicos), [servicos]);
  const totalOrcamento = totalPecas + totalServicos;

  
  // --- Handler para salvar tudo (MODIFICADO) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. Upload de arquivos (Sem alteração)
    const uploadedFileUrls = [];
    for (const file of arquivos) {
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('avarias').upload(fileName, file);
      if (uploadError) { alert('Falha no upload: ' + uploadError.message); setLoading(false); return; }
      const { data: urlData } = supabase.storage.from('avarias').getPublicUrl(uploadData.path);
      uploadedFileUrls.push(urlData.publicUrl);
    }

    // 2. Salvar dados na tabela 'avarias' (LÓGICA DO MOTORISTA AJUSTADA)
    
    // Converte o objeto motorista em uma string única (Ex: "12345 - João Silva")
    // Se chapa e nome estiverem vazios (opcional), salva como null.
    const motoristaString = (motorista.chapa || motorista.nome)
      ? [motorista.chapa, motorista.nome].filter(Boolean).join(' - ')
      : null;

    const { data: avariaData, error: avariaError } = await supabase
      .from('avarias')
      .insert({
        ...formData, // dataAvaria, tipoOcorrencia, descricao
        prefixo: prefixo, // Salva o prefixo do state 'prefixo'
        "motoristaId": motoristaString, // Salva a string combinada
        status: 'Pendente de Aprovação',
        urls_evidencias: uploadedFileUrls,
        valor_total_orcamento: totalOrcamento,
      })
      .select().single();

    if (avariaError) {
      console.error('Erro ao salvar avaria:', avariaError);
      alert('Falha ao salvar avaria: ' + avariaError.message);
      setLoading(false);
      return;
    }

    const avariaId = avariaData.id;

    // 3. Salvar itens do orçamento (Sem alteração)
    const orcamentoItens = [
      ...pecas.map(p => ({ ...p, tipo: 'Peca', avaria_id: avariaId, valorUnitario: p.valorUnitario })),
      ...servicos.map(s => ({ ...s, tipo: 'Servico', avaria_id: avariaId, valorUnitario: s.valorUnitario })),
    ];
    const itensParaSalvar = orcamentoItens.map(({ id, valorUnitario, ...rest }) => ({
        ...rest,
        "valorUnitario": valorUnitario
    }));

    const { error: orcamentoError } = await supabase.from('cobrancas_avarias').insert(itensParaSalvar);

    if (orcamentoError) { alert('Falha ao salvar itens do orçamento: ' + orcamentoError.message); } 
    else { alert('Avaria lançada para aprovação com sucesso!'); }

    setLoading(false);
  };


  // --- RENDERIZAÇÃO (JSX) ---
  return (
    <div className="max-w-7xl mx-auto p-6"> 
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Registrar Lançamento de Avaria</h1>

      {/* Usamos 'onSubmit' no form, e não 'onClick' no botão */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* --- Seção 1 & 2: Identificação e Detalhes --- */}
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3 text-gray-700 border-b pb-2">Identificação e Detalhes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* --- CAMPO PREFIXO (MODIFICADO) --- */}
            {/* (Usa o novo componente CampoPrefixo) */}
            <CampoPrefixo 
              value={prefixo} 
              onChange={setPrefixo} 
              label="Prefixo"
            />

            {/* --- CAMPO MOTORISTA (MODIFICADO) --- */}
            {/* (Usa o componente CampoMotorista) */}
            <CampoMotorista 
              value={motorista} 
              onChange={setMotorista} 
              label="Motorista (Opcional)"
            />

            {/* --- CAMPO DATA (SEM ALTERAÇÃO) --- */}
            <div className="flex flex-col">
              <label htmlFor="dataAvaria" className="mb-1 text-sm font-medium text-gray-600">Data e Hora da Avaria</label>
              <input type="datetime-local" name="dataAvaria" id="dataAvaria" className="border rounded-md px-3 py-2" onChange={handleFormChange} required />
            </div>

            {/* --- CAMPO TIPO OCORRÊNCIA (MODIFICADO) --- */}
            <div className="flex flex-col">
              <label htmlFor="tipoOcorrencia" className="mb-1 text-sm font-medium text-gray-600">Tipo de Ocorrência</label>
              <select
                name="tipoOcorrencia"
                id="tipoOcorrencia"
                className="border rounded-md px-3 py-2 bg-white"
                onChange={handleFormChange}
                value={formData.tipoOcorrencia}
                required
                disabled={loadingListas}
              >
                <option value="">{loadingListas ? 'Carregando...' : 'Selecione...'}</option>
                {tiposOcorrencia.map(t => (
                  <option key={t.id} value={t.nome}>{t.nome}</option>
                ))}
              </select>
            </div>

            {/* --- CAMPO DESCRIÇÃO (SEM ALTERAÇÃO) --- */}
            <div className="flex flex-col md:col-span-3">
              <label htmlFor="descricao" className="mb-1 text-sm font-medium text-gray-600">Descrição da Avaria (Relato)</label>
              <textarea
                name="descricao"
                id="descricao"
                rows="4"
                className="border rounded-md px-3 py-2"
                placeholder="Descreva o que foi identificado pela manutenção..."
                onChange={handleFormChange}
              ></textarea>
            </div>
          </div>
        </div>

        {/* --- Seção 3: Orçamento de Reparo (Sem alterações) --- */}
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3 text-gray-700 border-b pb-2">Orçamento de Reparo</h2>
          {/* Subseção: Peças */}
          <div>
            <h3 className="text-base font-semibold mb-3 text-gray-700">Peças</h3>
            <div className="grid grid-cols-12 gap-3 mb-2 px-2 text-sm font-bold text-gray-500">
              <span className="col-span-5">Item/Peça</span>
              <span className="col-span-2">Qtd</span>
              <span className="col-span-2">Vl. Unitário</span>
              <span className="col-span-2 text-right">Total</span>
              <span className="col-span-1">Ação</span>
            </div>
            {pecas.map((item, index) => (
              <OrcamentoLinha key={item.id} item={item} index={index} onRemove={handleRemovePeca} onChange={handleChangePeca} />
            ))}
            <button type="button" onClick={handleAddPeca} className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
              + Adicionar Peça
            </button>
            <div className="text-right font-bold mt-2 pr-14 text-gray-800">
              Total Peças: {totalPecas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </div>
          <hr className="my-6 border-gray-200" />
          {/* Subseção: Mão de Obra */}
          <div>
            <h3 className="text-base font-semibold mb-3 text-gray-700">Mão de Obra / Serviços</h3>
             <div className="grid grid-cols-12 gap-3 mb-2 px-2 text-sm font-bold text-gray-500">
              <span className="col-span-5">Serviço</span>
              <span className="col-span-2">Qtd/Horas</span>
              <span className="col-span-2">Vl. Unitário</span>
              <span className="col-span-2 text-right">Total</span>
              <span className="col-span-1">Ação</span>
            </div>
            {servicos.map((item, index) => (
              <OrcamentoLinha key={item.id} item={item} index={index} onRemove={handleRemoveServico} onChange={handleChangeServico} />
            ))}
            <button type="button" onClick={handleAddServico} className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
              + Adicionar Serviço
            </button>
            <div className="text-right font-bold mt-2 pr-14 text-gray-800">
              Total M.O.: {totalServicos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </div>
          {/* Totalizador Geral */}
          <div className="text-right text-xl font-bold mt-6 pt-4 border-t border-gray-200 text-gray-900">
            Total do Orçamento: {totalOrcamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
        </div>

        {/* --- Seção 4: Evidências (Upload) (Sem alterações) --- */}
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3 text-gray-700 border-b pb-2">Evidências (Fotos e Vídeos)</h2>
          <label
            htmlFor="file-upload"
            className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Clique para enviar</span> ou arraste e solte</p>
              <p className="text-xs text-gray-500">Imagens (PNG, JPG) ou Vídeos (MP4, MOV)</p>
            </div>
            <input id="file-upload" type="file" className="hidden" multiple onChange={handleFileChange} accept="image/*,video/*" />
          </label>
          {arquivos.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-700">Arquivos selecionados:</h4>
              <ul className="list-disc list-inside text-gray-600">
                {Array.from(arquivos).map((file, index) => (
                  <li key={index}>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* --- Seção 5: Ações (Sem alterações) --- */}
        <div className="flex justify-end gap-4 pt-4">
          <button type="button" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
            Limpar
          </button>
          <button
            type="submit"
            disabled={loading || loadingListas}
            className="ml-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Salvando...' : 'Enviar para Aprovação'}
          </button>
        </div>

      </form>
    </div>
  );
}
