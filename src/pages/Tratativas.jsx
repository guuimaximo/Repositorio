import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Tratativas() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ motorista_id: '', setor_origem:'telemetria', tipo_ocorrencia:'excesso_velocidade', descricao:'', prioridade:'media' })
  const [motoristas, setMotoristas] = useState([])

  useEffect(() => {
    (async () => {
      const m = await supabase.from('motoristas').select('id,nome,cracha').order('nome')
      setMotoristas(m.data ?? [])
      await reload()
    })()
  }, [])

  async function reload() {
    setLoading(true)
    const { data } = await supabase
      .from('tratativas')
      .select('id, status, prioridade, tipo_ocorrencia, responsavel, data_abertura, motoristas(nome,cracha)')
      .order('data_abertura', { ascending:false })
    setRows(data ?? [])
    setLoading(false)
  }

  async function criar(e) {
    e.preventDefault()
    if (!form.motorista_id) return
    await supabase.from('tratativas').insert({
      motorista_id: form.motorista_id,
      setor_origem: form.setor_origem,
      tipo_ocorrencia: form.tipo_ocorrencia,
      descricao: form.descricao,
      prioridade: form.prioridade,
      status: 'pendente'
    })
    setForm({ motorista_id:'', setor_origem:'telemetria', tipo_ocorrencia:'excesso_velocidade', descricao:'', prioridade:'media' })
    await reload()
  }

  return (
    <div className="max-w-6xl mx-auto p-4 grid gap-4">
      <div className="bg-white border rounded-xl p-4">
        <h2 className="font-semibold mb-3">Nova tratativa</h2>
        <form onSubmit={criar} className="grid md:grid-cols-5 gap-3">
          <select className="border rounded-md px-3 py-2" value={form.motorista_id} onChange={e=>setForm({...form, motorista_id:e.target.value})} required>
            <option value="">Selecione o motorista</option>
            {motoristas.map(m=>(
              <option key={m.id} value={m.id}>{m.nome} — {m.cracha}</option>
            ))}
          </select>
          <select className="border rounded-md px-3 py-2" value={form.setor_origem} onChange={e=>setForm({...form, setor_origem:e.target.value})}>
            <option value="manutencao">Manutenção</option>
            <option value="plantao">Plantão</option>
            <option value="monitoramento">Monitoramento</option>
            <option value="telemetria">Telemetria</option>
            <option value="tratativas">Tratativas</option>
          </select>
          <input className="border rounded-md px-3 py-2" placeholder="Tipo de ocorrência" value={form.tipo_ocorrencia} onChange={e=>setForm({...form, tipo_ocorrencia:e.target.value})}/>
          <select className="border rounded-md px-3 py-2" value={form.prioridade} onChange={e=>setForm({...form, prioridade:e.target.value})}>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
          </select>
          <button className="bg-sky-600 text-white rounded-md px-4">Criar</button>
          <textarea className="md:col-span-5 border rounded-md px-3 py-2" placeholder="Descrição" value={form.descricao} onChange={e=>setForm({...form, descricao:e.target.value})}/>
        </form>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h2 className="font-semibold mb-3">Lista de tratativas</h2>
        {loading ? 'Carregando...' : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2">Motorista</th>
                  <th>Tipo</th>
                  <th>Prioridade</th>
                  <th>Status</th>
                  <th>Responsável</th>
                  <th>Abertura</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r=>(
                  <tr key={r.id} className="border-t">
                    <td className="py-2">{r.motoristas?.nome}</td>
                    <td>{r.tipo_ocorrencia}</td>
                    <td className="capitalize">{r.prioridade}</td>
                    <td className="capitalize">{r.status.replace('_',' ')}</td>
                    <td>{r.responsavel ?? '-'}</td>
                    <td>{new Date(r.data_abertura).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
                {rows.length===0 && (
                  <tr><td colSpan="6" className="py-6 text-center text-slate-500">Nenhuma tratativa cadastrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
