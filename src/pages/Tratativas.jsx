import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const Tratativas = ({ user }) => {
  const [motorista, setMotorista] = useState('')
  const [tipo, setTipo] = useState('Telemetria')
  const [prioridade, setPrioridade] = useState('Média')
  const [descricao, setDescricao] = useState('')
  const [imagem, setImagem] = useState(null)
  const [tratativas, setTratativas] = useState([])

  // 🔄 Carrega tratativas do usuário logado
  useEffect(() => {
    const fetchTratativas = async () => {
      const { data, error } = await supabase
        .from('tratativas')
        .select('*')
        .eq('created_by_email', user.email)
        .order('created_at', { ascending: false })

      if (error) console.error('❌ Erro ao carregar tratativas:', error)
      else setTratativas(data)
    }

    if (user?.email) fetchTratativas()
  }, [user])

  // 📤 Upload de imagem para o bucket "tratativas"
  const uploadImagem = async (file) => {
    try {
      const fileName = `${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('tratativas')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('tratativas')
        .getPublicUrl(fileName)

      return urlData.publicUrl
    } catch (error) {
      console.error('❌ Erro no upload da imagem:', error)
      return null
    }
  }

  // 🧾 Cria nova tratativa
  const criarTratativa = async () => {
    if (!motorista || !descricao) {
      alert('Preencha o nome do motorista e a descrição!')
      return
    }

    let imagemUrl = null
    if (imagem) {
      imagemUrl = await uploadImagem(imagem)
    }

    const { error } = await supabase.from('tratativas').insert([
      {
        motorista,
        tipo,
        prioridade,
        descricao,
        imagem_url: imagemUrl,
        status: 'Pendente',
        responsavel: '-',
        created_by_email: user.email,
      },
    ])

    if (error) {
      console.error('❌ Erro ao criar tratativa:', error)
      alert('Erro ao criar a tratativa.')
    } else {
      alert('✅ Tratativa criada com sucesso!')
      setMotorista('')
      setDescricao('')
      setImagem(null)
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">📋 Solicitação de Tratativas</h2>

      {/* Formulário */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="grid grid-cols-2 gap-4 mb-3">
          <input
            type="text"
            placeholder="Motorista"
            value={motorista}
            onChange={(e) => setMotorista(e.target.value)}
            className="border p-2 rounded-lg"
          />

          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="border p-2 rounded-lg"
          >
            <option>Telemetria</option>
            <option>Frota</option>
            <option>Segurança</option>
            <option>Outros</option>
          </select>

          <select
            value={prioridade}
            onChange={(e) => setPrioridade(e.target.value)}
            className="border p-2 rounded-lg"
          >
            <option>Baixa</option>
            <option>Média</option>
            <option>Alta</option>
          </select>

          <input
            type="file"
            onChange={(e) => setImagem(e.target.files[0])}
            className="border p-2 rounded-lg"
          />
        </div>

        <textarea
          placeholder="Descrição da ocorrência"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="w-full border p-2 rounded-lg mb-3"
          rows="3"
        />

        <button
          onClick={criarTratativa}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Criar Tratativa
        </button>
      </div>

      {/* Lista */}
      <h3 className="text-lg font-semibold mb-2">🧾 Minhas Tratativas</h3>
      <div className="bg-white rounded-xl shadow p-3">
        {tratativas.length === 0 ? (
          <p>Nenhuma tratativa encontrada.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b">
                <th className="p-2">Motorista</th>
                <th className="p-2">Tipo</th>
                <th className="p-2">Prioridade</th>
                <th className="p-2">Status</th>
                <th className="p-2">Data</th>
              </tr>
            </thead>
            <tbody>
              {tratativas.map((t) => (
                <tr key={t.id} className="border-b hover:bg-gray-100">
                  <td className="p-2">{t.motorista}</td>
                  <td className="p-2">{t.tipo}</td>
                  <td className="p-2">{t.prioridade}</td>
                  <td className="p-2">{t.status}</td>
                  <td className="p-2">
                    {new Date(t.created_at).toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default Tratativas
