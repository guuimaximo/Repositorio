// src/pages/TratativasLancarRH.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabase";

/* =========================
   Helpers
========================= */
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

function sanitizeName(name) {
  return String(name || "arquivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "");
}

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

function Thumb({ url }) {
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
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">
      {fileNameFromUrl(url)}
    </a>
  );
}

export default function TratativasLancarRH({ aberto, grupo, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [obsRH, setObsRH] = useState("");
  const [evidFile, setEvidFile] = useState(null);

  const pasteBoxRef = useRef(null);

  const titulo = "Lançar no Transnet (RH)";

  const evidenciasTratador = useMemo(() => {
    const arr = Array.from(new Set([...(grupo?.evidencia_conclusao_urls || []), ...(grupo?.anexo_tratador_urls || [])]));
    return arr.filter(Boolean);
  }, [grupo]);

  // ✅ CTRL+V: listener global enquanto modal estiver aberto
  useEffect(() => {
    if (!aberto) return;

    const onPasteGlobal = (e) => {
      const items = e.clipboardData?.items ? Array.from(e.clipboardData.items) : [];
      const imgItem = items.find((it) => it.kind === "file" && it.type?.startsWith("image/"));
      if (!imgItem) return;

      // evita colar imagem como texto em algum input
      e.preventDefault();

      const f = imgItem.getAsFile();
      if (!f) return;
      setEvidFile(makeFileFromClipboardImage(f));
    };

    window.addEventListener("paste", onPasteGlobal);
    return () => window.removeEventListener("paste", onPasteGlobal);
  }, [aberto]);

  useEffect(() => {
    if (aberto) {
      setObsRH("");
      setEvidFile(null);
      setTimeout(() => pasteBoxRef.current?.focus?.(), 200);
    }
  }, [aberto]);

  if (!aberto || !grupo) return null;

  async function fecharMedidaRH() {
    if (grupo.rh_lancado) {
      alert("Este lançamento já está concluído no RH.");
      return;
    }

    if (!obsRH?.trim()) {
      alert("Informe a observação do RH (ex.: 'Lançado no Transnet').");
      return;
    }
    if (!evidFile) {
      alert("Cole (Ctrl+V) ou selecione a evidência (print/documento) do Transnet.");
      return;
    }

    setLoading(true);
    try {
      const evidUrl = await uploadToTratativasBucket(evidFile, `${grupo.tratativa_ids?.[0] || "rh"}/rh_transnet`);

      // ✅ Fecha TODAS as tratativas consolidadas (regra: 1 lançamento fecha N tratativas)
      const payload = (grupo.tratativa_ids || []).map((tratativa_id) => ({
        tratativa_id,
        status_rh: "CONCLUIDA",
        lancado_transnet: true,
        lancado_em: new Date().toISOString(),
        observacao_rh: obsRH.trim(),
        evidencia_transnet_url: evidUrl,
      }));

      const up = await supabase.from("tratativas_rh").upsert(payload, { onConflict: "tratativa_id" });
      if (up.error) throw up.error;

      alert("RH: medida fechada com sucesso (Transnet lançado).");
      if (onSaved) await onSaved();
    } catch (e) {
      alert(`Erro ao fechar medida: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  const FilePicker = ({ id, accept, onPick, selectedFile }) => (
    <div className="flex items-center gap-3">
      <input
        id={id}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] || null)}
      />
      <label
        htmlFor={id}
        className="inline-flex cursor-pointer items-center justify-center rounded-md border bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Escolher arquivo
      </label>
      <div className="text-xs text-gray-500 truncate">
        {selectedFile?.name ? selectedFile.name : "Nenhum arquivo selecionado"}
      </div>
    </div>
  );

  // caixa de paste (mantida) — agora funciona pq tem listener global
  const PasteBox = ({ file, onClear, disabled }) => {
    return (
      <div
        ref={pasteBoxRef}
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) pasteBoxRef.current?.focus?.();
        }}
        className={[
          "rounded-md border p-3 bg-gray-50 cursor-pointer select-none outline-none",
          disabled ? "opacity-60 cursor-not-allowed" : "border-dashed hover:bg-gray-100",
        ].join(" ")}
        title="Clique aqui e use Ctrl+V"
      >
        <div className="text-sm font-medium text-gray-700">Clique e cole o Print</div>

        {file ? (
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="text-xs text-gray-600 truncate">{file.name}</div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-xs text-red-600 hover:underline"
              disabled={disabled}
            >
              Remover
            </button>
          </div>
        ) : (
          <div className="mt-1 text-xs text-gray-500">{disabled ? "—" : "Ctrl+V para colar (print)"}</div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg overflow-hidden">
        {/* header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <div className="text-lg font-bold">{titulo}</div>
            <div className="text-xs text-gray-500">
              <span className="font-semibold">{grupo.acao_aplicada}</span> • {grupo.motorista_nome} ({grupo.motorista_chapa})
              {" "}• Arquivo: <span className="font-semibold">{grupo.arquivo_key}</span> • {grupo.qtd_tratativas} tratativa(s)
            </div>
          </div>
          <button onClick={onClose} className="rounded-md bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300">
            Fechar
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* tabela azul com tratativas consolidadas */}
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
                {(grupo.itens || []).map((i) => (
                  <tr key={`${i.tratativa_id}-${i.detalhe_id}`} className="border-t hover:bg-gray-50">
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

          {/* evidências em miniatura */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-sm text-gray-600 mb-2">Evidências (Tratador) — miniaturas</div>
              <div className="flex flex-wrap gap-2">
                {evidenciasTratador.length === 0 ? (
                  <div className="text-sm text-gray-400">—</div>
                ) : (
                  evidenciasTratador.map((u) => <Thumb key={u} url={u} />)
                )}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-600 mb-2">Anexo (Tratador)</div>
              {/* mostramos também, mas já está no bloco acima; aqui só mantemos um “—” se quiser */}
              <div className="text-sm text-gray-400">—</div>
            </div>
          </div>

          <hr />

          <div>
            <div className="text-sm font-semibold mb-2">RH (Transnet)</div>

            <label className="block text-sm text-gray-600 mb-1">Observação RH</label>
            <textarea
              rows={3}
              className="w-full rounded-md border px-3 py-2"
              placeholder="Ex.: Lançado no Transnet (print anexado)."
              value={obsRH}
              onChange={(e) => setObsRH(e.target.value)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div className="space-y-2">
                <div className="text-sm text-gray-600">Evidência (arquivo)</div>
                <FilePicker
                  id="rh_evid_file"
                  accept="image/*,application/pdf"
                  selectedFile={evidFile}
                  onPick={setEvidFile}
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm text-gray-600">Evidência (print)</div>
                <PasteBox file={evidFile} onClear={() => setEvidFile(null)} disabled={false} />
              </div>
            </div>

            <div className="text-xs text-gray-500 mt-2">
              Dica: com o modal aberto, você pode colar com <b>Ctrl+V</b> (mesmo sem clicar na caixa).
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-md bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300" disabled={loading}>
            Cancelar
          </button>

          <button
            onClick={fecharMedidaRH}
            disabled={loading}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? "Salvando..." : "Fechar Medida"}
          </button>
        </div>
      </div>
    </div>
  );
}
