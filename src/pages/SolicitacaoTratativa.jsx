import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function SolicitacaoTratativa() {
  const [motorista, setMotorista] = useState('')
  const [setorOrigem, setSetorOrigem] = useState('Telemetria')
  const [tipo, setTipo] = useState('Excesso de velocidade')
  const [prioridade, setPrioridade] = useState('Média')
  const [descricao, setDescricao] = useState('')
  const [files, setFiles] = useState([])
  const [meuEmail, setMeuEmail] = useState('')
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setMeuEmail(data?.user?.email ?? '')
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setOk(''); setErr('')
    if (!motorista.trim()) return setErr('Informe o motorista.')

    // 1) cria tratativa
    const { data: nova, error: e1 } = await supabase.from('tratativas').insert({
      motorista, setor_origem: setorOrigem, tipo, prioridade, descricao, created_by_email: meuEmail
    }).select('id').single()
    if (e1) return setErr(e1.message)

    // 2) upload imagens (máx 3)
    const max = Math.min(files.length, 3)
    for (let i = 0; i < max; i++) {
      const f = files[i]
      const path = `${nova.id}/${Date.now()}-${f.name}`
      const up = await supabase.storage.from('tratativas').upload(path, f, { cacheControl: '3600', upsert: false })
      if (up.error) continue
      const pub = supabase.storage.from('tratativas').getPublicUrl(path)
      await supabase.from('tratativa_imagens').insert({ tratativa_id: nova.id, path, url: pub.data.publicUrl })
    }

    setMotorista(''); setTipo('Excesso de velocidade'); setPrioridade('Média'); setDescricao(''); setFiles([])
    setOk('Solicitação enviada com sucesso.')
  }

  return (
    <div className="max-w-5xl mx-auto p-4 grid gap-4">
      <div className="bg-white border rounded-xl p-4">
        <h2 className="font-semibold mb-3">Solicitação de Tratativa</h2>
        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-600">Motorista</label>
            <input className="w-full border rounded-md px-3 py-2" value={motorista} onChange={e=>setMotorista(e.target.value)} placeholder="Nome ou crachá" required />
          </div>
          <div>
            <label className="text-sm text-slate-600">Setor de origem</label>
            <select className="w-full border rounded-md px-3 py-2" value={setorOrigem} onChange={e=>setSetorOrigem(e.target.value)}>
              <option>Telemetria</option>
              <option>Plantão</option>
              <option>Manutenção</option>
              <option>Monitoramento</option>
              <option>Outros</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-600">Tipo de ocorrência</label>
            <input className="w-full border rounded-md px-3 py-2" value={tipo} onChange={e=>setTipo(e.target.value)} placeholder="Ex.: Excesso de velocidade" />
          </div>
          <div>
            <label className="text-sm text-slate-600">Prioridade</label>
            <select className="w-full border rounded-md px-3 py-2" value={prioridade} onChange={e=>setPrioridade(e.target.value)}>
              <option>Baixa</option><option>Média</option><option>Alta</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-slate-600">Descrição</label>
            <textarea className="w-full border rounded-md px-3 py-2" rows={3} value={descricao} onChange={e=>setDescricao(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-slate-600">Imagens (até 3)</label>
            <input type="file" multiple accept="image/*" onChange={e=>setFiles(Array.from(e.target.files||[]))} />
          </div>
          {err && <div className="text-red-600 text-sm md:col-span-2">{err}</div>}
          {ok && <div className="text-green-600 text-sm md:col-span-2">{ok}</div>}
          <div className="md:col-span-2">
            <button className="bg-sky-600 text-white rounded-md px-4 py-2">Enviar solicitação</button>
          </div>
        </form>
      </div>
    </div>
  )
}
