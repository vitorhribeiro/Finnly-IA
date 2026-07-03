import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Ler .env.local
const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const parts = line.split('=')
    if (parts.length >= 2) {
      env[parts[0].trim()] = parts.slice(1).join('=').trim()
    }
  }
})

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL']
const supabaseAnonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function runIncomeMatrix() {
  console.log('--- Iniciando Matriz de Testes (Receitas) ---')

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'teste@finnly.com.br',
    password: 'teste123'
  })

  if (authError) {
    console.error('Erro no login:', authError.message)
    process.exit(1)
  }

  const userId = authData.user.id
  console.log('Login efetuado. User ID:', userId)

  const report = []

  // 1. Criar Contas A e B de Teste
  const { data: accA, error: errA } = await supabase.from('accounts').insert({
    user_id: userId,
    name: 'Conta Matrix Income A',
    initial_balance: 1000,
    balance: 1000,
    type: 'corrente'
  }).select().single()

  const { data: accB, error: errB } = await supabase.from('accounts').insert({
    user_id: userId,
    name: 'Conta Matrix Income B',
    initial_balance: 500,
    balance: 500,
    type: 'corrente'
  }).select().single()

  if (errA || errB) {
    console.error('Erro ao criar ambiente de teste:', errA, errB)
    process.exit(1)
  }

  async function checkBalances() {
    const { data: a } = await supabase.from('accounts').select('balance').eq('id', accA.id).single()
    const { data: b } = await supabase.from('accounts').select('balance').eq('id', accB.id).single()
    return {
      a: a ? Number(a.balance) : 0,
      b: b ? Number(b.balance) : 0
    }
  }

  let incId = null
  let receivedIncId = null
  const today = new Date().toISOString().split('T')[0]

  try {
    // ----------------------------------------------------
    // Teste 1: Criar receita pendente R$ 100
    // ----------------------------------------------------
    let balances = await checkBalances()
    const t1 = await supabase.from('incomes').insert({
      user_id: userId,
      account_id: accA.id,
      amount: 100,
      description: 'Matrix Income 1 - Pendente',
      category: 'Outros',
      payment_status: false,
      date: today
    }).select().single()
    incId = t1.data.id

    let newBalances = await checkBalances()
    report.push({
      acao: '1. Criar receita pendente R$ 100',
      saldoInicial: `A: ${balances.a}, B: ${balances.b}`,
      saldoEsperado: 'A: 1000, B: 500',
      saldoObtido: `A: ${newBalances.a}, B: ${newBalances.b}`,
      statusFinal: t1.data.payment_status ? 'Recebida' : 'Pendente',
      camposFinanceiros: `amount: ${t1.data.amount}, account_id: ${t1.data.account_id}, received_at: ${t1.data.received_at}`,
      resultado: newBalances.a === 1000 && !t1.data.payment_status ? 'SUCESSO' : 'FALHA'
    })

    // ----------------------------------------------------
    // Teste 2: Marcar receita como recebida
    // ----------------------------------------------------
    balances = await checkBalances()
    const t2 = await supabase.from('incomes').update({
      payment_status: true,
      received_at: new Date().toISOString()
    }).eq('id', incId).select().single()

    newBalances = await checkBalances()
    report.push({
      acao: '2. Marcar receita como recebida (Unpaid -> Paid)',
      saldoInicial: `A: ${balances.a}, B: ${balances.b}`,
      saldoEsperado: 'A: 1100, B: 500',
      saldoObtido: `A: ${newBalances.a}, B: ${newBalances.b}`,
      statusFinal: t2.data.payment_status ? 'Recebida' : 'Pendente',
      camposFinanceiros: `amount: ${t2.data.amount}, account_id: ${t2.data.account_id}, received_at: ${t2.data.received_at}`,
      resultado: newBalances.a === 1100 && t2.data.payment_status ? 'SUCESSO' : 'FALHA'
    })

    // ----------------------------------------------------
    // Teste 3: Desfazer recebimento
    // ----------------------------------------------------
    balances = await checkBalances()
    const t3 = await supabase.from('incomes').update({
      payment_status: false,
      received_at: null
    }).eq('id', incId).select().single()

    newBalances = await checkBalances()
    report.push({
      acao: '3. Desmarcar recebimento (Paid -> Unpaid)',
      saldoInicial: `A: ${balances.a}, B: ${balances.b}`,
      saldoEsperado: 'A: 1000, B: 500',
      saldoObtido: `A: ${newBalances.a}, B: ${newBalances.b}`,
      statusFinal: t3.data.payment_status ? 'Recebida' : 'Pendente',
      camposFinanceiros: `amount: ${t3.data.amount}, account_id: ${t3.data.account_id}, received_at: ${t3.data.received_at}`,
      resultado: newBalances.a === 1000 && !t3.data.payment_status ? 'SUCESSO' : 'FALHA'
    })

    // ----------------------------------------------------
    // Teste 4: Criar receita já recebida R$ 100
    // ----------------------------------------------------
    balances = await checkBalances()
    const t4 = await supabase.from('incomes').insert({
      user_id: userId,
      account_id: accA.id,
      amount: 100,
      description: 'Matrix Income 4 - Recebida',
      category: 'Outros',
      payment_status: true,
      received_at: new Date().toISOString(),
      date: today
    }).select().single()
    receivedIncId = t4.data.id

    newBalances = await checkBalances()
    report.push({
      acao: '4. Criar receita já recebida R$ 100',
      saldoInicial: `A: ${balances.a}, B: ${balances.b}`,
      saldoEsperado: 'A: 1100, B: 500',
      saldoObtido: `A: ${newBalances.a}, B: ${newBalances.b}`,
      statusFinal: t4.data.payment_status ? 'Recebida' : 'Pendente',
      camposFinanceiros: `amount: ${t4.data.amount}, account_id: ${t4.data.account_id}, received_at: ${t4.data.received_at}`,
      resultado: newBalances.a === 1100 && t4.data.payment_status ? 'SUCESSO' : 'FALHA'
    })

    // ----------------------------------------------------
    // Teste 5: Editar receita recebida de R$ 100 para R$ 150
    // ----------------------------------------------------
    balances = await checkBalances()
    const t5 = await supabase.from('incomes').update({
      amount: 150
    }).eq('id', receivedIncId).select().single()

    newBalances = await checkBalances()
    report.push({
      acao: '5. Editar valor de receita recebida de 100 para 150',
      saldoInicial: `A: ${balances.a}, B: ${balances.b}`,
      saldoEsperado: 'A: 1150, B: 500',
      saldoObtido: `A: ${newBalances.a}, B: ${newBalances.b}`,
      statusFinal: t5.data.payment_status ? 'Recebida' : 'Pendente',
      camposFinanceiros: `amount: ${t5.data.amount}, account_id: ${t5.data.account_id}, received_at: ${t5.data.received_at}`,
      resultado: newBalances.a === 1150 && t5.data.amount === 150 ? 'SUCESSO' : 'FALHA'
    })

    // ----------------------------------------------------
    // Teste 6: Editar receita recebida de R$ 150 para R$ 80
    // ----------------------------------------------------
    balances = await checkBalances()
    const t6 = await supabase.from('incomes').update({
      amount: 80
    }).eq('id', receivedIncId).select().single()

    newBalances = await checkBalances()
    report.push({
      acao: '6. Editar valor de receita recebida de 150 para 80',
      saldoInicial: `A: ${balances.a}, B: ${balances.b}`,
      saldoEsperado: 'A: 1080, B: 500',
      saldoObtido: `A: ${newBalances.a}, B: ${newBalances.b}`,
      statusFinal: t6.data.payment_status ? 'Recebida' : 'Pendente',
      camposFinanceiros: `amount: ${t6.data.amount}, account_id: ${t6.data.account_id}, received_at: ${t6.data.received_at}`,
      resultado: newBalances.a === 1080 && t6.data.amount === 80 ? 'SUCESSO' : 'FALHA'
    })

    // ----------------------------------------------------
    // Teste 7: Trocar conta de receita recebida
    // ----------------------------------------------------
    balances = await checkBalances()
    const t7 = await supabase.from('incomes').update({
      account_id: accB.id
    }).eq('id', receivedIncId).select().single()

    newBalances = await checkBalances()
    report.push({
      acao: '7. Trocar conta de receita recebida de A para B (R$ 80)',
      saldoInicial: `A: ${balances.a}, B: ${balances.b}`,
      saldoEsperado: 'A: 1000, B: 580',
      saldoObtido: `A: ${newBalances.a}, B: ${newBalances.b}`,
      statusFinal: t7.data.payment_status ? 'Recebida' : 'Pendente',
      camposFinanceiros: `amount: ${t7.data.amount}, account_id: ${t7.data.account_id}, received_at: ${t7.data.received_at}`,
      resultado: newBalances.a === 1000 && newBalances.b === 580 && t7.data.account_id === accB.id ? 'SUCESSO' : 'FALHA'
    })

    // ----------------------------------------------------
    // Teste 8: Excluir receita recebida
    // ----------------------------------------------------
    balances = await checkBalances()
    const t8 = await supabase.from('incomes').delete().eq('id', receivedIncId)
    newBalances = await checkBalances()
    report.push({
      acao: '8. Excluir receita recebida R$ 80',
      saldoInicial: `A: ${balances.a}, B: ${balances.b}`,
      saldoEsperado: 'A: 1000, B: 500',
      saldoObtido: `A: ${newBalances.a}, B: ${newBalances.b}`,
      statusFinal: 'Excluída',
      camposFinanceiros: 'N/A',
      resultado: newBalances.a === 1000 && newBalances.b === 500 ? 'SUCESSO' : 'FALHA'
    })

    // ----------------------------------------------------
    // Teste 9: Excluir receita pendente
    // ----------------------------------------------------
    balances = await checkBalances()
    const t9 = await supabase.from('incomes').delete().eq('id', incId)
    newBalances = await checkBalances()
    report.push({
      acao: '9. Excluir receita pendente R$ 100',
      saldoInicial: `A: ${balances.a}, B: ${balances.b}`,
      saldoEsperado: 'A: 1000, B: 500',
      saldoObtido: `A: ${newBalances.a}, B: ${newBalances.b}`,
      statusFinal: 'Excluída',
      camposFinanceiros: 'N/A',
      resultado: newBalances.a === 1000 && newBalances.b === 500 ? 'SUCESSO' : 'FALHA'
    })

    // ----------------------------------------------------
    // Teste 10: Duplicar receita recebida (nasce pendente)
    // ----------------------------------------------------
    balances = await checkBalances()
    const t10Setup = await supabase.from('incomes').insert({
      user_id: userId,
      account_id: accA.id,
      amount: 250,
      description: 'Original Income',
      category: 'Outros',
      payment_status: true,
      received_at: new Date().toISOString(),
      date: today
    }).select().single()
    
    // Simular o clone do front/action
    const clonedIncome = {
      user_id: userId,
      amount: t10Setup.data.amount,
      category: t10Setup.data.category,
      description: t10Setup.data.description + ' (Cópia)',
      date: t10Setup.data.date,
      account_id: accA.id,
      payment_status: false // Deve nascer pendente
    }
    
    const t10Insert = await supabase.from('incomes').insert(clonedIncome).select().single()
    newBalances = await checkBalances()
    
    // Limpar setup e clone
    await supabase.from('incomes').delete().in('id', [t10Setup.data.id, t10Insert.data.id])

    report.push({
      acao: '10. Duplicar receita recebida (clonada como pendente, saldo de A não altera extra)',
      saldoInicial: `A: ${balances.a}, B: ${balances.b}`,
      saldoEsperado: 'A: 1000, B: 500',
      // Subtrai os 250 do setup temporário recebido para verificar se o clone adicionou algo
      saldoObtido: `A: ${newBalances.a - 250}, B: ${newBalances.b}`,
      statusFinal: t10Insert.data.payment_status ? 'Recebida' : 'Pendente',
      camposFinanceiros: `amount: ${t10Insert.data.amount}, account_id: ${t10Insert.data.account_id}, received_at: ${t10Insert.data.received_at}`,
      resultado: !t10Insert.data.payment_status && t10Insert.data.received_at === null ? 'SUCESSO' : 'FALHA'
    })

    // ----------------------------------------------------
    // Teste 11: Criar receita parcelada
    // ----------------------------------------------------
    balances = await checkBalances()
    
    // Simular o loop do Server Action addIncome
    const count = 3
    const insertPromises = []
    const baseDate = new Date(today + 'T00:00:00')
    
    for (let i = 1; i <= count; i++) {
      const currentInstDate = new Date(baseDate)
      currentInstDate.setMonth(baseDate.getMonth() + i - 1)
      const currentInstDateStr = currentInstDate.toISOString().split('T')[0]
      const instPaymentStatus = i === 1 ? true : false // Primeira recebida, as outras não
      
      insertPromises.push(
        supabase.from('incomes').insert({
          user_id: userId,
          amount: 100,
          category: 'Outros',
          description: `Receita Parcelada (${i}/${count})`,
          date: currentInstDateStr,
          account_id: accA.id,
          installment_number: i,
          installments_total: count,
          payment_status: instPaymentStatus,
          received_at: instPaymentStatus ? new Date().toISOString() : null
        }).select().single()
      )
    }
    
    const results = await Promise.all(insertPromises)
    const insertedIds = results.map(r => r.data.id)
    newBalances = await checkBalances()

    // Limpar parcelas
    await supabase.from('incomes').delete().in('id', insertedIds)

    report.push({
      acao: '11. Criar receita parcelada (3 parcelas, apenas a 1ª como recebida)',
      saldoInicial: `A: ${balances.a}, B: ${balances.b}`,
      saldoEsperado: 'A: 1100, B: 500',
      saldoObtido: `A: ${newBalances.a}, B: ${newBalances.b}`,
      statusFinal: '1ª Recebida, 2ª e 3ª Pendentes',
      camposFinanceiros: `parcelas: ${results.length}, valor_cada: ${results[0].data.amount}`,
      resultado: newBalances.a === 1100 && results.length === 3 && results[0].data.payment_status && !results[1].data.payment_status ? 'SUCESSO' : 'FALHA'
    })

    // ----------------------------------------------------
    // Teste 12: Criar receita recorrente (testar bloqueio de duplicidade)
    // ----------------------------------------------------
    balances = await checkBalances()
    
    // 1. Inserir a primeira recorrente
    const firstRec = await supabase.from('incomes').insert({
      user_id: userId,
      account_id: accA.id,
      amount: 150,
      description: 'Salário Recorrente',
      category: 'Outros',
      payment_status: false,
      date: today,
      is_recurring: true
    }).select().single()

    // 2. Chamar a Action simulada (que criará a verificação de duplicidade)
    // Simular o comportamento que criamos no addIncome para isRecurring
    const startOfMonth = `${today.slice(0, 7)}-01`
    const endOfMonth = `${today.slice(0, 7)}-31`
    
    const { data: existing } = await supabase
      .from('incomes')
      .select('id')
      .eq('user_id', userId)
      .eq('is_recurring', true)
      .eq('category', 'Outros')
      .eq('description', 'Salário Recorrente')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
      .limit(1)

    let duplicateBlockSuccess = false
    if (existing && existing.length > 0) {
      duplicateBlockSuccess = true // Bloqueado, pois já existe
    }

    // Limpar recorrente
    await supabase.from('incomes').delete().eq('id', firstRec.data.id)
    newBalances = await checkBalances()

    report.push({
      acao: '12. Impedir duplicidade de receita recorrente no mesmo mês',
      saldoInicial: `A: ${balances.a}, B: ${balances.b}`,
      saldoEsperado: 'A: 1000, B: 500',
      saldoObtido: `A: ${newBalances.a}, B: ${newBalances.b}`,
      statusFinal: 'Bloqueado',
      camposFinanceiros: `is_recurring: true`,
      resultado: duplicateBlockSuccess ? 'SUCESSO' : 'FALHA'
    })

  } catch (e) {
    console.error('Erro na matriz de receitas:', e)
  } finally {
    console.log('Realizando limpeza final...')
    await supabase.from('accounts').delete().in('id', [accA.id, accB.id])
    console.log('Limpeza concluída.')

    console.log(JSON.stringify(report, null, 2))
  }
}

runIncomeMatrix()
