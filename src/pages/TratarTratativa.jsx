// src/pages/TratarTratativa.jsx
import { useEffect, useMemo, useState, useContext, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabase";
import { AuthContext } from "../context/AuthContext";

const acoes = [
  "Orientação",
  "Advertência",
  "Suspensão",
  "Aviso de última oportunidade",
  "Contato Pessoal",
  "Não aplicada",
  "Contato via Celular",
  "Elogiado",
];

export default function TratarTratativa() {
  const { id } = useParams();
  const nav = useNavigate();

  const { user } = useContext(AuthContext);

  const [t, setT] = useState(null);
  const [resumo, setResumo] = useState("");
  const [acao, setAcao] = useState("Orientação");

  // ✅ Conclusão: agora apenas 1 arquivo -> Anexo da Tratativa (imagem/pdf)
  const [anexo, setAnexo] = useState(null);

  const [loading, setLoading] = useState(false);

  // Complementos
  const [linhaDescricao, setLinhaDescricao] = useState("");
  const [cargoMotorista, setCargoMotorista] = useState("MOTORISTA");

  // Edição inline
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    tipo_ocorrencia: "",
    prioridade: "Média",
    setor_origem: "",
    linha: "",
    descricao: "",
  });

  // ---- Controles de Suspensão ----
  const [diasSusp, setDiasSusp] = useState(1);
  const [dataSuspensao, setDataSuspensao] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  // ref p/ CTRL+V (print) no anexo
  const pasteAnexoRef = useRef(null);

  const dataPtCompletaUpper = (d = new Date()) => {
    const meses = [
      "JANEIRO",
      "FEVEREIRO",
      "MARÇO",
      "ABRIL",
      "MAIO",
      "JUNHO",
      "JULHO",
      "AGOSTO",
      "SETEMBRO",
      "OUTUBRO",
      "NOVEMBRO",
      "DEZEMBRO",
    ];
    const dia = String(d.getDate()).padStart(2, "0");
    const mes = meses[d.getMonth()];
    const ano = d.getFullYear();
    return `${dia} de ${mes} de ${ano}`;
  };

  const br = (d) => {
    if (!d) return "—";
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return "—";
    return dt.toLocaleDateString("pt-BR");
  };

  const brDateTime = (d) => {
    if (!d) return "—";
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return "—";
    return dt.toLocaleString("pt-BR");
  };

  // ===== Ajuste de datas da suspensão (LOCAL, sem shift UTC) =====
  const parseDateLocal = (dateStr) => {
    if (!dateStr) return new Date();
    const [yyyy, mm, dd] = String(dateStr).split("-").map(Number);
    return new Date(yyyy, (mm || 1) - 1, dd || 1);
  };

  const addDaysLocal = (dateOrStr, n) => {
    const base =
      dateOrStr instanceof Date ? new Date(dateOrStr) : parseDateLocal(dateOrStr);
    base.setDate(base.getDate() + Number(n || 0));
    return base;
  };

  const inicioSusp = useMemo(() => parseDateLocal(dataSuspensao), [dataSuspensao]);

  const fimSusp = useMemo(
    () => addDaysLocal(inicioSusp, Math.max(Number(diasSusp) - 1, 0)),
    [inicioSusp, diasSusp]
  );

  const retornoSusp = useMemo(
    () => addDaysLocal(inicioSusp, Math.max(Number(diasSusp), 0)),
    [inicioSusp, diasSusp]
  );

  // ===== Helpers de evidência =====
  const fileNameFromUrl = (u) => {
    try {
      const raw = String(u || "");
      const noHash = raw.split("#")[0];
      const noQuery = noHash.split("?")[0];
      const last = noQuery.split("/").filter(Boolean).pop() || "arquivo";
      return decodeURIComponent(last);
    } catch {
      return "arquivo";
    }
  };

  const isPdf = (fileOrUrl) => {
    if (!fileOrUrl) return false;
    if (typeof fileOrUrl === "string") return fileOrUrl.toLowerCase().includes(".pdf");
    return (
      fileOrUrl.type === "application/pdf" ||
      String(fileOrUrl.name || "").toLowerCase().endsWith(".pdf")
    );
  };

  const isImageUrl = (u) => {
    const s = String(u || "").toLowerCase();
    return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/.test(s);
  };

  const renderListaArquivosCompacta = (urls, label) => {
    const arr = Array.isArray(urls) ? urls.filter(Boolean) : [];
    if (arr.length === 0) return null;

    return (
      <div className="mt-2">
        <span className="block text-sm text-gray-600 mb-2">{label}</span>
        <ul className="space-y-1">
          {arr.map((u, i) => (
            <li key={`${u}-${i}`} className="text-sm">
              <a
                href={u}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
                title="Abrir evidência"
              >
                {fileNameFromUrl(u)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderArquivoOuThumb = (url, label) => {
    if (!url) return null;

    const pdf = isPdf(url);
    const imgOk = !pdf && isImageUrl(url);

    return (
      <div className="mt-2">
        <span className="block text-sm text-gray-600 mb-2">{label}</span>

        {pdf || !imgOk ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 underline"
            title="Abrir arquivo"
          >
            {fileNameFromUrl(url)}
          </a>
        ) : (
          <a href={url} target="_blank" rel="noopener noreferrer" title="Abrir imagem">
            <img
              src={url}
              alt={fileNameFromUrl(url)}
              className="h-16 w-16 rounded border object-cover hover:opacity-90"
              loading="lazy"
            />
          </a>
        )}
      </div>
    );
  };

  // ✅ CTRL+V: cola print (imagem) -> vira File
  const makeFileFromClipboardImage = (blobFile) => {
    const type = blobFile?.type || "image/png";
    const ext = type === "image/jpeg" ? "jpg" : "png";
    const name = `print_${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`;
    return new File([blobFile], name, { type, lastModified: Date.now() });
  };

  const onPasteAnexo = (e) => {
    const items = e.clipboardData?.items ? Array.from(e.clipboardData.items) : [];
    const imgItem = items.find((it) => it.kind === "file" && it.type?.startsWith("image/"));
    if (!imgItem) return;
    e.preventDefault();
    const f = imgItem.getAsFile();
    if (!f) return;
    setAnexo(makeFileFromClipboardImage(f));
  };

  // ======= Carrega tratativa =======
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("tratativas").select("*").eq("id", id).single();
      if (error) {
        console.error(error);
        return;
      }
      setT(data || null);

      setEditForm({
        tipo_ocorrencia: data?.tipo_ocorrencia || "",
        prioridade: data?.prioridade || "Média",
        setor_origem: data?.setor_origem || "",
        linha: data?.linha || "",
        descricao: data?.descricao || "",
      });

      // Linha (código -> descrição)
      if (data?.linha && data.linha !== "NA") {
        const { data: row } = await supabase
          .from("linhas")
          .select("descricao")
          .eq("codigo", data.linha)
          .maybeSingle();
        setLinhaDescricao(row?.descricao || "");
      } else setLinhaDescricao("");

      // Cargo (por registro/chapa)
      if (data?.motorista_chapa) {
        const { data: m } = await supabase
          .from("motoristas")
          .select("cargo")
          .eq("chapa", data.motorista_chapa)
          .maybeSingle();
        setCargoMotorista((m?.cargo || data?.cargo || "Motorista").toUpperCase());
      } else {
        setCargoMotorista((data?.cargo || "Motorista").toUpperCase());
      }
    })();
  }, [id]);

  async function salvarEdicao() {
    if (!t) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("tratativas")
        .update({
          tipo_ocorrencia: editForm.tipo_ocorrencia || null,
          prioridade: editForm.prioridade || null, // ✅ inclui Gravíssima
          setor_origem: editForm.setor_origem || null,
          linha: editForm.linha || null, // ✅ pode ser "NA"
          descricao: editForm.descricao || null,
        })
        .eq("id", t.id);
      if (error) throw error;

      setT((prev) => (prev ? { ...prev, ...editForm } : prev));

      if (editForm.linha && editForm.linha !== "NA") {
        const { data: row } = await supabase
          .from("linhas")
          .select("descricao")
          .eq("codigo", editForm.linha)
          .maybeSingle();
        setLinhaDescricao(row?.descricao || "");
      } else setLinhaDescricao("");

      setIsEditing(false);
      alert("Dados atualizados!");
    } catch (e) {
      alert(`Erro ao salvar: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  // ===== Upload helper (organiza por tratativa) =====
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

  async function concluir() {
    if (!t) return;
    if (!resumo) {
      alert("Informe o resumo/observações");
      return;
    }

    setLoading(true);
    try {
      // ✅ resolve identidade do tratador com fallback
      const loginSessao = user?.login || user?.email || null;
      const idSessao = user?.id || user?.auth_user_id || null;
      let nomeSessao = user?.nome || user?.nome_completo || null;

      if (!nomeSessao && loginSessao) {
        const { data: u, error: eu } = await supabase
          .from("usuarios_aprovadores")
          .select("nome, sobrenome, nome_completo")
          .eq("login", loginSessao)
          .maybeSingle();
        if (!eu) {
          nomeSessao =
            u?.nome_completo ||
            [u?.nome, u?.sobrenome].filter(Boolean).join(" ") ||
            u?.nome ||
            null;
        }
      }

      // ✅ Agora: só Anexo da Tratativa
      let anexo_tratativa_url = null;
      if (anexo) {
        anexo_tratativa_url = await uploadToTratativasBucket(anexo, `${t.id}/anexos`);
      }

      // detalhe/histórico
      const ins = await supabase.from("tratativas_detalhes").insert({
        tratativa_id: t.id,
        acao_aplicada: acao,
        observacoes: resumo,

        // ✅ não anexamos "evidência da conclusão" aqui
        imagem_tratativa: null,
        anexo_tratativa: anexo_tratativa_url,

        // ✅ auditoria de quem tratou
        tratado_por_login: loginSessao,
        tratado_por_nome: nomeSessao || loginSessao,
        tratado_por_id: idSessao,
      });
      if (ins.error) throw ins.error;

      // atualiza status + anexo principal (se enviado)
      const upd = await supabase
        .from("tratativas")
        .update({
          status: "Concluída",
          anexo_tratativa: anexo_tratativa_url || t.anexo_tratativa || null,
          // imagem_tratativa não muda
        })
        .eq("id", t.id);
      if (upd.error) throw upd.error;

      alert("Tratativa concluída com sucesso!");
      nav("/central");
    } catch (e) {
      alert(`Erro: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  // ======== Impressão – CSS base ========
  function baseCssCourier() {
    return `
      <style>
        @page { size: A4; margin: 25mm; }
        html, body { height: 100%; }
        body {
          font-family: "Courier New", Courier, monospace;
          color:#000; font-size: 14px; line-height: 1.55; margin: 0;
        }
        .page { min-height: 100vh; display: flex; flex-direction: column; }
        .content { padding: 0; }
        .linha { display:flex; justify-content:space-between; gap:16px; }
        .mt { margin-top: 16px; }
        .center { text-align: center; font-weight: bold; }
        .right { text-align: right; }
        .bl { white-space: pre-wrap; }
        .label { font-weight: bold; }
        .footer-sign { margin-top: auto; }
        .ass-grid { display:grid; grid-template-columns: 1fr 1fr; gap: 28px; }
        .ass { text-align: center; }
        .ass-line { margin-top: 34px; border-top: 1px solid #000; height:1px; }
      </style>
    `;
  }

  function renderSuspensaoHtml({
    nome,
    registro,
    cargo,
    ocorrencia,
    dataOcorr,
    observ,
    dataDoc,
    dias,
    inicio,
    fim,
    retorno,
  }) {
    const brLocal = (d) => {
      const dt = d instanceof Date ? d : new Date(d);
      return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("pt-BR");
    };
    const diasFmt = String(dias).padStart(2, "0");
    const rotuloDia = Number(dias) === 1 ? "dia" : "dias";

    return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        @page { size: A4; margin: 25mm; }
        html, body { height: 100%; }
        body {
          font-family: "Courier New", Courier, monospace;
          font-size: 14px; line-height: 1.7; color: #000; margin: 0;
        }
        .page { min-height: 100vh; display: flex; flex-direction: column; }
        .content { max-width: 80ch; margin: 0 auto; }
        .center { text-align: center; font-weight: bold; }
        .right { text-align: right; }
        .linha { display:flex; justify-content:space-between; gap:16px; }
        .mt { margin-top: 18px; }
        .label { font-weight: bold; }
        .bl { white-space: pre-wrap; text-align: left; }
        .nowrap { white-space: nowrap; }
        .footer-sign { margin-top: auto; }
        .ass-grid { display:grid; grid-template-columns: 1fr 1fr; gap: 28px; }
        .ass { text-align:center; }
        .ass-line { margin-top: 36px; border-top:1px solid #000; height:1px; }
      </style>
      <title>SUSPENSÃO DISCIPLINAR - ${nome}</title>
    </head>
    <body>
      <div class="page">
        <div class="content">
          <div class="center">SUSPENSÃO DISCIPLINAR</div>
          <div class="right mt">${dataDoc}</div>

          <div class="linha mt">
            <div>SR(A) <span class="label">${nome}</span> ${
              registro ? `(REGISTRO: ${registro})` : ""
            }</div>
            <div><span class="label">Cargo:</span> ${cargo}</div>
          </div>

          <p class="mt bl">
  Pelo presente, notificamos que, por ter o senhor cometido a falta abaixo descrita, encontra-se suspenso do serviço por <span class="label nowrap">${diasFmt} ${rotuloDia}</span>, <span class="nowrap">a partir de <span class="label">${brLocal(
      inicio
    )}</span></span>, devendo, portanto, apresentar-se ao mesmo, no horário usual, <span class="nowrap">no dia <span class="label">${brLocal(
      retorno
    )}</span></span>, salvo outra resolução nossa, que lhe daremos parte se for o caso e, assim, pedimos a devolução do presente com o seu “ciente”.
</p>

          <div class="mt"><span class="label">Ocorrência:</span> ${ocorrencia}</div>
          <div class="mt"><span class="label">Data da Ocorrência:</span> ${dataOcorr}</div>
          <div class="mt"><span class="label">Período da Suspensão:</span> ${brLocal(
            inicio
          )} a ${brLocal(fim)} (retorno: ${brLocal(retorno)})</div>
          <div class="mt"><span class="label">Observação:</span> ${observ}</div>

          <div class="mt"><span class="label">Ciente e Concordo:</span> ________/______/__________</div>
        </div>

        <div class="footer-sign mt">
          <div class="ass-grid">
            <div class="ass"><div class="ass-line"></div>Assinatura do Empregado</div>
            <div class="ass"><div class="ass-line"></div>Assinatura do Empregador</div>
          </div>
          <div class="ass-grid" style="margin-top:20px">
            <div class="ass"><div class="ass-line"></div>Testemunha &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; CPF:</div>
            <div class="ass"><div class="ass-line"></div>Testemunha &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; CPF:</div>
          </div>
        </div>
      </div>
      <script>window.onload = () => { window.print(); }</script>
    </body>
  </html>
  `;
  }

  function renderGenericHtml({
    titulo,
    intro1,
    intro2,
    nome,
    registro,
    cargo,
    ocorrencia,
    dataOcorr,
    observ,
    dataDoc,
  }) {
    return `
      <html>
        <head>
          <meta charset="utf-8" />
          ${baseCssCourier()}
          <title>${titulo} - ${nome}</title>
        </head>
        <body>
          <div class="page">
            <div class="content">
              <div class="center">${titulo}</div>
              <div class="right mt">${dataDoc}</div>

              <div class="linha mt">
                <div>SR(A) <span class="label">${nome}</span> ${
      registro ? `(REGISTRO: ${registro})` : ""
    }</div>
                <div><span class="label">Cargo:</span> ${cargo}</div>
              </div>

              <p class="mt bl">${intro1}</p>
              <p class="bl">${intro2}</p>

              <div class="mt"><span class="label">Ocorrência:</span> ${ocorrencia}</div>
              <div class="mt"><span class="label">Data da Ocorrência:</span> ${dataOcorr}</div>
              <div class="mt"><span class="label">Observação:</span> ${observ}</div>

              <div class="mt"><span class="label">Ciente e Concordo:</span> ________/______/__________</div>
            </div>

            <div class="footer-sign mt">
              <div class="ass-grid">
                <div class="ass">
                  <div class="ass-line"></div>
                  Assinatura do Empregado
                </div>
                <div class="ass">
                  <div class="ass-line"></div>
                  Assinatura do Empregador
                </div>
              </div>
              <div class="ass-grid" style="margin-top:20px">
                <div class="ass">
                  <div class="ass-line"></div>
                  Testemunha &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; CPF:
                </div>
                <div class="ass">
                  <div class="ass-line"></div>
                  Testemunha &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; CPF:
                </div>
              </div>
            </div>
          </div>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `;
  }

  function gerarOrientacao() {
    if (!t) return;
    if (!resumo.trim()) {
      alert("Preencha o Resumo / Observações para gerar a medida.");
      return;
    }

    const dataDoc = dataPtCompletaUpper(new Date());
    const nome = (t.motorista_nome || "—").toUpperCase();
    const registro = t.motorista_chapa || "";
    const cargo = cargoMotorista;
    const ocorrencia = (t.tipo_ocorrencia || "—").toUpperCase();
    const dataOcorr = t.data_ocorrido ? br(t.data_ocorrido) : "—";
    const observ = (resumo || t.descricao || "").trim() || "—";

    const html = renderGenericHtml({
      titulo: "ORIENTAÇÃO DISCIPLINAR",
      intro1:
        "Vimos pelo presente, aplicar-lhe a pena de orientação disciplinar, em virtude de o(a) senhor(a) ter cometido a falta abaixo descrita.",
      intro2:
        "Pedimos que tal falta não mais se repita, pois, caso contrário, seremos obrigados a adotar medidas mais severas que nos são facultadas pela lei.",
      nome,
      registro,
      cargo,
      ocorrencia,
      dataOcorr,
      observ,
      dataDoc,
    });

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  }

  function gerarAdvertencia() {
    if (!t) return;
    if (!resumo.trim()) {
      alert("Preencha o Resumo / Observações para gerar a medida.");
      return;
    }

    const dataDoc = dataPtCompletaUpper(new Date());
    const nome = (t.motorista_nome || "—").toUpperCase();
    const registro = t.motorista_chapa || "";
    const cargo = cargoMotorista;
    const ocorrencia = (t.tipo_ocorrencia || "—").toUpperCase();
    const dataOcorr = t.data_ocorrido ? br(t.data_ocorrido) : "—";
    const observ = (resumo || t.descricao || "").trim() || "—";

    const html = renderGenericHtml({
      titulo: "ADVERTÊNCIA DISCIPLINAR",
      intro1:
        "Vimos pelo presente, aplicar-lhe a pena de advertência disciplinar, em virtude de o(a) senhor(a) ter cometido a falta abaixo descrita.",
      intro2:
        "Pedimos que tal falta não mais se repita, pois, caso contrário, seremos obrigados a adotar medidas mais severas, nos termos da lei.",
      nome,
      registro,
      cargo,
      ocorrencia,
      dataOcorr,
      observ,
      dataDoc,
    });

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  }

  function gerarSuspensao() {
    if (!t) return;
    if (!resumo.trim()) {
      alert("Preencha o Resumo / Observações para gerar a medida.");
      return;
    }

    const dataDoc = dataPtCompletaUpper(new Date());
    const nome = (t.motorista_nome || "—").toUpperCase();
    const registro = t.motorista_chapa || "";
    const cargo = cargoMotorista;
    const ocorrencia = (t.tipo_ocorrencia || "—").toUpperCase();
    const dataOcorr = t.data_ocorrido ? br(t.data_ocorrido) : "—";
    const observ = (resumo || t.descricao || "").trim() || "—";

    const html = renderSuspensaoHtml({
      nome,
      registro,
      cargo,
      ocorrencia,
      dataOcorr,
      observ,
      dataDoc,
      dias: diasSusp,
      inicio: inicioSusp,
      fim: fimSusp,
      retorno: retornoSusp,
    });

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  }

  if (!t) return <div className="p-6">Carregando…</div>;

  // Evidências da solicitação
  const evidenciasSolicitacao =
    Array.isArray(t.evidencias_urls) && t.evidencias_urls.length > 0
      ? t.evidencias_urls
      : t.imagem_url
      ? [t.imagem_url]
      : [];

  const criadoPor = t.criado_por_nome || t.criado_por_login || "—";
  const criadoEm = brDateTime(t.created_at);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold mb-2">Tratar</h1>

      <div className="text-sm text-blue-700 mb-4">
        <span className="font-semibold">Criado por:</span> {criadoPor}{" "}
        <span className="mx-2 text-blue-300">•</span>
        <span className="font-semibold">Data/Hora:</span> {criadoEm}
      </div>

      <p className="text-gray-600 mb-6">
        Revise os dados, anexe o anexo da tratativa e gere a medida.
      </p>

      {/* ====== DETALHES ====== */}
      <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 className="text-lg font-semibold">Detalhes da tratativa</h2>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-md bg-yellow-500 px-3 py-2 text-white hover:bg-yellow-600"
            >
              Editar dados
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={salvarEdicao}
                disabled={loading}
                className="rounded-md bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                Salvar
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditForm({
                    tipo_ocorrencia: t.tipo_ocorrencia || "",
                    prioridade: t.prioridade || "Média",
                    setor_origem: t.setor_origem || "",
                    linha: t.linha || "",
                    descricao: t.descricao || "",
                  });
                }}
                className="rounded-md bg-gray-400 px-3 py-2 text-white hover:bg-gray-500"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Item titulo="Motorista" valor={`${t.motorista_nome || "-"}`} />
          <Item titulo="Registro" valor={t.motorista_chapa || "-"} />

          <Item
            titulo="Ocorrência"
            valor={
              isEditing ? (
                <input
                  className="w-full border rounded px-2 py-1"
                  value={editForm.tipo_ocorrencia}
                  onChange={(e) =>
                    setEditForm((s) => ({ ...s, tipo_ocorrencia: e.target.value }))
                  }
                />
              ) : (
                t.tipo_ocorrencia
              )
            }
          />

          <Item
            titulo="Prioridade"
            valor={
              isEditing ? (
                <select
                  className="w-full border rounded px-2 py-1"
                  value={editForm.prioridade}
                  onChange={(e) =>
                    setEditForm((s) => ({ ...s, prioridade: e.target.value }))
                  }
                >
                  <option>Baixa</option>
                  <option>Média</option>
                  <option>Alta</option>
                  <option>Gravíssima</option>
                </select>
              ) : (
                t.prioridade
              )
            }
          />

          <Item
            titulo="Setor"
            valor={
              isEditing ? (
                <input
                  className="w-full border rounded px-2 py-1"
                  value={editForm.setor_origem}
                  onChange={(e) =>
                    setEditForm((s) => ({ ...s, setor_origem: e.target.value }))
                  }
                />
              ) : (
                t.setor_origem
              )
            }
          />

          <Item
            titulo="Linha"
            valor={
              isEditing ? (
                <input
                  className="w-full border rounded px-2 py-1"
                  placeholder="Código ex.: 01TR ou NA"
                  value={editForm.linha}
                  onChange={(e) => setEditForm((s) => ({ ...s, linha: e.target.value }))}
                />
              ) : t.linha ? (
                t.linha === "NA" ? (
                  "— Não se aplica"
                ) : (
                  `${t.linha}${linhaDescricao ? ` - ${linhaDescricao}` : ""}`
                )
              ) : (
                "-"
              )
            }
          />

          <Item titulo="Status" valor={t.status} />
          <Item
            titulo="Data/Hora"
            valor={`${t.data_ocorrido || "-"} ${t.hora_ocorrido || ""}`}
          />

          <Item
            className="md:col-span-2"
            titulo="Descrição"
            valor={
              isEditing ? (
                <textarea
                  className="w-full border rounded px-2 py-1"
                  rows={3}
                  value={editForm.descricao}
                  onChange={(e) => setEditForm((s) => ({ ...s, descricao: e.target.value }))}
                />
              ) : (
                t.descricao || "-"
              )
            }
          />

          <div className="md:col-span-2">
            {renderListaArquivosCompacta(
              evidenciasSolicitacao,
              "Evidências da solicitação (reclamação)"
            )}
          </div>
        </dl>
      </div>

      {/* ====== CONCLUSÃO ====== */}
      <div className="bg-white rounded-lg shadow-sm p-5">
        <h2 className="text-lg font-semibold mb-3">Conclusão</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Ação aplicada</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={acao}
              onChange={(e) => setAcao(e.target.value)}
            >
              {acoes.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {acao === "Suspensão" && (
            <>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Dias de Suspensão</label>
                <select
                  className="w-full rounded-md border px-3 py-2"
                  value={diasSusp}
                  onChange={(e) => setDiasSusp(Number(e.target.value))}
                >
                  {[1, 3, 5, 7].map((d) => (
                    <option key={d} value={d}>
                      {d} dia(s)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Data da Suspensão (emissão)
                </label>
                <input
                  type="date"
                  className="w-full rounded-md border px-3 py-2"
                  value={dataSuspensao}
                  onChange={(e) => setDataSuspensao(e.target.value)}
                />
              </div>

              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Item titulo="Início" valor={br(inicioSusp)} />
                <Item titulo="Fim" valor={br(fimSusp)} />
                <Item titulo="Retorno" valor={br(retornoSusp)} />
              </div>
            </>
          )}
        </div>

        <div className="mt-4">
          <label className="block text-sm text-gray-600 mb-1">Resumo / Observações</label>
          <textarea
            rows={4}
            className="w-full rounded-md border px-3 py-2"
            value={resumo}
            onChange={(e) => setResumo(e.target.value)}
          />
        </div>

        {/* ✅ Agora só 1 anexo */}
        <div className="mt-4">
          <label className="block text-sm text-gray-600 mb-1">
            Anexo da Tratativa (opcional) — imagem ou PDF
          </label>

          <div
            ref={pasteAnexoRef}
            tabIndex={0}
            onPaste={onPasteAnexo}
            className="rounded-md border border-dashed p-3 bg-gray-50"
            title="Clique aqui e use Ctrl+V para colar um print"
          >
            <div className="text-xs text-gray-600">
              ✅ Você pode <b>colar um print (Ctrl+V)</b> aqui (imagem) ou selecionar arquivo abaixo.
            </div>
            <input
              type="file"
              accept="image/*,application/pdf"
              className="mt-2"
              onChange={(e) => setAnexo(e.target.files?.[0] || null)}
            />
          </div>

          <p className="text-xs text-gray-500 mt-1">
            Este anexo fica salvo no histórico (tratativas_detalhes) como “anexo_tratativa”.
          </p>

          {renderArquivoOuThumb(t.anexo_tratativa || null, "Anexo já anexado (se houver)")}
        </div>

        {/* (Opcional) Mantém visualização do que já existia como evidência principal,
            mas sem permitir anexar nova evidência na conclusão */}
        {renderArquivoOuThumb(t.imagem_tratativa || null, "Evidência já anexada (se houver)")}

        <div className="mt-4 flex gap-3 flex-wrap">
          <button
            onClick={concluir}
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Salvando…" : "Concluir"}
          </button>

          <button
            type="button"
            onClick={() => {
              if (acao === "Orientação") return gerarOrientacao();
              if (acao === "Advertência") return gerarAdvertencia();
              if (acao === "Suspensão") return gerarSuspensao();
              alert('Selecione "Orientação", "Advertência" ou "Suspensão" para gerar o documento.');
            }}
            className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
            title="Gerar documento conforme a ação selecionada"
          >
            GERAR MEDIDA DISCIPLINAR
          </button>
        </div>
      </div>
    </div>
  );
}

function Item({ titulo, valor, value, className }) {
  const v = value ?? valor;
  return (
    <div className={className}>
      <dt className="text-sm text-gray-600">{titulo}</dt>
      <dd className="font-medium break-words">{v}</dd>
    </div>
  );
}
