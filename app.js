// App data and state
const appData = {
  parameters: [
    {
      name: "Strength",
      description: "Forza del segnale (40-60% o superiore)",
      status: null
    },
    {
      name: "Trend", 
      description: "Direzione del trend (BULL/BULL o BEAR/BEAR)",
      status: null
    },
    {
      name: "Volume",
      description: "Volume degli scambi (superiore alla media)",
      status: null
    },
    {
      name: "Momentum",
      description: "Slancio del movimento (confermato)",
      status: null
    },
    {
      name: "Risk/Reward",
      description: "Rapporto rischio/rendimento (1:2 o migliore)",
      status: null
    }
  ],
  semaphoreRules: {
    green: { min: 4, max: 5, description: "Probabilità alta - Si può entrare", emoji: "🟢" },
    yellow: { min: 3, max: 3, description: "Prudenza - Valutare size ridotta", emoji: "🟡" },
    red: { min: 0, max: 2, description: "Evitare l'entrata", emoji: "🔴" }
  }
};

let currentTrades = [];
let filteredTrades = [];
let statsChart = null;

// DOM Elements
const parametersContainer = document.getElementById('parametersContainer');
const semaphoreDisplay = document.getElementById('semaphoreDisplay');
const resetBtn = document.getElementById('resetBtn');
const tradeForm = document.getElementById('tradeForm');
const saveTradeBtn = document.getElementById('saveTradeBtn');
const tradeTable = document.getElementById('tradeTable').getElementsByTagName('tbody')[0];
const exportBtn = document.getElementById('exportBtn');
const applyFilterBtn = document.getElementById('applyFilterBtn');
const statsSummary = document.getElementById('statsSummary');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
  initializeParameters();
  loadTrades();
  setupEventListeners();
  updateSemaphore();
  updateTradeTable();
  updateStats();
});

// Initialize parameter evaluation section
function initializeParameters() {
  parametersContainer.innerHTML = '';
  
  appData.parameters.forEach((param, index) => {
    const parameterRow = document.createElement('div');
    parameterRow.className = 'parameter-row';
    parameterRow.innerHTML = `
      <div class="parameter-info">
        <div class="parameter-name">${param.name}</div>
        <div class="parameter-description">${param.description}</div>
      </div>
      <div class="parameter-controls">
        <button class="check-btn" data-index="${index}" data-action="check" type="button">
          ✔️
        </button>
        <button class="check-btn" data-index="${index}" data-action="cross" type="button">
          ✘
        </button>
      </div>
    `;
    parametersContainer.appendChild(parameterRow);
  });
}

// Setup event listeners
function setupEventListeners() {
  // Parameter evaluation buttons
  parametersContainer.addEventListener('click', handleParameterClick);
  
  // Reset button
  resetBtn.addEventListener('click', resetEvaluation);
  
  // Trade form
  tradeForm.addEventListener('submit', saveTrade);
  
  // Add input listeners to all form fields
  document.getElementById('instrument').addEventListener('input', validateTradeForm);
  document.getElementById('timeframe').addEventListener('input', validateTradeForm);
  document.getElementById('signalType').addEventListener('change', validateTradeForm);
  document.getElementById('note').addEventListener('input', validateTradeForm);
  
  // Export button
  exportBtn.addEventListener('click', exportToCSV);
  
  // Filter button
  applyFilterBtn.addEventListener('click', applyFilters);
}

// Handle parameter evaluation clicks
function handleParameterClick(event) {
  if (!event.target.classList.contains('check-btn')) return;
  
  const index = parseInt(event.target.dataset.index);
  const action = event.target.dataset.action;
  const parameterRow = event.target.closest('.parameter-row');
  
  // Remove active states from both buttons in this row
  parameterRow.querySelectorAll('.check-btn').forEach(btn => {
    btn.classList.remove('active-check', 'active-cross');
  });
  
  // Set new status
  if (action === 'check') {
    appData.parameters[index].status = true;
    event.target.classList.add('active-check');
  } else {
    appData.parameters[index].status = false;
    event.target.classList.add('active-cross');
  }
  
  updateSemaphore();
  validateTradeForm();
}

// Update semaphore display
function updateSemaphore() {
  const checkedCount = appData.parameters.filter(p => p.status === true).length;
  const evaluatedCount = appData.parameters.filter(p => p.status !== null).length;
  
  let semaphoreState, semaphoreClass, semaphoreText;
  
  if (evaluatedCount === 0) {
    // No evaluation yet
    semaphoreState = 'neutral';
    semaphoreClass = 'status--info';
    semaphoreText = 'Valuta i parametri per vedere il semaforo';
  } else if (checkedCount >= appData.semaphoreRules.green.min) {
    semaphoreState = 'green';
    semaphoreClass = 'semaphore-green';
    semaphoreText = `${appData.semaphoreRules.green.emoji} VERDE - ${appData.semaphoreRules.green.description}`;
  } else if (checkedCount === appData.semaphoreRules.yellow.min) {
    semaphoreState = 'yellow';
    semaphoreClass = 'semaphore-yellow';
    semaphoreText = `${appData.semaphoreRules.yellow.emoji} GIALLO - ${appData.semaphoreRules.yellow.description}`;
  } else {
    semaphoreState = 'red';
    semaphoreClass = 'semaphore-red';
    semaphoreText = `${appData.semaphoreRules.red.emoji} ROSSO - ${appData.semaphoreRules.red.description}`;
  }
  
  semaphoreDisplay.className = `status big-semaphore ${semaphoreClass}`;
  semaphoreDisplay.textContent = semaphoreText;
  semaphoreDisplay.dataset.state = semaphoreState;
}

// Reset evaluation
function resetEvaluation() {
  appData.parameters.forEach(param => param.status = null);
  
  // Reset UI
  parametersContainer.querySelectorAll('.check-btn').forEach(btn => {
    btn.classList.remove('active-check', 'active-cross');
  });
  
  updateSemaphore();
  validateTradeForm();
}

// Validate trade form
function validateTradeForm() {
  const instrument = document.getElementById('instrument').value.trim();
  const timeframe = document.getElementById('timeframe').value.trim();
  const signalType = document.getElementById('signalType').value;
  
  // Check if at least all parameters have been evaluated (either true or false)
  const allParametersEvaluated = appData.parameters.every(p => p.status !== null);
  
  const isValid = instrument && timeframe && signalType && allParametersEvaluated;
  saveTradeBtn.disabled = !isValid;
  
  // Visual feedback
  if (allParametersEvaluated && instrument && timeframe && signalType) {
    saveTradeBtn.textContent = 'Salva Trade';
  } else if (!allParametersEvaluated) {
    saveTradeBtn.textContent = 'Completa la valutazione';
  } else {
    saveTradeBtn.textContent = 'Compila tutti i campi';
  }
}

// Save trade
function saveTrade(event) {
  event.preventDefault();
  
  const checkedCount = appData.parameters.filter(p => p.status === true).length;
  let semaphoreResult;
  
  if (checkedCount >= 4) {
    semaphoreResult = 'VERDE';
  } else if (checkedCount === 3) {
    semaphoreResult = 'GIALLO';
  } else {
    semaphoreResult = 'ROSSO';
  }
  
  const trade = {
    id: Date.now(),
    datetime: new Date().toLocaleString('it-IT'),
    date: new Date().toISOString().split('T')[0],
    instrument: document.getElementById('instrument').value.trim(),
    timeframe: document.getElementById('timeframe').value.trim(),
    signalType: document.getElementById('signalType').value,
    semaphore: semaphoreResult,
    checkedParams: checkedCount,
    note: document.getElementById('note').value.trim()
  };
  
  currentTrades.unshift(trade);
  saveTrades();
  updateTradeTable();
  updateStats();
  
  // Reset form and evaluation
  tradeForm.reset();
  resetEvaluation();
  
  // Show success message
  showToast('Trade salvato con successo!', 'success');
}

// Load trades from localStorage
function loadTrades() {
  try {
    const saved = localStorage.getItem('semaforo-trades');
    currentTrades = saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Errore nel caricamento dei trade:', error);
    currentTrades = [];
  }
}

// Save trades to localStorage
function saveTrades() {
  try {
    localStorage.setItem('semaforo-trades', JSON.stringify(currentTrades));
  } catch (error) {
    console.error('Errore nel salvataggio dei trade:', error);
  }
}

// Update trade table
function updateTradeTable() {
  const trades = filteredTrades.length > 0 ? filteredTrades : currentTrades;
  
  if (trades.length === 0) {
    tradeTable.innerHTML = '<tr><td colspan="6" class="empty-state">Nessun trade registrato</td></tr>';
    return;
  }
  
  tradeTable.innerHTML = trades.map(trade => `
    <tr>
      <td>${trade.datetime}</td>
      <td>${trade.instrument}</td>
      <td>${trade.timeframe}</td>
      <td><span class="signal-${trade.signalType.toLowerCase()}">${trade.signalType}</span></td>
      <td><span class="semaphore-cell semaphore-${trade.semaphore.toLowerCase()}">${getSemaphoreEmoji(trade.semaphore)} ${trade.semaphore}</span></td>
      <td>${trade.note || '-'}</td>
    </tr>
  `).join('');
}

// Get semaphore emoji
function getSemaphoreEmoji(result) {
  const emojiMap = { 'VERDE': '🟢', 'GIALLO': '🟡', 'ROSSO': '🔴' };
  return emojiMap[result] || '';
}

// Apply filters
function applyFilters() {
  const startDate = document.getElementById('filterStart').value;
  const endDate = document.getElementById('filterEnd').value;
  const instrumentFilter = document.getElementById('filterInstrument').value.toLowerCase().trim();
  
  filteredTrades = currentTrades.filter(trade => {
    let match = true;
    
    if (startDate && trade.date < startDate) match = false;
    if (endDate && trade.date > endDate) match = false;
    if (instrumentFilter && !trade.instrument.toLowerCase().includes(instrumentFilter)) match = false;
    
    return match;
  });
  
  updateTradeTable();
  showToast(`Filtro applicato: ${filteredTrades.length} trade trovati`, 'info');
}

// Export to CSV
function exportToCSV() {
  const trades = filteredTrades.length > 0 ? filteredTrades : currentTrades;
  
  if (trades.length === 0) {
    showToast('Nessun trade da esportare', 'warning');
    return;
  }
  
  const headers = ['Data/Ora', 'Strumento', 'Timeframe', 'Segnale', 'Semaforo', 'Note'];
  const csvContent = [
    headers.join(','),
    ...trades.map(trade => [
      `"${trade.datetime}"`,
      `"${trade.instrument}"`,
      `"${trade.timeframe}"`,
      `"${trade.signalType}"`,
      `"${trade.semaphore}"`,
      `"${trade.note || ''}"`
    ].join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `semaforo-trades-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  
  showToast('Export CSV completato', 'success');
}

// Update statistics
function updateStats() {
  const stats = {
    verde: currentTrades.filter(t => t.semaphore === 'VERDE').length,
    giallo: currentTrades.filter(t => t.semaphore === 'GIALLO').length,
    rosso: currentTrades.filter(t => t.semaphore === 'ROSSO').length,
    total: currentTrades.length
  };
  
  // Update summary
  statsSummary.innerHTML = `
    <div class="stats-item stats-green">
      <div class="stats-number">${stats.verde}</div>
      <div class="stats-label">Verde</div>
    </div>
    <div class="stats-item stats-yellow">
      <div class="stats-number">${stats.giallo}</div>
      <div class="stats-label">Giallo</div>
    </div>
    <div class="stats-item stats-red">
      <div class="stats-number">${stats.rosso}</div>
      <div class="stats-label">Rosso</div>
    </div>
    <div class="stats-item">
      <div class="stats-number">${stats.total}</div>
      <div class="stats-label">Totale</div>
    </div>
  `;
  
  // Update chart
  updateStatsChart(stats);
}

// Update statistics chart
function updateStatsChart(stats) {
  const ctx = document.getElementById('statsChart').getContext('2d');
  
  if (statsChart) {
    statsChart.destroy();
  }
  
  if (stats.total === 0) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = '#626C71';
    ctx.font = '16px var(--font-family-base)';
    ctx.textAlign = 'center';
    ctx.fillText('Nessun dato disponibile', ctx.canvas.width / 2, ctx.canvas.height / 2);
    return;
  }
  
  statsChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Verde', 'Giallo', 'Rosso'],
      datasets: [{
        data: [stats.verde, stats.giallo, stats.rosso],
        backgroundColor: ['#4CAF50', '#FFC107', '#F44336'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            font: {
              size: 12
            }
          }
        }
      }
    }
  });
}

// Show toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `status status--${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    max-width: 300px;
    animation: slideIn 0.3s ease-out;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
}

// Add CSS animations for toast
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);