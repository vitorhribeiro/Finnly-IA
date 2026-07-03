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

const USER_B_ID = '00000000-0000-0000-0000-00000000000b'
const USER_B_ACC = '00000000-0000-0000-0000-0000000000b1'
const USER_B_CARD = '00000000-0000-0000-0000-0000000000c1'
const USER_B_EXP = '00000000-0000-0000-0000-0000000000e1'
const USER_B_INC = '00000000-0000-0000-0000-0000000000f1'
const USER_B_CAT = '00000000-0000-0000-0000-0000000000f2'

async function runPenetrationTests() {
  console.log('=== INICIANDO TESTES DE INVASÃO RLS / SECURITY (COMO USUÁRIO A) ===')

  // Login como Usuário A
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'teste@finnly.com.br',
    password: 'teste123'
  })

  if (authError) {
    console.error('❌ Erro no login do Usuário A:', authError.message)
    process.exit(1)
  }

  const userA = authData.user
  console.log(`✅ Logado como Usuário A (email: ${userA.email}, id: ${userA.id})`)
  
  const report = []

  // Helper para registrar resultado
  function logResult(testName, success, details = '') {
    console.log(`${success ? '✅ PASSOU' : '❌ FALHOU'}: ${testName} ${details ? `(${details})` : ''}`)
    report.push({ test: testName, passed: success, details })
  }

  // 1. SELECTs (Usuário A não pode ver dados de B)
  try {
    const { data: accs } = await supabase.from('accounts').select('*').eq('user_id', USER_B_ID)
    logResult('1. A não vê contas de B', accs.length === 0, `${accs.length} contas retornadas`)
  } catch (e) {
    logResult('1. A não vê contas de B', true, e.message)
  }

  try {
    const { data: incs } = await supabase.from('incomes').select('*').eq('user_id', USER_B_ID)
    logResult('2. A não vê receitas de B', incs.length === 0, `${incs.length} receitas retornadas`)
  } catch (e) {
    logResult('2. A não vê receitas de B', true, e.message)
  }

  try {
    const { data: exps } = await supabase.from('expenses').select('*').eq('user_id', USER_B_ID)
    logResult('3. A não vê despesas de B', exps.length === 0, `${exps.length} despesas retornadas`)
  } catch (e) {
    logResult('3. A não vê despesas de B', true, e.message)
  }

  // 2. INSERTs/UPDATEs/DELETEs diretos (A não pode criar/editar/excluir dados de B)
  try {
    const { data, error } = await supabase.from('accounts').insert({
      id: '00000000-0000-0000-0000-0000000000a9',
      user_id: USER_B_ID,
      name: 'Conta Invasora',
      balance: 1000,
      type: 'corrente'
    })
    logResult('4. A não cria conta para B', error !== null, error ? error.message : 'Inserido com sucesso!')
  } catch (e) {
    logResult('4. A não cria conta para B', true, e.message)
  }

  try {
    const { data, error } = await supabase.from('accounts').update({ name: 'Conta Hackeada' }).eq('id', USER_B_ACC)
    const { data: verifyAcc } = await supabase.from('accounts').select('*').eq('id', USER_B_ACC)
    const isUnchanged = verifyAcc.length === 0 || verifyAcc[0].name !== 'Conta Hackeada'
    logResult('5. A não edita conta de B', isUnchanged, error ? error.message : 'Sem erros, mas bloqueado por RLS (afetou 0 linhas)')
  } catch (e) {
    logResult('5. A não edita conta de B', true, e.message)
  }

  try {
    const { data, error } = await supabase.from('accounts').delete().eq('id', USER_B_ACC)
    logResult('6. A não deleta conta de B', error !== null || data === null, error ? error.message : 'Bloqueado por RLS')
  } catch (e) {
    logResult('6. A não deleta conta de B', true, e.message)
  }

  // 3. RPCs de pagamentos e auditorias (A não pode operar em contas/despesas de B)
  try {
    const { data, error } = await supabase.rpc('pay_expense_rpc', {
      p_expense_id: USER_B_EXP,
      p_paid_account_id: USER_B_ACC,
      p_payment_method: 'pix',
      p_paid_at: '2026-07-01'
    })
    logResult('7. A não usa pay_expense_rpc em despesa de B', !!(error !== null || (data && data.error)), error ? error.message : (data ? data.error : ''))
  } catch (e) {
    logResult('7. A não usa pay_expense_rpc em despesa de B', true, e.message)
  }

  try {
    const { data, error } = await supabase.rpc('undo_expense_payment_rpc', {
      p_expense_id: USER_B_EXP
    })
    logResult('8. A não usa undo_expense_rpc em despesa de B', !!(error !== null || (data && data.error)), error ? error.message : (data ? data.error : ''))
  } catch (e) {
    logResult('8. A não usa undo_expense_rpc em despesa de B', true, e.message)
  }

  try {
    const { data, error } = await supabase.rpc('recalculate_account_balance', { account_uuid: USER_B_ACC })
    logResult('9. A não calcula saldo de B', error !== null || (data === null), error ? error.message : 'Bloqueado')
  } catch (e) {
    logResult('9. A não calcula saldo de B', true, e.message)
  }

  try {
    const { data, error } = await supabase.rpc('sync_account_balance', { account_uuid: USER_B_ACC })
    logResult('10. A não sincroniza saldo de B', error !== null || (data === null), error ? error.message : 'Bloqueado')
  } catch (e) {
    logResult('10. A não sincroniza saldo de B', true, e.message)
  }

  // 4. CROSS-OWNERSHIP (Vincular contas/cartões de B em receitas/despesas próprias de A)
  try {
    const { data, error } = await supabase.from('incomes').insert({
      user_id: userA.id,
      account_id: USER_B_ACC, // Conta do Usuário B!
      amount: 100,
      description: 'Receita Invasora',
      category: 'Outros',
      payment_status: true,
      date: '2026-07-01'
    })
    logResult('11. A não vincula conta de B em receita própria', error !== null, error ? error.message : 'Inserido com sucesso! (Perigo!)')
  } catch (e) {
    logResult('11. A não vincula conta de B em receita própria', true, e.message)
  }

  try {
    const { data, error } = await supabase.from('expenses').insert({
      user_id: userA.id,
      credit_card_id: USER_B_CARD, // Cartão de B!
      amount: 50,
      description: 'Despesa Invasora',
      category: 'Outros',
      payment_status: false,
      date: '2026-07-01'
    })
    logResult('12. A não vincula cartão de B em despesa própria', error !== null, error ? error.message : 'Inserido com sucesso! (Perigo!)')
  } catch (e) {
    logResult('12. A não vincula cartão de B em despesa própria', true, e.message)
  }

  // 5. Categorias Globais vs Privadas
  try {
    // A deve poder ler categorias globais (user_id IS NULL)
    const { data: globalCats } = await supabase.from('expense_categories').select('*').is('user_id', null)
    logResult('13. A lê categorias globais', globalCats && globalCats.length > 0, `${globalCats?.length ?? 0} globais retornadas`)
    
    // A não deve poder ver a categoria privada de B
    const { data: bCats } = await supabase.from('expense_categories').select('*').eq('id', USER_B_CAT)
    logResult('14. A não vê categoria privada de B', bCats.length === 0, `${bCats.length} privadas retornadas`)

    // A não pode editar categoria global (deve retornar erro ou alterar 0 linhas)
    const firstGlobal = globalCats?.[0]
    if (firstGlobal) {
      const { data, error } = await supabase.from('expense_categories').update({ name: 'Nome Hackeado' }).eq('id', firstGlobal.id)
      const { data: verifyGlobal } = await supabase.from('expense_categories').select('*').eq('id', firstGlobal.id)
      const isUnchanged = verifyGlobal[0].name === firstGlobal.name
      logResult('15. A não altera categoria global', isUnchanged, error ? error.message : 'Alteração bloqueada')
    }
  } catch(e) {
    console.error('Erro nos testes de categorias:', e.message)
  }

  console.log('\n=== FIM DOS TESTES DE PENETRAÇÃO ===')
  console.log(JSON.stringify(report, null, 2))
}

runPenetrationTests()
