// src/components/CampoPrefixo.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

/**
 * CampoPrefixo
 * - Carrega prefixos da tabela `prefixos`
 * - Usa `codigo` como valor
 * - Ao selecionar, dispara:
 *    - onChange(codigo)
 *    - onChangeCluster(cluster)  ✅ (se fornecido)
 */
export default function CampoPrefixo({
  value,
  onChange,
  onChangeCluster,
  disabled = false,
  label = "Prefixo",
}) {
  const [loading, setLoading] = useState(false);
  const [opts, setOpts] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const { data, error } = await supabase
          .from("prefixos")
          .select("id, codigo, descricao, cluster")
          .order("codigo", { ascending: true });

        if (error) throw error;
        if (!mounted) return;
        setOpts(data || []);
      } catch (e) {
        console.error(e);
        if (!mounted) return;
        setErr(e?.message || "Erro ao carregar prefixos.");
        setOpts([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const mapByCodigo = useMemo(() => {
    const m = new Map();
    (opts || []).forEach((r) => {
      const codigo = String(r?.codigo || "").trim();
      if (codigo) m.set(codigo, r);
    });
    return m;
  }, [opts]);

  function handleChange(v) {
    const codigo = String(v || "").trim();

    // 1) atualiza o prefixo no pai
    onChange?.(codigo);

    // 2) atualiza cluster no pai (se existir)
    if (onChangeCluster) {
      const row = mapByCodigo.get(codigo);
      const cl = String(row?.cluster || "").trim();
      onChangeCluster(cl);
    }
  }

  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>

      <select
        className="w-full rounded-md border px-3 py-2 bg-white"
        value={String(value || "")}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled || loading}
      >
        <option value="">
          {loading ? "Carregando..." : "Selecione o prefixo"}
        </option>

        {(opts || []).map((p) => {
          const codigo = String(p?.codigo || "").trim();
          if (!codigo) return null;

          const desc = String(p?.descricao || "").trim();
          const labelOpt = desc ? `${codigo} — ${desc}` : codigo;

          return (
            <option key={p.id || codigo} value={codigo}>
              {labelOpt}
            </option>
          );
        })}
      </select>

      {err ? <div className="mt-1 text-xs text-red-600">{err}</div> : null}
    </div>
  );
}
