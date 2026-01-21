import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

function toNumberSafe(v) {
  if (v === null || v === undefined) return 0;
  const s = String(v).trim();
  if (!s) return 0;
  const br = s.replace(/\./g, "").replace(",", ".");
  const n = Number(br);
  return Number.isFinite(n) ? n : 0;
}

// GET /premiacao/resumo?chapa=30002393&inicio=2025-05-01&fim=2025-05-31
router.get("/premiacao/resumo", async (req, res) => {
  try {
    const chapa = String(req.query.chapa || "").trim();
    const inicio = String(req.query.inicio || "").trim();
    const fim = String(req.query.fim || "").trim();

    if (!chapa || !inicio || !fim) {
      return res.status(400).json({ error: "Informe chapa, inicio e fim (YYYY-MM-DD)." });
    }

    const { data, error } = await sb
      .from("premiacao_diaria")
      .select("dia, veiculo, km_rodado, combustivel_consumido")
      .eq("motorista", chapa)
      .gte("dia", inicio)
      .lte("dia", fim)
      .limit(20000);

    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    const byV = new Map();
    const diasTotal = new Set();

    for (const r of rows) {
      const veiculo = String(r?.veiculo || "").trim() || "SEM_VEICULO";
      const km = toNumberSafe(r?.km_rodado);
      const litros = toNumberSafe(r?.combustivel_consumido);
      const dia = r?.dia ? String(r.dia) : null;
      if (dia) diasTotal.add(dia);

      const cur = byV.get(veiculo) || { veiculo, km: 0, litros: 0, dias: new Set() };
      cur.km += km;
      cur.litros += litros;
      if (dia) cur.dias.add(dia);
      byV.set(veiculo, cur);
    }

    const veiculos = Array.from(byV.values())
      .map((x) => ({
        veiculo: x.veiculo,
        dias: x.dias.size,
        km: x.km,
        litros: x.litros,
        kml: x.litros > 0 ? x.km / x.litros : 0,
      }))
      .sort((a, b) => b.km - a.km);

    const totalKm = veiculos.reduce((s, x) => s + x.km, 0);
    const totalLitros = veiculos.reduce((s, x) => s + x.litros, 0);

    return res.json({
      chapa,
      inicio,
      fim,
      totais: {
        dias: diasTotal.size,
        km: totalKm,
        litros: totalLitros,
        kml: totalLitros > 0 ? totalKm / totalLitros : 0,
      },
      veiculos,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "Erro ao consultar premiacao_diaria." });
  }
});

export default router;
