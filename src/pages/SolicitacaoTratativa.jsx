import React, { useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

export default function SolicitacaoTratativa() {
  const navigate = useNavigate();

  const [motorista, setMotorista] = useState("");
  const [tipoOcorrencia, setTipoOcorrencia] = useState("");
  const [prioridade, setPrioridade] = useState("Média");
  const [descricao, setDescricao] = useState("");
  const [setorOrigem, setSetorOrigem] = useState("Operação");
  const [imagem, setImagem] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  // Função de upload de imagem para o Storage do Supabase
  const uploadImagem = async (file) => {
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from("tratativas")
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("tratativas")
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err) {
      console.error("Erro no upload da imagem:", err.message);
      return null;
    }
  };

  // Função principal de envio
  const handleSubmit = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setMensagem("");

    try {
      let imagemUrl = null;

      if (imagem) {
        imagemUrl = await uploadImagem(imagem);
      }

      const { data, error } = await supabase.from("tratativas").insert([
        {
          motorista_id: motorista,
          tipo_ocorrencia: tipoOcorrencia,
          prioridade: prioridade,
          descricao: descricao,
          imagem_url: imagemUrl,
          setor_origem: setorOrigem,
          status: "Pendente",
          responsavel: "-",
          created_by_email: "admin@grupocsc.com.br",
        },
      ]);

      if (error) throw error;

      setMensagem("✅ Tratativa registrada com sucesso!");
      setMotorista("");
      setTipoOcorrencia("");
      setDescricao("");
      setImagem(null);

      setTimeout(() => navigate("/"), 2000); // volta para home
    } catch (err) {
      console.error("Erro ao criar tratativa:", err.message);
      setMensagem("❌ Erro ao criar tratativa. Verifique os campos.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-md mt-10">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-700">
        📝 Solicitação de Tratativa
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block font-medium mb-1">Motorista (crachá)</label>
          <input
            type="text"
            value={motorista}
            onChange={(e) => setMotorista(e.target.value)}
            className="w-full border rounded p-2"
            required
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Tipo de Ocorrência</label>
          <select
            value={tipoOcorrencia}
            onChange={(e) => setTipoOcorrencia(e.target.value)}
            className="w-full border rounded p-2"
            required
          >
            <option value="">Selecione</option>
            <option value="Excesso de Velocidade">Excesso de Velocidade</option>
            <option value="Uso de Celular">Uso de Celular</option>
            <option value="Avaria">Avaria</option>
            <option value="Outros">Outros</option>
          </select>
        </div>

        <div>
          <label className="block font-medium mb-1">Prioridade</label>
          <select
            value={prioridade}
            onChange={(e) => setPrioridade(e.target.value)}
            className="w-full border rounded p-2"
            required
          >
            <option value="Baixa">Baixa</option>
            <option value="Média">Média</option>
            <option value="Alta">Alta</option>
          </select>
        </div>

        <div>
          <label className="block font-medium mb-1">Setor de Origem</label>
          <select
            value={setorOrigem}
            onChange={(e) => setSetorOrigem(e.target.value)}
            className="w-full border rounded p-2"
            required
          >
            <option value="Operação">Operação</option>
            <option value="Manutenção">Manutenção</option>
            <option value="Telemetria">Telemetria</option>
          </select>
        </div>

        <div>
          <label className="block font-medium mb-1">Descrição</label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="w-full border rounded p-2"
            rows="3"
            required
          ></textarea>
        </div>

        <div>
          <label className="block font-medium mb-1">Imagem (opcional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImagem(e.target.files[0])}
            className="w-full"
          />
        </div>

        <button
          type="submit"
          disabled={carregando}
          className={`w-full py-2 text-white font-semibold rounded ${
            carregando
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {carregando ? "Enviando..." : "Enviar Tratativa"}
        </button>

        {mensagem && (
          <p
            className={`text-center font-medium ${
              mensagem.startsWith("✅") ? "text-green-600" : "text-red-600"
            }`}
          >
            {mensagem}
          </p>
        )}
      </form>

      <button
        onClick={() => navigate("/")}
        className="mt-6 text-blue-600 hover:underline text-sm"
      >
        ← Voltar para Início
      </button>
    </div>
  );
}
