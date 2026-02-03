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

/* =========================
   UI helpers
========================= */
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
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline text-xs break-all"
      title="Abrir"
    >
      {fileNameFromUrl(url)}
    </a>
  );
}

// ✅ Grid (miniaturas + cards PDF)
function EvidenciasGrid({ urls, label }) {
  const arr = Array.isArray(urls) ? urls.filter(Boolean) : [];
  if (arr.length === 0) {
    return (
      <div>
        <div className="text-sm text-gray-600 mb-2">{label}</div>
        <div className="text-sm text-gray-400">—</div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-sm text-gray-600 mb-2">{label}</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {arr.map((u, i) => {
          const pdf = isPdf(u);
          const img = isImageUrl(u) && !pdf;
          const name = fileNameFromUrl(u);

          if (img) {
            return (
              <a
                key={`${u}-${i}`}
                href={u}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-lg border bg-white overflow-hidden hover:shadow-sm"
                title="Abrir evidência"
              >
                <img
                  src={u}
                  alt={name}
                  className="h-24 w-full object-cover group-hover:opacity-95"
                  loading="lazy"
                />
                <div className="px-2 py-1.5 text-xs text-gray-700 truncate">{name}</div>
              </a>
            );
          }

          return (
            <a
              key={`${u}-${i}`}
              href={u}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border bg-white p-3 hover:shadow-sm"
              title="Abrir evidência"
            >
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                {pdf ? "PDF" : "ARQ"}
              </span>
              <div className="mt-2 text-xs text-blue-700 underline break-words">{name}</div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

/* =========================
   Component
========================= */
export default function TratativasLancarRH({ aberto, grupo, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [obsRH, setObsRH] = useState("");
  const [evidFile, setEvidFile] = useState(null);

  const modalRef = useRef(null);

  const titulo = "Lançar no Transnet (RH)";

  const evidenciasTratador = useMemo(() => {
    const arr = Array.from(
      new Set([...(grupo?.evidencia_conclusao_urls || []), ...(grupo?.anexo_tratador_urls || [])])
    );
    return arr.filter(Boolean);
  }, [grupo]);

  // ✅ Preview do arquivo selecionado (objURL)
  const [previewObjUrl, setPreviewObjUrl] = useState(null);
  useEffect(() => {
    if (!evidFile) {
      if (previewObjUrl) URL.revokeObjectURL(previewObjUrl);
      setPreviewObjUrl(null);
      return;
    }
    const url = URL.createObjectURL(evidFile);
    setPreviewObjUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evidFile]);

  useEffect(() => {
    return () => {
      if (previewObjUrl) URL.revokeObjectURL(previewObjUrl);
    };
  }, [previewObjUrl]);

  // ✅ handler robusto de paste
  const handlePaste = (e) => {
    try {
      const cd = e.clipboardData;
      if (!cd) return;

      // 1) items (Chrome/Edge)
      const items = cd.items ? Array.from(cd.items) : [];
      const imgItem = items.find((it) => it.kind === "file" && it.type?.startsWith("image/"));

      if (imgItem) {
        e.preventDefault();
        const f = imgItem.getAsFile();
        if (f) setEvidFile(makeFileFromClipboardImage(f));
        return;
      }

      // 2) files (fallback)
      const files = cd.files ? Array.from(cd.files) : [];
      const imgFile = files.find((f) => f.type?.startsWith("image/"));
      if (imgFile) {
        e.preventDefault();
        setEvidFile(makeFileFromClipboardImage(imgFile));
        return;
      }
    } catch {
      // noop
    }
  };

  // ✅ listeners enquanto modal aberto (window + document)
  useEffect(() => {
    if (!aberto) return;

    const onPasteWindow = (e) => handlePaste(e);
    const onPasteDoc = (e) => handlePaste(e);

    window.addEventListener("paste", onPasteWindow);
    document.addEventListener("paste", onPasteDoc);

    return () => {
      window.removeEventListener("paste", onPasteWindow);
      document.removeEventListener("paste", onPasteDoc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  useEffect(() => {
    if (aberto) {
      setObsRH("");
      setEvidFile(null);

      // foco no modal para garantir paste chegando
      setTimeout(() => modalRef.current?.focus?.(), 150);
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
      const evidUrl = await uploadToTratativasBucket(
        evidFile,
        `${grupo.tratativa_ids?.[0] || "rh"}/rh_transnet`
      );

      // ✅ Fecha TODAS as tratativas consolidadas (1 lançamento fecha N tratativas)
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

  // ✅ Preview RH (selecionado)
  const renderPreviewRH = () => {
    if (!evidFile) return <div className="text-sm text-gray-400">—</div>;

    const isPdfFile = evidFile.type === "application/pdf" || evidFile.name?.toLowerCase().endsWith(".pdf");
    if (isPdfFile) {
      return (
        <div className="rounded-lg border bg-white p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
              PDF
            </span>
            <button
              type="button"
              className="text-xs text-red-600 hover:underline"
              onClick={() => setEvidFile(null)}
              disabled={loading}
            >
              Remover
            </button>
          </div>
          <div className="mt-2 text-sm text-gray-700 break-words">{evidFile.name}</div>
        </div>
      );
    }

    // imagem
    return (
      <div className="flex items-start gap-3">
        <img
          src={previewObjUrl}
          alt={evidFile.name}
          className="h-24 w-24 rounded-lg border object-cover"
        />
        <div className="flex-1">
          <div className="text-sm text-gray-700 break-words">{evidFile.name}</div>
          <button
            type="button"
            className="mt-2 text-xs text-red-600 hover:underline"
            onClick={() => setEvidFile(null)}
            disabled={loading}
          >
            Remover
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      // ✅ captura paste antes dos inputs (muito mais confiável)
      onPasteCapture={handlePaste}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="w-full max-w-4xl bg-white rounded-lg shadow-lg overflow-hidden outline-none"
      >
        {/* header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <div className="text-lg font-bold">{titulo}</div>
            <div className="text-xs text-gray-500">
              <span className="font-semibold">{grupo.acao_aplicada}</span> • {grupo.motorista_nome} ({grupo.motorista_chapa})
              {" "}• Arquivo: <span className="font-semibold">{grupo.arquivo_key}</span> • {grupo.qtd_tratativas} tratativa(s)
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
          >
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

          {/* ✅ evidências em miniatura (grid) */}
          <EvidenciasGrid urls={evidenciasTratador} label="Evidências (Tratador) — miniaturas" />

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

            {/* ✅ Layout melhor: anexar + colar + preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div className="space-y-2">
                <div className="text-sm text-gray-600">Evidência (arquivo)</div>

                <div className="rounded-lg border bg-gray-50 p-3">
                  <FilePicker
                    id="rh_evid_file"
                    accept="image/*,application/pdf"
                    selectedFile={evidFile}
                    onPick={setEvidFile}
                  />
                  <div className="mt-3">{renderPreviewRH()}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-gray-600">Evidência (print)</div>

                <div
                  className={[
                    "rounded-lg border-2 border-dashed p-4 bg-gray-50",
                    loading ? "opacity-60" : "hover:bg-gray-100",
                  ].join(" ")}
                  onClick={() => modalRef.current?.focus?.()}
                  title="Com o modal aberto, pressione Ctrl+V"
                >
                  <div className="text-sm font-medium text-gray-700">Cole aqui o Print do Transnet</div>
                  <div className="mt-1 text-xs text-gray-500">
                    Dica: com o modal aberto, use <b>Ctrl+V</b> (funciona mesmo sem clicar em um campo).
                  </div>

                  {!evidFile ? (
                    <div className="mt-3 text-sm text-gray-400">Nenhum print colado ainda.</div>
                  ) : (
                    <div className="mt-3">{renderPreviewRH()}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500 mt-2">
              Se não colar: confirme que você está copiando uma <b>imagem</b> (print) e não texto.
              (Chrome/Edge ok; em alguns apps o “copiar” não envia imagem pro clipboard.)
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
            disabled={loading}
          >
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
