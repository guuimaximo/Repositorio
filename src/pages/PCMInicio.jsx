// src/pages/PCMInicio.jsx
import { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

/* ==========================
   HELPERS (DATA / CORTE)
========================== */

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

// retorna "YYYY-MM-DD" da data anterior
function subDaysISO(iso, days = 1) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

/**
 * PCM editável até 10:00 do dia seguinte (horário local do navegador)
 * Ex:
 * dataRef = 2026-01-20
 * deadline = 2026-01-21 10:00:00
 */
function canEditPCM(dataRefISO) {
  try {
    if (!dataRefISO) return false;

    const ref = new Date(`${dataRefISO}T00:00:00`);
    const deadline = new Date(ref);
    deadline.setDate(deadline.getDate() + 1);
    deadline.setHours(10, 0, 0, 0);

    return Date.now() <= deadline.getTime();
  } catch {
    return false;
  }
}

function formatBR(iso) {
  try {
    if (!iso) return "-";
    return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

export default function PCMInicio() {
  const [pcms, setPcms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    buscarPCMs();
  }, []);

  async function buscarPCMs() {
    setLoading(true);
    const { data, error } = await supabase
      .from("pcm_diario")
      .select("*")
      .order("data_referencia", { ascending: false });

    if (error) console.error(error);
    setPcms(data || []);
    setLoading(false);
  }

  /**
   * Copia veículos em aberto do PCM anterior para o PCM novo
   * - pega tudo que está em aberto (data_saida null)
   * - cria novas linhas apontando para pcm_id novo
   */
  async function herdarVeiculosEmAberto({ pcmNovoId, dataRefHoje }) {
    // tenta herdar do PCM de ontem
    const dataOntem = subDaysISO(dataRefHoje, 1);

    const { data: pcmAnterior, error: errPcmAnterior } = await supabase
      .from("pcm_diario")
      .select("id, data_referencia")
      .eq("data_referencia", dataOntem)
      .single();

    // Se não existe PCM anterior, não herda nada
    if (errPcmAnterior || !pcmAnterior?.id) return;

    // busca veículos em aberto do pcm anterior
    const { data: veicsAbertos, error: errVeics } = await supabase
      .from("veiculos_pcm")
      .select("*")
      .eq("pcm_id", pcmAnterior.id)
      .is("data_saida", null);

    if (errVeics) {
      console.error(errVeics);
      return;
    }

    if (!veicsAbertos?.length) return;

    // monta payload
    const novos = veicsAbertos.map((v) => ({
      pcm_id: pcmNovoId,
      frota: v.frota || null,
      setor: v.setor || "MANUTENÇÃO",
      descricao: v.descricao || "",
      categoria: v.categoria || "PENDENTES",
      ordem_servico: v.ordem_servico || null,
      previsao: v.previsao || null,
      observacao: v.observacao || null,

      // controle
      lancado_por: "Sistema (Virada PCM)",
      lancado_no_turno: "NOITE",
      data_entrada: v.data_entrada || new Date().toISOString(),
    }));

    // evita duplicidade dentro do novo PCM (por segurança)
    // (se acontecer de alguém já lançar a frota no novo pcm antes da herança)
    const { data: jaNoNovoPCM, error: errDup } = await supabase
      .from("veiculos_pcm")
      .select("frota")
      .eq("pcm_id", pcmNovoId)
      .is("data_saida", null);

    if (errDup) {
      console.error(errDup);
    }

    const frotaJaExiste = new Set((jaNoNovoPCM || []).map((x) => String(x.frota)));

    const finalInsert = novos.filter((n) => !frotaJaExiste.has(String(n.frota)));

    if (!finalInsert.length) return;

    const { error: errInsert } = await supabase.from("veiculos_pcm").insert(finalInsert);

    if (errInsert) console.error(errInsert);
  }

  async function criarNovoDia() {
    if (creating) return;
    setCreating(true);

    try {
      const hoje = todayISO();

      // 1) checa se já existe PCM do dia
      const { data: existing, error: errExisting } = await supabase
        .from("pcm_diario")
        .select("id, data_referencia")
        .eq("data_referencia", hoje)
        .maybeSingle();

      if (errExisting) {
        console.error(errExisting);
        alert("Erro ao validar PCM do dia.");
        return;
      }

      // se já existe, só abre
      if (existing?.id) {
        return navigate(`/pcm-diario/${existing.id}`);
      }

      // 2) cria PCM novo
      const { data: novo, error: errCreate } = await supabase
        .from("pcm_diario")
        .insert([{ data_referencia: hoje, criado_por: "Sistema" }])
        .select()
        .single();

      if (errCreate) {
        alert("Erro ao criar PCM do dia: " + errCreate.message);
        return;
      }

      // 3) herda veículos em aberto
      await herdarVeiculosEmAberto({ pcmNovoId: novo.id, dataRefHoje: hoje });

      // 4) atualiza lista e abre
      await buscarPCMs();
      navigate(`/pcm-diario/${novo.id}`);
    } finally {
      setCreating(false);
    }
  }

  const pcmsOrdenados = useMemo(() => pcms || [], [pcms]);

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800">PCM - Início</h1>
          <p className="text-xs text-gray-500 font-semibold">
            Regra: PCM pode ser editado até <span className="font-black">10:00 do dia seguinte</span>.
            Após isso, fica <span className="font-black">somente consulta</span>.
          </p>
        </div>

        <button
          onClick={criarNovoDia}
          disabled={creating}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-black flex items-center gap-2"
        >
          <span className="text-lg">+</span> {creating ? "Criando..." : "Abrir PCM do Dia"}
        </button>
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-xl shadow overflow-hidden border">
        <table className="w-full text-left">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="p-4">Data</th>
              <th className="p-4">Criado por</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-center">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-500 font-bold">
                  Carregando PCMs...
                </td>
              </tr>
            ) : pcmsOrdenados.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-500 font-bold">
                  Nenhum PCM criado ainda.
                </td>
              </tr>
            ) : (
              pcmsOrdenados.map((pcm) => {
                const editavel = canEditPCM(pcm.data_referencia);
                return (
                  <tr key={pcm.id} className="hover:bg-gray-50">
                    <td className="p-4 font-black">{formatBR(pcm.data_referencia)}</td>
                    <td className="p-4 text-gray-600 font-semibold">{pcm.criado_por || "-"}</td>

                    <td className="p-4">
                      {editavel ? (
                        <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-black">
                          EDITÁVEL (até 10:00 do dia seguinte)
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-gray-200 text-gray-700 text-xs font-black">
                          SOMENTE CONSULTA (fechado)
                        </span>
                      )}
                    </td>

                    <td className="p-4 flex justify-center gap-2">
                      <button
                        onClick={() => navigate(`/pcm-diario/${pcm.id}`)}
                        className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg text-xs font-black"
                      >
                        {editavel ? "📝 Abrir PCM" : "👁️ Consultar PCM"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* OBSERVAÇÃO IMPORTANTE */}
      <div className="mt-4 text-[11px] text-gray-600 font-semibold">
        Dica: Quando você criar o PCM do dia, o sistema herda automaticamente os veículos em aberto do PCM anterior.
      </div>
    </div>
  );
}
