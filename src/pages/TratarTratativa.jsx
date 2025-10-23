// src/pages/TratarTratativa.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import Navbar from "../components/Navbar";

export default function TratarTratativa() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tratativa, setTratativa] = useState(null);
  const [loading, setLoading] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [imagem, setImagem] = useState(null);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregarTratativa();
  }, []);

  async function carregarTratativa() {
    const { data, error } = await supabase
      .from("tratativas")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      console.error(error);
      alert("Erro ao carregar tratativa");
    } else {
      setTratativa(data);
    }
  }

  const handleUploadImagem = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const nomeArquivo = `tratativas/${id}-${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("imagens")
      .upload(nomeArquivo, file);

    if (uploadError) {
      console.error(uploadError);
      alert("Erro ao enviar imagem.");
      return;
    }

    const { data: urlData } = supabase.storage
      .from("imagens")
      .getPublicUrl(nomeArquivo);

    setImagem(urlData.publicUrl);
  };

  const salvarTratativa = async () => {
    if (!observacao.trim()) {
      alert("Por favor, descreva a ação realizada.");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("tratativas")
      .update({
        status: "Resolvido",
        descricao_tratativa: observacao,
        imagem_tratativa: imagem,
        data_tratamento: new Date().toISOString(),
      })
      .eq("id", id);

    setLoading(false);

    if (error) {
      console.error(error);
      alert("Erro ao salvar tratativa.");
    } else {
      setMensagem("✅ Tratativa registrada com sucesso!");
      setTimeout(() => navigate("/central"), 1800);
    }
  };

  if (!tratativa)
    return (
      <div className="p-6 text-center text-gray-500">
        <Navbar />
        <p>Carregando dados da tratativa...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md border">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">
          Tratar Ocorrência - {tratativa.motorista_nome}
        </h1>

        {/* Dados da tratativa */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Campo titulo="Motorista" valor={`${tratativa.motorista_nome} (${tratativa.motorista_chapa})`} />
          <Campo titulo="Tipo de Ocorrência" valor={tratativa.tipo_ocorrencia} />
          <Campo titulo="Prioridade" valor={tratativa.prioridade} />
          <Campo titulo="Setor de Origem" valor={tratativa.setor_origem} />
          <Campo titulo="Data do Ocorrido" valor={tratativa.data_ocorrido} />
          <Campo titulo="Hora" valor={tratativa.hora_ocorrida} />
          <Campo titulo="Status Atual" valor={tratativa.status} />
        </div>

        <div className="mb-4">
          <p className="font-semibold text-gray-700 mb-1">Descrição Original</p>
          <textarea
            readOnly
            className="w-full border rounded-lg p-2 bg-gray-100"
            rows="3"
            value={tratativa.descricao || "Sem descrição registrada."}
          />
        </div>

        {/* Observação de tratamento */}
        <div className="mb-4">
          <p className="font-semibold text-gray-700 mb-1">
            Ação ou Observação
          </p>
          <textarea
            className="w-full border rounded-lg p-2"
            rows="4"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Descreva a ação realizada, contato, orientação etc..."
          />
        </div>

        {/* Upload de imagem */}
        <div className="mb-6">
          <p className="font-semibold text-gray-700 mb-2">
            Anexar imagem (opcional)
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={handleUploadImagem}
            className="border p-2 rounded-md"
          />
          {imagem && (
            <img
              src={imagem}
              alt="Preview"
              className="mt-3 w-48 h-auto rounded-md border"
            />
          )}
        </div>

        {mensagem && (
          <div className="bg-green-100 text-green-800 border border-green-300 rounded-md p-2 mb-4">
            {mensagem}
          </div>
        )}

        <div className="flex justify-between">
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded"
          >
            Voltar
          </button>
          <button
            onClick={salvarTratativa}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            {loading ? "Salvando..." : "Salvar Tratativa"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Campo({ titulo, valor }) {
  return (
    <div>
      <p className="font-semibold text-gray-700">{titulo}</p>
      <p className="bg-gray-100 border rounded-lg px-3 py-2">{valor || "-"}</p>
    </div>
  );
}
