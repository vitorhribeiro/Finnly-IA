const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Ler .env.local
const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const parts = line.split('=');
    if (parts.length >= 2) {
      env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseAnonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Credenciais do Supabase não encontradas no .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const testEmail = 'teste@finnly.com.br';
const testPassword = 'teste123'; // Senha de 8 caracteres exigida pelo Supabase por padrão

async function run() {
  console.log(`Tentando cadastrar o usuário: ${testEmail}...`);
  
  // 1. SignUp
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
  });

  if (signUpError) {
    console.log('Usuário já cadastrado ou erro no cadastro. Tentando fazer login direto...');
    
    // Tenta fazer login
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    
    if (signInError) {
      console.error('Erro no login do usuário:', signInError.message);
      process.exit(1);
    }
    
    console.log('Login efetuado com sucesso!');
    await seedData(signInData.user.id, signInData.session.access_token);
  } else {
    console.log('Cadastro do usuário finalizado!');
    
    const userId = signUpData.user ? signUpData.user.id : null;
    const token = signUpData.session ? signUpData.session.access_token : null;
    
    if (userId && token) {
      await seedData(userId, token);
    } else {
      console.log('O cadastro exige confirmação de email ou e-mail já existe pendente.');
      console.log('Tentando efetuar login para obter a sessão...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });
      if (signInError) {
        console.error('Erro ao autenticar:', signInError.message);
        console.log('⚠️ Caso seu banco exija confirmação de e-mail por favor desative nas configurações de Auth do Supabase ou crie a conta teste@finnly.com.br manualmente.');
        process.exit(1);
      }
      await seedData(signInData.user.id, signInData.session.access_token);
    }
  }
}

async function seedData(userId, token) {
  console.log(`Iniciando semeadura de dados para o userId: ${userId}...`);
  
  const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

  try {
    // Limpar anteriores
    await Promise.all([
      authSupabase.from('transfers').delete().eq('user_id', userId),
      authSupabase.from('expenses').delete().eq('user_id', userId),
      authSupabase.from('incomes').delete().eq('user_id', userId),
      authSupabase.from('investments').delete().eq('user_id', userId),
      authSupabase.from('credit_cards').delete().eq('user_id', userId),
      authSupabase.from('accounts').delete().eq('user_id', userId),
      authSupabase.from('expense_categories').delete().eq('user_id', userId),
      authSupabase.from('financial_streaks').delete().eq('user_id', userId),
      authSupabase.from('user_achievements').delete().eq('user_id', userId),
      authSupabase.from('subscriptions').delete().eq('user_id', userId),
    ]);
    console.log('Tabelas limpas com sucesso.');

    // 2. Inserir Contas Bancárias
    const { data: accounts, error: accErr } = await authSupabase.from('accounts').insert([
      { user_id: userId, name: 'Banco do Brasil', type: 'corrente', balance: 3450.00, color: '#FFB300' },
      { user_id: userId, name: 'Nubank Corrente', type: 'corrente', balance: 1890.20, color: '#7B1FA2' },
      { user_id: userId, name: 'Reserva de Emergência', type: 'poupanca', balance: 10000.00, color: '#01584C' }
    ]).select();

    if (accErr) throw accErr;
    console.log('Contas criadas.');

    const bbId = accounts.find(a => a.name === 'Banco do Brasil').id;
    const nuId = accounts.find(a => a.name === 'Nubank Corrente').id;
    const reserveId = accounts.find(a => a.name === 'Reserva de Emergência').id;

    // 3. Inserir Cartões de Crédito
    const { data: cards, error: cardErr } = await authSupabase.from('credit_cards').insert([
      { user_id: userId, name: 'Mastercard Black Nu', limit: 5000.00, closing_day: 3, due_day: 10, color: '#7B1FA2' },
      { user_id: userId, name: 'Visa Gold Inter', limit: 3000.00, closing_day: 18, due_day: 25, color: '#F57C00' }
    ]).select();

    if (cardErr) throw cardErr;
    console.log('Cartões de crédito criados.');

    const nuCardId = cards.find(c => c.name === 'Mastercard Black Nu').id;
    const interCardId = cards.find(c => c.name === 'Visa Gold Inter').id;

    // 4. Inserir Categorias Customizadas
    await authSupabase.from('expense_categories').insert([
      { user_id: userId, name: 'Alimentação', color: '#F57C00', icon: 'UtensilsCrossed' },
      { user_id: userId, name: 'Transporte', color: '#FFB300', icon: 'Car' },
      { user_id: userId, name: 'Lazer', color: '#0288D1', icon: 'Film' },
      { user_id: userId, name: 'Moradia', color: '#01584C', icon: 'Home' },
      { user_id: userId, name: 'Saúde', color: '#EF4444', icon: 'Shield' }
    ]);
    console.log('Categorias criadas.');

    // 5. Inserir Receitas
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const nextMm = String((today.getMonth() + 2) % 12 || 12).padStart(2, '0');
    const nextYyyy = today.getMonth() + 2 > 12 ? yyyy + 1 : yyyy;

    await authSupabase.from('incomes').insert([
      { user_id: userId, account_id: bbId, description: 'Salário CLT', amount: 5500.00, category: 'Salário', date: `${yyyy}-${mm}-05`, payment_status: true },
      { user_id: userId, account_id: nuId, description: 'Pix Freelance', amount: 1500.00, category: 'Outros', date: `${yyyy}-${mm}-18`, payment_status: true },
      { user_id: userId, account_id: nuId, description: 'Bônus Semestral', amount: 2000.00, category: 'Prêmios', date: `${nextYyyy}-${nextMm}-05`, payment_status: false }
    ]);
    console.log('Receitas criadas.');

    // 6. Inserir Despesas
    await authSupabase.from('expenses').insert([
      { user_id: userId, account_id: bbId, description: 'Supermercado Carrefour', amount: 450.00, category: 'Alimentação', date: `${yyyy}-${mm}-03`, payment_status: true },
      { user_id: userId, account_id: nuId, description: 'Gasolina Ipiranga', amount: 180.00, category: 'Transporte', date: `${yyyy}-${mm}-07`, payment_status: true },
      { user_id: userId, account_id: bbId, description: 'Academia', amount: 119.90, category: 'Saúde', date: `${yyyy}-${mm}-10`, payment_status: true },
      { user_id: userId, credit_card_id: nuCardId, description: 'Jantar Restaurante', amount: 120.00, category: 'Alimentação', date: `${yyyy}-${mm}-12`, payment_status: false },
      { user_id: userId, credit_card_id: nuCardId, description: 'Cinema', amount: 48.00, category: 'Lazer', date: `${yyyy}-${mm}-14`, payment_status: false },
      { user_id: userId, credit_card_id: interCardId, description: 'Curso Inglês (1/3)', amount: 100.00, category: 'Educação', date: `${yyyy}-${mm}-20`, payment_status: false, installments_total: 3, installment_number: 1 },
      { user_id: userId, credit_card_id: interCardId, description: 'Curso Inglês (2/3)', amount: 100.00, category: 'Educação', date: `${nextYyyy}-${nextMm}-20`, payment_status: false, installments_total: 3, installment_number: 2 }
    ]);
    console.log('Despesas criadas.');

    // 7. Inserir Investimentos
    await authSupabase.from('investments').insert([
      { user_id: userId, name: 'Tesouro SELIC 2029', type: 'renda_fixa', amount: 6000.00, yield_rate: 10.75, date: `${yyyy}-${mm}-01` },
      { user_id: userId, name: 'PETR4', type: 'acoes', amount: 2500.00, yield_rate: 12.20, date: `${yyyy}-${mm}-01` },
      { user_id: userId, name: 'MXRF11', type: 'fiis', amount: 1500.00, yield_rate: 9.85, date: `${yyyy}-${mm}-01` }
    ]);
    console.log('Investimentos criados.');

    // 8. Inserir Ofensiva (Streaks) & Conquistas
    await authSupabase.from('financial_streaks').upsert({
      user_id: userId,
      current_streak: 5,
      longest_streak: 12,
      last_activity_date: `${yyyy}-${mm}-${String(today.getDate()).padStart(2, '0')}`
    });

    await authSupabase.from('user_achievements').insert([
      { user_id: userId, achievement_key: 'primeiro_passo' },
      { user_id: userId, achievement_key: 'escudo_ativo' }
    ]);
    console.log('Streaks e conquistas inseridas.');

    // 9. Inserir Assinaturas (Subscriptions)
    await authSupabase.from('subscriptions').insert([
      { user_id: userId, name: 'Netflix', amount: 55.90, due_day: 10, category: 'Lazer', last_paid_month: `${yyyy}-${mm}` },
      { user_id: userId, name: 'Spotify Premium', amount: 24.90, due_day: 15, category: 'Lazer' },
      { user_id: userId, name: 'Conta de Energia', amount: 180.00, due_day: 22, category: 'Moradia' }
    ]);
    console.log('Assinaturas criadas.');

    console.log('\n==============================================');
    console.log('🎉 SEMEADURA COMPLETA EXECUTADA COM SUCESSO! 🎉');
    console.log(`E-mail da Conta: ${testEmail}`);
    console.log(`Senha de Acesso: ${testPassword}`);
    console.log('==============================================\n');
  } catch (e) {
    console.error('Erro ao semear tabelas:', e.message || e);
  }
}

run();
