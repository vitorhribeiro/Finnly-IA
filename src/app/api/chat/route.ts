import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getAIContext } from '@/lib/data'
import OpenAI from 'openai'

const SYSTEM_PROMPT = `Você é o Finnly, um consultor financeiro pessoal com inteligência artificial. Você é direto, empático, claro e sempre contextualizado.

Regras obrigatórias:
- NUNCA responda de forma genérica. Sempre use os dados financeiros reais do usuário fornecidos no contexto.
- Responda sempre em português do Brasil, de forma natural e amigável.
- Use formatação simples: **negrito** para valores e termos importantes.
- Seja conciso (máx. 3 parágrafos), mas completo.
- Se o usuário não tiver dados suficientes, incentive-o a registrar receitas e despesas.
- Nunca invente dados que não estejam no contexto.
- Você pode calcular, comparar e dar recomendações específicas baseadas nos dados reais.`

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const message: string = body.message?.trim()
    const history: Array<{ role: 'user' | 'assistant'; content: string }> = body.history ?? []

    if (!message) {
      return NextResponse.json({ error: 'Mensagem inválida' }, { status: 400 })
    }

    // Contexto financeiro real do usuário
    const context = await getAIContext(user.id)

    // Fallback sem OpenAI key
    if (!process.env.OPENAI_API_KEY) {
      const fallback = getFallbackResponse(message, context)
      await saveConversation(supabase, user.id, message, fallback)
      return NextResponse.json({ answer: fallback })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `${SYSTEM_PROMPT}\n\n--- DADOS FINANCEIROS DO USUÁRIO ---\n${context}`,
      },
      // Inclui últimas 6 mensagens do histórico para contexto
      ...history.slice(-6).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 500,
      temperature: 0.7,
    })

    const answer = completion.choices[0]?.message?.content ?? 'Não consegui processar sua pergunta. Tente novamente.'

    await saveConversation(supabase, user.id, message, answer)

    return NextResponse.json({ answer })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[API/chat]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

async function saveConversation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  question: string,
  answer: string
) {
  await supabase.from('ai_conversations').insert({ user_id: userId, question, answer })
}

function getFallbackResponse(message: string, context: string): string {
  const msg = message.toLowerCase()
  const lines = context.split('\n').filter(Boolean)

  const getVal = (key: string) => {
    const line = lines.find(l => l.toLowerCase().startsWith(key.toLowerCase()))
    return line ? line.split(': ')[1] : null
  }

  const renda = getVal('Renda do mês')
  const despesas = getVal('Despesas do mês')
  const saldo = getVal('Saldo disponível')

  if (msg.includes('gastar') || msg.includes('disponível') || msg.includes('quanto')) {
    return `Seu **saldo disponível** este mês é de **${saldo ?? 'não calculado ainda'}**. ${renda ? `Sua renda registrada foi de **${renda}** e as despesas chegaram a **${despesas}**.` : 'Adicione suas receitas e despesas para um cálculo preciso.'} Posso te ajudar com mais alguma coisa?`
  }
  if (msg.includes('despesa') || msg.includes('gast')) {
    return `Suas **despesas do mês** somam **${despesas ?? 'R$ 0,00'}**. ${despesas && despesas !== 'R$ 0,00' ? 'Veja os detalhes na seção de Despesas para acompanhar por categoria.' : 'Você ainda não registrou despesas este mês. Comece registrando seus gastos!'}`
  }
  if (msg.includes('receita') || msg.includes('salário') || msg.includes('renda')) {
    return `Sua **renda registrada este mês** é de **${renda ?? 'R$ 0,00'}**. ${renda && renda !== 'R$ 0,00' ? 'Continue registrando todas as suas entradas para um histórico preciso.' : 'Adicione suas receitas na seção correspondente do dashboard.'}`
  }
  return `Entendido! Com base no seu perfil: **renda ${renda ?? 'não registrada'}**, **despesas ${despesas ?? 'não registradas'}** e **saldo ${saldo ?? 'a calcular'}**. Para análises mais detalhadas, configure sua chave da OpenAI nas variáveis de ambiente. Posso ajudar com mais alguma coisa?`
}
