import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ygjbohushwizjhwjynin.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_gY1rpEVhUdANmKc8BfuRgw_7ILoQlR8'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function runTests() {
  console.log('--- Iniciando Matriz de Testes (Saldos) ---')

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

  async function checkBalance(accountId, expected) {
    const { data } = await supabase.from('accounts').select('balance').eq('id', accountId).single()
    const balance = data ? Number(data.balance) : 0
    const pass = balance === expected
    
    const { data: rpcData, error: rpcError } = await supabase.rpc('verify_account_balance', { p_account_id: accountId })
    const isConsistent = rpcData?.[0]?.is_consistent
    
    return { balance, pass, rpcPass: isConsistent, rpcError }
  }

  const { data: accA, error: errA } = await supabase.from('accounts').insert({
    user_id: userId,
    name: 'Conta Teste A',
    initial_balance: 1000,
    balance: 1000,
    type: 'corrente'
  }).select().single()

  const { data: accB, error: errB } = await supabase.from('accounts').insert({
    user_id: userId,
    name: 'Conta Teste B',
    initial_balance: 500,
    balance: 500,
    type: 'corrente'
  }).select().single()

  if (errA || errB) {
    console.error('Erro ao criar contas:', errA, errB)
    process.exit(1)
  }

  console.log('Contas criadas:', accA.id, accB.id)
  let incomeId = null

  try {
    console.log('Executando Teste 1...')
    const t1 = await supabase.from('incomes').insert({
      user_id: userId,
      account_id: accA.id,
      amount: 100,
      description: 'Teste 1',
      category: 'Outros',
      payment_status: false,
      date: new Date().toISOString().split('T')[0]
    }).select().single()
    incomeId = t1.data.id
    
    let res1 = await checkBalance(accA.id, 1000)
    report.push({ test: '1. Criar pendente', passed: res1.pass, expected: 1000, actual: res1.balance, rpcPass: res1.rpcPass })

    console.log('Executando Teste 2...')
    await supabase.from('incomes').update({ payment_status: true }).eq('id', incomeId)
    let res2 = await checkBalance(accA.id, 1100)
    report.push({ test: '2. Marcar recebida', passed: res2.pass, expected: 1100, actual: res2.balance, rpcPass: res2.rpcPass })

    console.log('Executando Teste 3...')
    await supabase.from('incomes').update({ payment_status: false }).eq('id', incomeId)
    let res3 = await checkBalance(accA.id, 1000)
    report.push({ test: '3. Desmarcar recebida', passed: res3.pass, expected: 1000, actual: res3.balance, rpcPass: res3.rpcPass })

    console.log('Executando Teste 4...')
    const t4 = await supabase.from('incomes').insert({
      user_id: userId,
      account_id: accA.id,
      amount: 100,
      description: 'Teste 4',
      category: 'Outros',
      payment_status: true,
      date: new Date().toISOString().split('T')[0]
    }).select().single()
    let incomeId2 = t4.data.id
    let res4 = await checkBalance(accA.id, 1100)
    report.push({ test: '4. Criar nova já recebida', passed: res4.pass, expected: 1100, actual: res4.balance, rpcPass: res4.rpcPass })

    console.log('Executando Teste 5...')
    await supabase.from('incomes').update({ amount: 150 }).eq('id', incomeId2)
    let res5 = await checkBalance(accA.id, 1150)
    report.push({ test: '5. Editar recebida', passed: res5.pass, expected: 1150, actual: res5.balance, rpcPass: res5.rpcPass })

    console.log('Executando Teste 6...')
    await supabase.from('incomes').update({ amount: 150 }).eq('id', incomeId)
    let res6 = await checkBalance(accA.id, 1150)
    report.push({ test: '6. Editar pendente', passed: res6.pass, expected: 1150, actual: res6.balance, rpcPass: res6.rpcPass })

    console.log('Executando Teste 7...')
    await supabase.from('incomes').update({ account_id: accB.id }).eq('id', incomeId2)
    let res7a = await checkBalance(accA.id, 1000)
    let res7b = await checkBalance(accB.id, 650)
    report.push({ test: '7. Trocar conta de recebida', passed: res7a.pass && res7b.pass, expected: 'A=1000, B=650', actual: `A=${res7a.balance}, B=${res7b.balance}`, rpcPass: res7a.rpcPass && res7b.rpcPass })

    console.log('Executando Teste 8...')
    await supabase.from('incomes').update({ account_id: accB.id }).eq('id', incomeId)
    let res8a = await checkBalance(accA.id, 1000)
    let res8b = await checkBalance(accB.id, 650)
    report.push({ test: '8. Trocar conta de pendente', passed: res8a.pass && res8b.pass, expected: 'A=1000, B=650', actual: `A=${res8a.balance}, B=${res8b.balance}`, rpcPass: res8a.rpcPass && res8b.rpcPass })

    console.log('Executando Teste 9...')
    await supabase.from('incomes').delete().eq('id', incomeId2)
    let res9 = await checkBalance(accB.id, 500)
    report.push({ test: '9. Excluir recebida', passed: res9.pass, expected: 500, actual: res9.balance, rpcPass: res9.rpcPass })

    console.log('Executando Teste 10...')
    await supabase.from('incomes').delete().eq('id', incomeId)
    let res10 = await checkBalance(accB.id, 500)
    report.push({ test: '10. Excluir pendente', passed: res10.pass, expected: 500, actual: res10.balance, rpcPass: res10.rpcPass })

  } catch(e) {
    console.error('Erro fatal:', e)
  } finally {
    console.log('Realizando limpeza...')
    await supabase.from('accounts').delete().in('id', [accA.id, accB.id])
    console.log('Limpeza concluída.')

    console.log(JSON.stringify(report, null, 2))
  }
}

runTests()
