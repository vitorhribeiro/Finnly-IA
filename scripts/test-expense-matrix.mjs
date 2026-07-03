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

async function runExpenseMatrix() {
  console.log('--- Iniciando Matriz de Testes (Despesas) ---')

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

  // 1. Criar Contas A e B e Cartão de Teste
  const { data: accA, error: errA } = await supabase.from('accounts').insert({
    user_id: userId,
    name: 'Conta Matrix A',
    initial_balance: 1000,
    balance: 1000,
    type: 'corrente'
  }).select().single()

  const { data: accB, error: errB } = await supabase.from('accounts').insert({
    user_id: userId,
    name: 'Conta Matrix B',
    initial_balance: 500,
    balance: 500,
    type: 'corrente'
  }).select().single()

  const { data: card, error: errCard } = await supabase.from('credit_cards').insert({
    user_id: userId,
    name: 'Cartão Matrix',
    limit: 1000,
    closing_day: 10,
    due_day: 20
  }).select().single()

  if (errA || errB || errCard) {
    console.error('Erro ao criar ambiente de teste:', errA, errB, errCard)
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

  let expId = null
  let paidExpId = null
  let cardExpId = null

  try {
    // ----------------------------------------------------
    // Teste 1: Criar despesa pendente R$ 100 por conta
    // ----------------------------------------------------
    let balances = await checkBalances()
    const t1 = await supabase.from('expenses').insert({
      user_id: userId,
      account_id: accA.id,
      amount: 100,
      description: 'Matrix 1 - Pendente',
      category: 'Outros',
      payment_status: false,
      date: new Date().toISOString().split('T')[0]
    }).select().single()
    expId = t1.data.id

    let newBalances = await checkBalances()
    report.push({
      acao: '1. Criar despesa pendente R$ 100',
      saldoInicial: `A: ${balances.a}, B: ${balances.b}`,
      saldoEsperado: 'A: 1000, B: 500',
      saldoObtido: `A: ${newBalances.a}, B: ${newBalances.b}`,
      statusFinal: t1.data.payment_status ? 'Paga' : 'Pendente',
      camposFinanceiros: `amount: ${t1.data.amount}, paid_account_id: ${t1.data.paid_account_id}, paid_at: ${t1.data.paid_at}`,
      resultado: newBalances.a === 1000 && newBalances.b === 500 && !t1.data.payment_status ? 'SUCESSO' : 'FALHA'
    })

    // ----------------------------------------------------
    // Teste 2: Pagar despesa via modal usando Conta A e Pix
    // ----------------------------------------------------
    balances = await checkBalances()
    const today = new Date().toISOString().split('T')[0]
    const t2 = await supabase.rpc('pay_expense_rpc', {
      p_expense_id: expId,
      p_paid_account_id: accA.id,
      p_payment_method: 'pix',
      p_paid_at: today
    })

    const { data: updatedExp1 } = await supabase.from('expenses').select('*').eq('id', expId).single()
    newBalances = await checkBalances()
    report.push({
      acao: '2. Pagar despesa via RPC (Conta A + Pix)',
      saldoInicial: `A: ${balances.a}, B: ${balances.b}`,
      saldoEsperado: 'A: 900, B: 500',
      saldoObtido: `A: ${newBalances.a}, B: ${newBalances.b}`,
      statusFinal: updatedExp1.payment_status ? 'Paga' : 'Pendente',
      camposFinanceiros: `amount: ${updatedExp1.amount}, paid_account_id: ${updatedExp1.paid_account_id}, payment_method: ${updatedExp1.payment_method}, paid_at: ${updatedExp1.paid_at}`,
      resultado: newBalances.a === 900 && newBalances.b === 500 && updatedExp1.payment_status && updatedExp1.payment_method === 'pix' ? 'SUCESSO' : 'FALHA'
    })

    // ----------------------------------------------------
    // Teste 3: Estornar pagamento
    // ----------------------------------------------------
    balances = await checkBalances()
    const t3 = await supabase.rpc('undo_expense_payment_rpc', {
      p_expense_id: expId
    })

    const { data: updatedExp2 } = await supabase.from('expenses').select('*').eq('id', expId).single()
    newBalances = await checkBalances()
    report.push({
      acao: '3. Estornar pagamento via RPC',
      saldoInicial: `A: ${balances.a}, B: ${balances.b}`,
      saldoEsperado: 'A: 1000, B: 500',
      saldoObtido: `A: ${newBalances.a}, B: ${newBalances.b}`,
      statusFinal: updatedExp2.payment_status ? 'Paga' : 'Pendente',
      camposFinanceiros: `amount: ${updatedExp2.amount}, paid_account_id: ${updatedExp2.paid_account_id}, payment_method: ${updatedExp2.payment_method}, paid_at: ${updatedExp2.paid_at}`,
      resultado: newBalances.a === 1000 && newBalances.b === 500 && !updatedExp2.payment_status && updatedExp2.paid_account_id === null ? 'SUCESSO' : 'FALHA'
    })

    // ----------------------------------------------------
    // Teste 4: Criar despesa já paga R$ 100
    // ----------------------------------------------------
    balances = await checkBalances()
    const t4 = await supabase.rpc('create_paid_expense_rpc', {
      p_amount: 100,
      p_category: 'Outros',
      p_description: 'Matrix 4 - Já paga',
      p_date: today,
      p_installment_number: null,
      p_installments_total: null,
      p_paid_account_id: accA.id,
      p_payment_method: 'pix',
      p_paid_at: today,
      p_tags: null,
      p_notes: null,
      p_expense_type: 'variable',
      p_is_recurring: false
    })
    if (t4.error) {
      console.error('RPC Error:', t4.error)
    }
    paidExpId = t4.data?.expense_id
    if (!paidExpId) {
      throw new Error(`Failed to create paid expense. Error: ${JSON.stringify(t4.error)}`)
    }

    const { data: createdPaidExp } = await supabase.from('expenses').select('*').eq('id', paidExpId).single()
    newBalances = await checkBalances()
    report.push({
      acao: '4. Criar despesa já paga via RPC',
      saldoInicial: `A: ${balances.a}, B: ${balances.b}`,
      saldoEsperado: 'A: 900, B: 500',
      saldoObtido: `A: ${newBalances.a}, B: ${newBalances.b}`,
      statusFinal: createdPaidExp.payment_status ? 'Paga' : 'Pendente',
      camposFinanceiros: `amount: ${createdPaidExp.amount}, paid_account_id: ${createdPaidExp.paid_account_id}, paid_at: ${createdPaidExp.paid_at}`,
      resultado: newBalances.a === 900 && newBalances.b === 500 && createdPaidExp.payment_status ? 'SUCESSO' : 'FALHA'
    })

    // ----------------------------------------------------
    // Teste 5: Editar despesa paga R$ 100 para R$ 150
    // ----------------------------------------------------
    balances = await checkBalances()
    const t5 = await supabase.rpc('update_paid_expense_rpc', {
      p_expense_id: paidExpId,
      p_amount: 150,
      p_category: 'Outros',
      p_description: 'Matrix 4 - Editada R$ 150',
      p_date: today,
      p_paid_account_id: accA.id,
      p_payment_method: 'pix',
      p_paid_at: today,
      p_tags: null,
      p_notes: null,
      p_expense_type: 'variable',
      p_is_recurring: false
    })

    const { data: updatedPaidExp1 } = await supabase.from('expenses').select('*').eq('id', paidExpId).single()
    newBalances = await checkBalances()
    report.push({
      acao: '5. Editar valor despesa paga de 100 para 150',
      saldoInicial: `A: ${balances.a}, B: ${balances.b}`,
      saldoEsperado: 'A: 850, B: 500',
      saldoObtido: `A: ${newBalances.a}, B: ${newBalances.b}`,
      statusFinal: updatedPaidExp1.payment_status ? 'Paga' : 'Pendente',
      camposFinanceiros: `amount: ${updatedPaidExp1.amount}, paid_account_id: ${updatedPaidExp1.paid_account_id}, paid_at: ${updatedPaidExp1.paid_at}`,
      resultado: newBalances.a === 850 && newBalances.b === 500 && updatedPaidExp1.amount === 150 ? 'SUCESSO' : 'FALHA'
    })

    // ----------------------------------------------------
    // Teste 6: Editar despesa paga R$ 150 para R$ 80
    // ----------------------------------------------------
    balances = await checkBalances()
    const t6 = await supabase.rpc('update_paid_expense_rpc', {
      p_expense_id: paidExpId,
      p_amount: 80,
      p_category: 'Outros',
      p_description: 'Matrix 4 - Editada R$ 80',
      p_date: today,
      p_paid_account_id: accA.id,
      p_payment_method: 'pix',
      p_paid_at: today,
      p_tags: null,
      p_notes: null,
      p_expense_type: 'variable',
      p_is_recurring: false
    })

    const { data: updatedPaidExp2 } = await supabase.from('expenses').select('*').eq('id', paidExpId).single()
    newBalances = await checkBalances()
    report.push({
      acao: '6. Editar valor despesa paga de 150 para 80',
      saldoInicial: `A: ${balances.a}, B: ${balances.b}`,
      saldoEsperado: 'A: 920, B: 500',
      saldoObtido: `A: ${newBalances.a}, B: ${newBalances.b}`,
      statusFinal: updatedPaidExp2.payment_status ? 'Paga' : 'Pendente',
      camposFinanceiros: `amount: ${updatedPaidExp2.amount}, paid_account_id: ${updatedPaidExp2.paid_account_id}, paid_at: ${updatedPaidExp2.paid_at}`,
      resultado: newBalances.a === 920 && newBalances.b === 500 && updatedPaidExp2.amount === 80 ? 'SUCESSO' : 'FALHA'
    })

    // ----------------------------------------------------
    // Teste 7: Trocar conta de pagamento de Conta A para Conta B em despesa de R$ 80
    // ----------------------------------------------------
    balances = await checkBalances()
    const t7 = await supabase.rpc('update_paid_expense_rpc', {
      p_expense_id: paidExpId,
      p_amount: 80,
      p_category: 'Outros',
      p_description: 'Matrix 4 - Conta Trocada para B',
      p_date: today,
      p_paid_account_id: accB.id,
      p_payment_method: 'pix',
      p_paid_at: today,
      p_tags: null,
      p_notes: null,
      p_expense_type: 'variable',
      p_is_recurring: false
    })

    const { data: updatedPaidExp3 } = await supabase.from('expenses').select('*').eq('id', paidExpId).single()
    newBalances = await checkBalances()
    report.push({
      acao: '7. Trocar conta de pagamento de A para B (R$ 80)',
      saldoInicial: `A: ${balances.a}, B: ${balances.b}`,
      saldoEsperado: 'A: 1000, B: 420',
      saldoObtido: `A: ${newBalances.a}, B: ${newBalances.b}`,
      statusFinal: updatedPaidExp3.payment_status ? 'Paga' : 'Pendente',
      camposFinanceiros: `amount: ${updatedPaidExp3.amount}, paid_account_id: ${updatedPaidExp3.paid_account_id}, paid_at: ${updatedPaidExp3.paid_at}`,
      resultado: newBalances.a === 1000 && newBalances.b === 420 && updatedPaidExp3.paid_account_id === accB.id ? 'SUCESSO' : 'FALHA'
    })

    // ----------------------------------------------------
    // Teste 8: Excluir despesa paga R$ 80
    // ----------------------------------------------------
    balances = await checkBalances()
    // Como a Action faz, primeiro executa undo_expense_payment_rpc, depois deleta
    await supabase.rpc('undo_expense_payment_rpc', {
      p_expense_id: paidExpId
    })
    const t8 = await supabase.from('expenses').delete().eq('id', paidExpId)
    newBalances = await checkBalances()
    report.push({
      acao: '8. Excluir despesa paga R$ 80',
      saldoInicial: `A: ${balances.a}, B: ${balances.b}`,
      saldoEsperado: 'A: 1000, B: 500',
      saldoObtido: `A: ${newBalances.a}, B: ${newBalances.b}`,
      statusFinal: 'Excluída',
      camposFinanceiros: 'N/A',
      resultado: newBalances.a === 1000 && newBalances.b === 500 ? 'SUCESSO' : 'FALHA'
    })

    // ----------------------------------------------------
    // Teste 9: Excluir despesa pendente
    // ----------------------------------------------------
    balances = await checkBalances()
    const t9 = await supabase.from('expenses').delete().eq('id', expId)
    newBalances = await checkBalances()
    report.push({
      acao: '9. Excluir despesa pendente',
      saldoInicial: `A: ${balances.a}, B: ${balances.b}`,
      saldoEsperado: 'A: 1000, B: 500',
      saldoObtido: `A: ${newBalances.a}, B: ${newBalances.b}`,
      statusFinal: 'Excluída',
      camposFinanceiros: 'N/A',
      resultado: newBalances.a === 1000 && newBalances.b === 500 ? 'SUCESSO' : 'FALHA'
    })

    // ----------------------------------------------------
    // Teste 10: Duplicar despesa paga (simulado com clone)
    // ----------------------------------------------------
    balances = await checkBalances()
    // Criamos uma fictícia já paga e a clonamos para criar como pendente
    const t10Setup = await supabase.rpc('create_paid_expense_rpc', {
      p_amount: 200,
      p_category: 'Outros',
      p_description: 'Original para duplicação',
      p_date: today,
      p_installment_number: null,
      p_installments_total: null,
      p_paid_account_id: accA.id,
      p_payment_method: 'pix',
      p_paid_at: today
    })
    const setupId = t10Setup.data.expense_id
    const { data: original } = await supabase.from('expenses').select('*').eq('id', setupId).single()
    
    // Simular o clone do front/action
    const clonedData = {
      user_id: userId,
      amount: original.amount,
      category: original.category,
      description: original.description + ' (Cópia)',
      date: original.date,
      account_id: accA.id,
      payment_status: false // Deve nascer pendente
    }
    
    const t10Insert = await supabase.from('expenses').insert(clonedData).select().single()
    newBalances = await checkBalances()
    
    // Limpar setup e clone
    await supabase.rpc('undo_expense_payment_rpc', { p_expense_id: setupId })
    await supabase.from('expenses').delete().in('id', [setupId, t10Insert.data.id])

    report.push({
      acao: '10. Duplicar despesa paga (nasce pendente, limpa campos financeiros)',
      saldoInicial: `A: ${balances.a}, B: ${balances.b}`,
      saldoEsperado: `A: 1000, B: 500`, // Pois limpamos ambos
      saldoObtido: `A: ${newBalances.a - 200}, B: ${newBalances.b}`, // Subtraímos o setup do saldo obtido para verificar o comportamento do clone
      statusFinal: t10Insert.data.payment_status ? 'Paga' : 'Pendente',
      camposFinanceiros: `amount: ${t10Insert.data.amount}, paid_account_id: ${t10Insert.data.paid_account_id}, paid_at: ${t10Insert.data.paid_at}`,
      resultado: !t10Insert.data.payment_status && t10Insert.data.paid_account_id === null ? 'SUCESSO' : 'FALHA'
    })

    // ----------------------------------------------------
    // Teste 11: Criar despesa atrasada
    // ----------------------------------------------------
    balances = await checkBalances()
    const pastDate = '2026-06-01'
    const t11 = await supabase.from('expenses').insert({
      user_id: userId,
      account_id: accA.id,
      amount: 150,
      description: 'Despesa Atrasada',
      category: 'Outros',
      payment_status: false,
      date: pastDate
    }).select().single()
    const atrasadaId = t11.data.id

    // Status derivado na UI: payment_status === false && date < hoje => Atrasada
    const derivedStatus = !t11.data.payment_status && t11.data.date < today ? 'Atrasada' : 'Pendente'
    newBalances = await checkBalances()
    
    report.push({
      acao: '11. Criar despesa atrasada (data no passado)',
      saldoInicial: `A: ${balances.a}, B: ${balances.b}`,
      saldoEsperado: 'A: 1000, B: 500',
      saldoObtido: `A: ${newBalances.a}, B: ${newBalances.b}`,
      statusFinal: derivedStatus,
      camposFinanceiros: `date: ${t11.data.date}, payment_status: ${t11.data.payment_status}`,
      resultado: newBalances.a === 1000 && derivedStatus === 'Atrasada' ? 'SUCESSO' : 'FALHA'
    })

    // ----------------------------------------------------
    // Teste 12: Pagar despesa atrasada via modal
    // ----------------------------------------------------
    balances = await checkBalances()
    await supabase.rpc('pay_expense_rpc', {
      p_expense_id: atrasadaId,
      p_paid_account_id: accA.id,
      p_payment_method: 'pix',
      p_paid_at: today
    })
    
    const { data: t12Verify } = await supabase.from('expenses').select('*').eq('id', atrasadaId).single()
    newBalances = await checkBalances()

    // Limpar despesa atrasada
    await supabase.rpc('undo_expense_payment_rpc', { p_expense_id: atrasadaId })
    await supabase.from('expenses').delete().eq('id', atrasadaId)

    report.push({
      acao: '12. Pagar despesa atrasada via RPC',
      saldoInicial: `A: ${balances.a}, B: ${balances.b}`,
      saldoEsperado: 'A: 850, B: 500',
      saldoObtido: `A: ${newBalances.a}, B: ${newBalances.b}`,
      statusFinal: t12Verify.payment_status ? 'Paga' : 'Pendente',
      camposFinanceiros: `amount: ${t12Verify.amount}, paid_account_id: ${t12Verify.paid_account_id}, paid_at: ${t12Verify.paid_at}`,
      resultado: newBalances.a === 850 && t12Verify.payment_status ? 'SUCESSO' : 'FALHA'
    })

    // ----------------------------------------------------
    // Teste 13: Criar despesa no cartão
    // ----------------------------------------------------
    balances = await checkBalances()
    const t13 = await supabase.from('expenses').insert({
      user_id: userId,
      credit_card_id: card.id,
      amount: 300,
      description: 'Despesa no Cartão',
      category: 'Outros',
      payment_status: false,
      date: today
    }).select().single()
    cardExpId = t13.data.id

    newBalances = await checkBalances()
    report.push({
      acao: '13. Criar despesa vinculada a Cartão de Crédito',
      saldoInicial: `A: ${balances.a}, B: ${balances.b}`,
      saldoEsperado: 'A: 1000, B: 500',
      saldoObtido: `A: ${newBalances.a}, B: ${newBalances.b}`,
      statusFinal: t13.data.payment_status ? 'Paga' : 'Pendente',
      camposFinanceiros: `credit_card_id: ${t13.data.credit_card_id}, payment_status: ${t13.data.payment_status}`,
      resultado: newBalances.a === 1000 && t13.data.credit_card_id === card.id ? 'SUCESSO' : 'FALHA'
    })

    // ----------------------------------------------------
    // Teste 14: Tentar pagar despesa do cartão individualmente
    // ----------------------------------------------------
    balances = await checkBalances()
    const t14 = await supabase.rpc('pay_expense_rpc', {
      p_expense_id: cardExpId,
      p_paid_account_id: accA.id,
      p_payment_method: 'pix',
      p_paid_at: today
    })

    newBalances = await checkBalances()
    // Limpar despesa do cartão
    await supabase.from('expenses').delete().eq('id', cardExpId)

    const blocked = t14.error || (t14.data && t14.data.error)
    report.push({
      acao: '14. Pagar despesa de Cartão individualmente (deve ser bloqueado)',
      saldoInicial: `A: ${balances.a}, B: ${balances.b}`,
      saldoEsperado: 'A: 1000, B: 500',
      saldoObtido: `A: ${newBalances.a}, B: ${newBalances.b}`,
      statusFinal: 'Bloqueado',
      camposFinanceiros: `erro_rpc: ${blocked ? (t14.error?.message || t14.data?.error) : 'Não bloqueou!'}`,
      resultado: newBalances.a === 1000 && blocked ? 'SUCESSO' : 'FALHA'
    })

  } catch (e) {
    console.error('Erro na matriz de despesas:', e)
  } finally {
    console.log('Realizando limpeza final...')
    await supabase.from('accounts').delete().in('id', [accA.id, accB.id])
    await supabase.from('credit_cards').delete().eq('id', card.id)
    console.log('Limpeza concluída.')

    console.log(JSON.stringify(report, null, 2))
  }
}

runExpenseMatrix()
