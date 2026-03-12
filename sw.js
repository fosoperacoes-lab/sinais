// =====================================================
// OP245-C v2.0 - BULLEX 20 PARES OTIMIZADO
// Correção: BATCH API + Filtros Agressivos
// =====================================================

const PARES_BULLEX_20 = [
  'EURUSD','GBPUSD','USDJPY','AUDUSD','USDCAD','EURJPY','GBPJPY','AUDJPY',
  'EURGBP','NZDUSD','USDCHF','EURCAD','GBPCAD','AUDCAD','NZDJPY','BTCUSD',
  'ETHUSD','XAUUSD','USOIL','NAS100'
];

// Função chunk para batches de 5 pares
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

const BATCHES = chunkArray(PARES_BULLEX_20, 5); // 4 chamadas de 5 pares

// =====================================================
// POLLING OTIMIZADO - 4 BATCHES/30s
// =====================================================
function startOptimizedPolling() {
  console.log('🚀 OP245-C v2.0: Iniciando monitoramento 20 pares Bullex');
  
  setInterval(() => {
    BATCHES.forEach((batch, index) => {
      setTimeout(() => {
        fetchSignals(batch.join(',')).then(() => {
          console.log(`✅ Batch ${index + 1}/${BATCHES.length} (${batch.join(',')})`);
        });
      }, index * 8000); // 8s entre batches
    });
  }, 30000); // Novo ciclo a cada 30s
}

// =====================================================
// FILTROS BULLEX-OTIMIZADOS (12/88 ao invés 5/95)
// =====================================================
function generateSignal(data) {
  const stochRSI = parseFloat(data.stoch_rsi);
  const macdDir = data.macd_direction;
  const price = parseFloat(data.close);
  const mm200 = parseFloat(data.mm200);
  
  // FILTRO FORTE BULLEX
  const strongSignal = (
    (stochRSI <= 12 || stochRSI >= 88) &&  // Zonas expandidas
    macdDir !== '≈' &&                     // MACD com direção
    Math.abs(price - mm200) > 0.0003       // Distância MM200
  );
  
  if (strongSignal) {
    const direction = stochRSI <= 12 ? 'COMPRA' : 'VENDA';
    return {
      symbol: data.symbol,
      direction,
      stochRSI: stochRSI.toFixed(1),
      macd: macdDir,
      strength: stochRSI <= 8 || stochRSI >= 92 ? '★★★' : '★★'
    };
  }
  return null;
}

// =====================================================
// FETCH OTIMIZADO COM BATCH
// =====================================================
async function fetchSignals(symbols) {
  try {
    const response = await fetch(`/api/signals?symbols=${symbols}&apikey=${API_KEY}`);
    const data = await response.json();
    
    data.forEach(item => {
      const signal = generateSignal(item);
      if (signal) {
        addSignalToDashboard(signal);
        logToCSV(signal);
      }
    });
  } catch (error) {
    console.error('❌ API Error:', error);
  }
}

// Iniciar monitoramento otimizado
startOptimizedPolling();
