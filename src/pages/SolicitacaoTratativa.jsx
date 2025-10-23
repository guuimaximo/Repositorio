import { useState } from 'react'
import { supabase } from '../supabase'
import CampoMotorista from '../components/CampoMotorista'

const prioridades = ['Baixa', 'Média', 'Alta']
const statusInic = 'Pendente'

export default function SolicitacaoTratativa() {
  const [motorista, setMotorista] = useState({ chapa: '', nome: '' })
  const [form, setForm] = useState({
    tipo_ocorrencia: '',
    prioridade: 'Média',
    setor_origem: '',
    descricao: '',
    data_ocorrida: '',
    hora_ocorrida: '',
  })
  const [imgFile, setImgFile] = useState(null)
  const [loading, setLoading] = useState(false)

  async function salvar() {
    if (!motorista.chapa && !motorista.nome) {
      alert('Informe o motorista')
      return
    }
    setLoading(true)
    try {
      let imagem_url = null
      if (imgFile) {
        const nome = `oc_${Date.now()}_${imgFile.name}`
        const up = await supabase.storage.from('tratativas').upload(nome, imgFile)
        if (up.error) throw up.error
        const { data } = supabase.storage.from('tratativas').getPublicUrl(nome)
        imagem_url = data.publicUrl
      }

      const { error } = await supabase.from('tratativas').insert({
        motorista_chapa: motorista.chapa || null,
        motorista_nome: motorista.nome || null,
        tipo_ocorrencia: form.tipo_ocorrencia,
        prioridade: form.prioridade,
        setor_origem: form.setor_origem,
        descricao: form.descricao,
        status: statusInic,
        imagem_url,
        data_ocorrida: form.data_ocorrida || null,
        hora_ocorrida: form.hora_ocorrida || null,
      })
      if (error) throw error
      alert('Solicitação registrada!')
      setMotorista({ chapa: '', nome: '' })
      setForm({
        tipo_ocorrencia: '',
        prioridade: 'Média',
        setor_origem: '',
        descricao: '',
        data_ocorrida: '',
        hora_ocorrida: '',
      })
      setImgFile(null)
    } catch (e) {
      alert(`Erro: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold mb-4">Solicitar Tratativa</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg shadow-sm">
        <CampoMotorista value={motorista} onChange={setMotorista} />

        <div>
          <label className="block text-sm text-gray-600 mb-1">Tipo de Ocorrência</label>
          <input className="w-full rounded-md border px-3 py-2"
            value={form.tipo_ocorrencia}
            onChange={e => setForm({ ...form, tipo_ocorrencia: e.target.value })}
            placeholder="Ex.: Uso de celular, Excesso de velocidade…" />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Prioridade</label>
          <select className="w-full rounded-md border px-3 py-2"
            value={form.prioridade}
            onChange={e => setForm({ ...form, prioridade: e.target.value })}
          >
            {prioridades.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Setor de Origem</label>
          <input className="w-full rounded-md border px-3 py-2"
                 value={form.setor_origem}
                 onChange={e => setForm({ ...form, setor_origem: e.target.value })}
                 placeholder="Telemetria, CCO, Manutenção…" />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Data do ocorrido</label>
          <input type="date" className="w-full rounded-md border px-3 py-2"
                 value={form.data_ocorrida}
                 onChange={e => setForm({ ...form, data_ocorrida: e.target.value })} />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Hora do ocorrido</label>
          <input type="time" className="w-full rounded-md border px-3 py-2"
                 value={form.hora_ocorrida}
                 onChange={e => setForm({ ...form, hora_ocorrida: e.target.value })} />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm text-gray-600 mb-1">Descrição</label>
          <textarea rows={4} className="w-full rounded-md border px-3 py-2"
            value={form.descricao}
            onChange={e => setForm({ ...form, descricao: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Imagem (opcional)</label>
          <input type="file" accept="image/*" onChange={e => setImgFile(e.target.files?.[0] || null)} />
        </div>
      </div>

      <div className="mt-4">
        <button
          onClick={salvar}
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Salvando…' : 'Criar'}
        </button>
      </div>
    </div>
  )
}
