// src/pages/TratativasLancarRH.jsx
// ✅ Modal de lançamento consolidado (1 lançamento RH para N tratativas)
// ✅ "Clique e cole o print" funcionando: listener global document.addEventListener("paste", ...)
// ✅ Upload no bucket "tratativas" (pasta rh_consolidado/<chapa>/...)

import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";

function brDateTime(d) {
  if (!d) return "—";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("pt-BR");
}
function brDate(d) {
  if (!d) return "—";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("pt-BR");
}
function fileNameFromUrl(u) {
  try {
    const raw = String(u || "");
    const noHash = raw.split("#")[0];
    const noQuery = noHash.split("?")[0];
    const last = noQuery.split("/").filter(Boolean).pop() || "arquivo";
    return decodeURIComponent(last);
  } catch {
    return "arquivo";
  }
}
function isImageUrl(u) {
  const s = String(u || "").toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/.test(s);
}
function isPdf(u) {
  const s = String(u || "").toLowerCase();
  return s.includes(".pdf") || /\.(pdf)(\?|#|$)/.test(s);
}
const sanitizeName = (name) =>
  String(name || "arquivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "");

async function uploadToTratativasBucket(file, prefixFolder) {
  const safeName = sanitizeName(file?.name);
  const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}_${safeName}`;
  const path = `${prefixFolder}/${unique}`;

  const up = await supabase.storage.from("tratativas").upload(path, file, {
    upsert: false,
    contentType: file?.type || undefined,
  });
  if (up.error) throw up.error;

  const { data: pub } = supabase.storage.from("tratativas").getPublicUrl(path);
  return pub?.publicUrl || null;
}

function makeFileFromClipboardImage(blobFile) {
  const type = blobFile?.type || "image/png";
  const ext = type === "image/jpeg" ? "jpg" : "png";
  const name = `print_transnet_${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`;
  return new File([blobFile], name, { type, lastModified: Date.now() });
}
function extractPasteFile(e) {
  const items = e.clipboardData?.items ? Array.from(e.clipboardData.items) : [];
  const imgItem = items.find((it) => it.kind === "file" && it.type?.startsWith("image/"));
  if (imgItem) {
    const f = imgItem.getAsFile();
    if (f) return makeFileFromClipboardImage(f);
  }

  const files = e.clipboardData?.files ? Array.from(e.clipboardData.files) : [];
  const imgFile = files.find((f) => String(f.type || "").startsWith("image/"));
  if (imgFile) return makeFileFromClipboardImage(imgFile);

  return null;
}

export default function TratativasLancarRH({ aberto, grupo, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [obsRH, setObsRH] = useState("");
  const [evidFile, setEvidFile] = useState(null);
  const pasteBoxRef = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    setObsRH("");
    setEvidFile(null);
    setTimeout(() => pasteBoxRef.current?.focus?.(), 150);
  }, [aberto]);

  // ✅ paste global (funciona mesmo se foco estiver em outro elemento do modal)
  useEffect(() => {
    if (!aberto) return;

    function handler(e) {
      const f = extractPasteFile(e);
      if (!f) return;
      e.preventDefault();
      setEvidFile(f);
    }

    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [aberto]);

  if (!aberto || !grupo) return null;

  const renderThumbOrLink = (url) => {
    if (!url) return <span className="text-gray-400">—</span>;
    const img = isImageUrl(url) && !isPdf(url);
    return img ? (
      <a href={url} target="_blank" rel="noopener noreferrer" title="Abrir">
        <img
          src={url}
          alt={fileNameFromUrl(url)}
          className="h-14 w-14 rounded border object-cover hover:opacity-90"
          loading="lazy"
        />
      </a>
    ) : (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline text-xs"
      >
        {fileNameFromUrl(url)}
      </a>
    );
  };

  async function fecharMedidaRH() {
    if (!obsRH?.trim()) {
      alert("Informe a observação do RH (ex.: 'Lançado no Transnet').");
      return;
    }
    if (!evidFile) {
      alert("Cole ou selecione a evidência (print/documento) do Transnet.");
      return;
    }

    setLoading(true);
    try {
      const evidUrl = await uploadToTratativasBucket(
        evidFile,
        `rh_consolidado/${sanitizeName(grupo.motorista_chapa)}`
      );

      // 1) upsert lançamento consolidado
      const upLanc = await supabase
        .from("tratativas_rh_lancamentos")
        .upsert(
          {
            chave_consolidacao: grupo.key,
            motorista_chapa: grupo.motorista_chapa,
            motorista_nome: grupo.motorista_nome,
            acao_aplicada: grupo.acao_aplicada,

            arquivo_ref: grupo.evidencia_key || null, // ✅ guarda o nome após 2º "_"

            status_rh: "CONCLUIDA",
            lancado_transnet: true,
            lancado_em: new Date().toISOString(),

            observacao_rh: obsRH.trim(),
            evidencia_transnet_url: evidUrl,
          },
          { onConflict: "chave_consolidacao" }
        )
        .select("id")
        .single();

      if (upLanc.error) throw upLanc.error;
      const lancamentoId = upLanc.data?.id;
      if (!lancamentoId) throw new Error("Não foi possível obter ID do lançamento.");

      // 2) vincula itens (tratativas consolidadas)
      const itensPayload = (grupo.itens || []).map((i) => ({
        lancamento_id: lancamentoId,
        tratativa_id: i.tratativa_id,
        detalhe_id: i.detalhe_id,
      }));

      if (itensPayload.length > 0) {
        const upItens = await supabase
          .from("tratativas_rh_lancamentos_itens")
          .upsert(itensPayload, { onConflict: "lancamento_id,tratativa_id" });

        if (upItens.error) throw upItens.error;
      }

      alert(`RH lançado com sucesso. (${grupo.itens.length} tratativas consolidadas)`);
      onClose?.();
      onSaved?.();
    } catch (e) {
      alert(`Erro ao lançar: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <div className="text-lg font-bold">Lançar no Transnet (RH)</div>
            <div className="text-xs text-gray-500">
              <b>{grupo.acao_aplicada}</b> • {grupo.motorista_nome} ({grupo.motorista_chapa}) •
              Arquivo: <b>{grupo.evidencia_key || "—"}</b> • <b>{grupo.itens.length}</b> tratativa(s)
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
          >
            Fechar
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Tratativas consolidadas */}
          <div className="bg-white shadow rounded-lg overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="py-2 px-3 text-left">Data</th>
                  <th className="py-2 px-3 text-left">Ocorrência</th>
                  <th className="py-2 px-3 text-left">Linha</th>
                  <th className="py-2 px-3 text-left">Prioridade</th>
                  <th className="py-2 px-3 text-left">Setor</th>
                  <th className="py-2 px-3 text-left">Data Ocorrido</th>
                </tr>
              </thead>
              <tbody>
                {grupo.itens.map((i) => (
                  <tr key={i.detalhe_id} className="border-t">
                    <td className="py-2 px-3 text-gray-700">{brDateTime(i.detalhe_created_at)}</td>
                    <td className="py-2 px-3 text-gray-700">{i.tipo_ocorrencia || "—"}</td>
                    <td className="py-2 px-3 text-gray-700">{i.linha || "—"}</td>
                    <td className="py-2 px-3 text-gray-700">{i.prioridade || "—"}</td>
                    <td className="py-2 px-3 text-gray-700">{i.setor_origem || "—"}</td>
                    <td className="py-2 px-3 text-gray-700">{brDate(i.data_ocorrido)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Evidência/anexo do tratador (do primeiro item) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-sm text-gray-600 mb-2">Evidência (Tratador)</div>
              {renderThumbOrLink(grupo.itens?.[0]?.evidencia_conclusao_url)}
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-2">Anexo (Tratador)</div>
              {renderThumbOrLink(grupo.itens?.[0]?.anexo_tratador_url)}
            </div>
          </div>

          <hr />

          {/* RH */}
          <div className="space-y-3">
            <label className="block text-sm text-gray-600 mb-1">Observação RH</label>
            <textarea
              rows={3}
              className="w-full rounded-md border px-3 py-2"
              placeholder="Ex.: Lançado no Transnet (print anexado)."
              value={obsRH}
              onChange={(e) => setObsRH(e.target.value)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="text-sm text-gray-600">Evidência (arquivo)</div>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setEvidFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm"
                />
                {evidFile?.name && <div className="text-xs text-gray-500">{evidFile.name}</div>}
              </div>

              <div className="space-y-2">
                <div className="text-sm text-gray-600">Evidência (print)</div>
                <div
                  ref={pasteBoxRef}
                  tabIndex={0}
                  className="rounded-md border border-dashed p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 outline-none"
                  title="Clique e cole o Print (Ctrl+V)"
                  onClick={() => pasteBoxRef.current?.focus?.()}
                >
                  <div className="text-sm font-medium text-gray-700">Clique e cole o Print</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {evidFile ? `Capturado: ${evidFile.name}` : "Ctrl+V para colar (print)"}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              Dica: com o modal aberto, você pode colar com <b>Ctrl+V</b> mesmo sem clicar na caixa.
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
            disabled={loading}
          >
            Cancelar
          </button>

          <button
            onClick={fecharMedidaRH}
            disabled={loading}
            className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 disabled:bg-gray-400"
          >
            {loading ? "Salvando..." : "Fechar Medida"}
          </button>
        </div>
      </div>
    </div>
  );
}
