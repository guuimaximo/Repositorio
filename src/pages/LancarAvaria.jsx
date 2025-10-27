// src/pages/LancarAvaria.jsx
// (Atualizado com useEffect e <select> para Prefixos e Motoristas)

import React, { useState, useMemo, useEffect } from 'react'; // Adicionado useEffect
import { supabase } from '../supabase';
// ... (outros imports)

// --- Componente OrcamentoLinha (sem alterações) ---
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
  // --- Estados do Formulário ---
  const [formData, setFormData] = useState({
    prefixo: '',
    motoristaId: '', // Opcional
    dataAvaria: '',
    tipoOcorrencia: '', 
    descricao: '',
  });

  // --- Estados das Listas (Dropdowns) ---
  const [prefixos, setPrefixos] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [loadingListas, setLoadingListas] = useState(true);

  // --- Seção 3: Orçamento ---
  const [pecas, setPecas] = useState([]);
  const [servicos, setServicos] = useState([]);

  // --- Seção 4: Arquivos ---
  const [arquivos, setArquivos] = useState([]);
  const [loading, setLoading] = useState(false);

  
  // --- Carregar Listas (Dropdowns) do Supabase ---
  useEffect(() => {
    async function carregarListas() {
      setLoadingListas(true);

      // Busca Prefixos (Suposição: coluna 'codigo_prefixo')
      const { data: prefixosData, error: prefixosError } = await supabase
        .from('prefixos')
        .select('id, codigo_prefixo') // Ajuste 'codigo_prefixo' se o nome da coluna for outro
        .order('codigo_prefixo', { ascending: true });
      
      // Busca Motoristas (Suposição: colunas 'id' e 'nome')
      const { data: motoristasData, error: motoristasError } = await supabase
        .from('motoristas')
        .select('id, nome') // Ajuste 'nome' se o nome da coluna for outro
        .order('nome', { ascending: true });

      if (prefixosError) console.error('Erro ao buscar prefixos:', prefixosError.message);
      else setPrefixos(prefixosData || []);
      
      if (motoristasError) console.error('Erro ao buscar motoristas:', motoristasError.message);
      else setMotoristas(motoristasData || []);

      setLoadingListas(false);
    }
    carregarListas();
  }, []); // [] = Executa apenas uma vez quando o componente é montado


  // --- Handlers (sem alterações) ---
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  // ... (handlers de peças, serviços, arquivos, e cálculos de total - todos iguais) ...
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

  
  // --- Handler para salvar tudo (sem alterações) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. Upload de arquivos (código igual)
    const uploadedFileUrls = [];
    for (const file of arquivos) {
      // ... (lógica de upload) ...
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('avarias').upload(fileName, file);
      if (uploadError) { /* ... (tratamento de erro) ... */ setLoading(false); return; }
      const { data: urlData } = supabase.storage.from('avarias').getPublicUrl(uploadData.path);
      uploadedFileUrls.push(urlData.publicUrl);
    }

    // 2. Salvar dados na tabela 'avarias' (código igual)
    const { data: avariaData, error: avariaError } = await supabase
      .from('avarias')
      .insert({
        ...formData,
        status: 'Pendente de Aprovação',
        urls_evidencias: uploadedFileUrls,
        valor_total_orcamento: totalOrcamento,
      })
      .select().single();

    if (avariaError) { /* ... (tratamento de erro) ... */ setLoading(false); return; }
    const avariaId = avariaData.id;

    // 3. Salvar itens do orçamento (código igual)
    const orcamentoItens = [
      ...pecas.map(p => ({ ...p, tipo: 'Peca', avaria_id: avariaId, valorUnitario: p.valorUnitario })),
      ...servicos.map(s => ({ ...s, tipo: 'Servico', avaria_id: avariaId, valorUnitario: s.valorUnitario })),
    ];
    const itensParaSalvar = orcamentoItens.map(({ id, valorUnitario, ...rest }) => ({
        ...rest,
        "valorUnitario": valorUnitario
    }));

    const { error: orcamentoError } = await supabase.from('cobrancas_avarias').insert(itensParaSalvar);

    if (orcamentoError) { /* ... (tratamento de erro) ... */ } 
    else { alert('Avaria lançada para aprovação com sucesso!'); }
    setLoading(false);
  };


  return (
    <div className="max-w-7xl mx-auto p-6"> 
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Registrar Lançamento de Avaria</h1>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* --- Seção 1 & 2: Identificação e Detalhes --- */}
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3 text-gray-700 border-b pb-2">Identificação e Detalhes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* --- CAMPO PREFIXO (MODIFICADO) --- */}
            <div className="flex flex-col">
              <label htmlFor="prefixo" className="mb-1 text-sm font-medium text-gray-600">Prefixo</label>
              <select
                name="prefixo"
                id="prefixo"
                className="border rounded-md px-3 py-2 bg-white" // Adicionado bg-white
                onChange={handleFormChange}
                value={formData.prefixo} // Controlado pelo state
                required
                disabled={loadingListas} // Desabilitado enquanto carrega
              >
                <option value="">{loadingListas ? 'Carregando...' : 'Selecione um prefixo'}</option>
                {/* Suposição: usando 'codigo_prefixo' como valor e texto */}
                {prefixos.map(p => (
                  <option key={p.id} value={p.codigo_prefixo}>{p.codigo_prefixo}</option>
                ))}
              </select>
            </div>

            {/* --- CAMPO MOTORISTA (MODIFICADO) --- */}
            <div className="flex flex-col">
              <label htmlFor="motoristaId" className="mb-1 text-sm font-medium text-gray-600">Motorista (Opcional)</label>
              <select
                name="motoristaId"
                id="motoristaId"
                className="border rounded-md px-3 py-2 bg-white" // Adicionado bg-white
                onChange={handleFormChange}
                value={formData.motoristaId} // Controlado pelo state
                disabled={loadingListas} // Desabilitado enquanto carrega
                // 'required' foi removido
              >
                <option value="">{loadingListas ? 'Carregando...' : 'Selecione (Opcional)'}</option>
                {/* Suposição: usando 'id' como valor e 'nome' como texto */}
                {motoristas.map(m => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>

            {/* --- CAMPO DATA (SEM ALTERAÇÃO) --- */}
            <div className="flex flex-col">
              <label htmlFor="dataAvaria" className="mb-1 text-sm font-medium text-gray-600">Data e Hora da Avaria</label>
              <input type="datetime-local" name="dataAvaria" id="dataAvaria" className="border rounded-md px-3 py-2" onChange={handleFormChange} required />
            </div>

            {/* --- CAMPO TIPO OCORRÊNCIA (MODIFICAR DEPOIS?) --- */}
            {/* (Por enquanto, permanece como input de texto) */}
            <div className="flex flex-col">
              <label htmlFor="tipoOcorrencia" className="mb-1 text-sm font-medium text-gray-600">Tipo de Ocorrência</label>
              <input type="text" name="tipoOcorrencia" id="tipoOcorrencia" className="border rounded-md px-3 py-2" onChange={handleFormChange} required />
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
          {/* ... (código do orçamento igual) ... */}
          <h2 className="text-lg font-semibold mb-3 text-gray-700 border-b pb-2">Orçamento de Reparo</h2>
          {/* ... Peças ... */}
          {/* ... Mão de Obra ... */}
          {/* ... Total ... */}
        </div>

        {/* --- Seção 4: Evidências (Upload) (Sem alterações) --- */}
        <div className="bg-white shadow rounded-lg p-4">
          {/* ... (código do upload igual) ... */}
        </div>

        {/* --- Seção 5: Ações (Sem alterações) --- */}
        <div className="flex justify-end gap-4 pt-4">
          {/* ... (botões Limpar e Salvar iguais) ... */}
          <button type="submit" disabled={loading || loadingListas} className="ml-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
            {loading ? 'Salvando...' : 'Enviar para Aprovação'}
          </button>
        </div>

      </form>
    </div>
  );
}
