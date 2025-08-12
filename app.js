class TradingDashboard {
  constructor() {
    this.chart = null;
    this.scenarios = [];
    this.currentData = null;
    this.isMonteCarloMode = false;
    
    this.init();
  }

  init() {
    this.bindEvents();
    this.setupTheme();
    this.generateInitialSimulation();
    
    // Gestione orientamento e resize
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.handleOrientationChange();
      }, 100);
    });
    
    window.addEventListener('resize', this.debounce(() => {
      this.handleResize();
    }, 250));
  }

  bindEvents() {
    // Form events
    document.getElementById('generateBtn').addEventListener('click', () => {
      this.generateSimulation();
    });
    
    document.getElementById('monteCarloBtn').addEventListener('click', () => {
      this.generateMonteCarloSimulation();
    });
    
    document.getElementById('addScenario').addEventListener('click', () => {
      this.addCurrentScenario();
    });
    
    document.getElementById('themeToggle').addEventListener('click', () => {
      this.toggleTheme();
    });
    
    // Chart controls
    document.getElementById('resetZoom').addEventListener('click', () => {
      if (this.chart) {
        this.chart.resetZoom();
      }
    });
    
    document.getElementById('exportChart').addEventListener('click', () => {
      this.exportChart();
    });
    
    // Form input events
    const inputs = document.querySelectorAll('.form-control');
    inputs.forEach(input => {
      input.addEventListener('input', this.debounce(() => {
        this.updateRiskMetrics();
      }, 500));
    });
  }

  setupTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeToggle(savedTheme);
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    this.updateThemeToggle(newTheme);
    
    // Ricarica il grafico per il nuovo tema
    if (this.chart && this.currentData) {
      setTimeout(() => {
        this.updateChart(this.currentData, this.isMonteCarloMode);
      }, 100);
    }
  }

  updateThemeToggle(theme) {
    const toggle = document.getElementById('themeToggle');
    toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  showLoading() {
    document.getElementById('loadingOverlay').classList.add('active');
  }

  hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
  }

  getFormData() {
    return {
      initialBalance: parseFloat(document.getElementById('initialBalance').value),
      riskPerTrade: parseFloat(document.getElementById('riskPerTrade').value),
      winRate: parseFloat(document.getElementById('winRate').value),
      avgWin: parseFloat(document.getElementById('avgWin').value),
      avgLoss: parseFloat(document.getElementById('avgLoss').value),
      numTrades: parseInt(document.getElementById('numTrades').value)
    };
  }

  generateSimulation() {
    const params = this.getFormData();
    this.showLoading();
    
    setTimeout(() => {
      try {
        const curve = this.simulateTrading(params);
        this.currentData = [curve];
        this.isMonteCarloMode = false;
        
        this.updateChart(this.currentData, false);
        this.updateMetrics(curve, params);
        this.updateRiskMetrics();
        
        this.hideLoading();
      } catch (error) {
        console.error('Errore nella simulazione:', error);
        this.hideLoading();
        alert('Errore durante la generazione della simulazione');
      }
    }, 500);
  }

  generateMonteCarloSimulation() {
    const params = this.getFormData();
    this.showLoading();
    
    setTimeout(() => {
      try {
        const curves = [];
        const numSimulations = 50;
        
        for (let i = 0; i < numSimulations; i++) {
          const curve = this.simulateTrading(params, true);
          curves.push(curve);
        }
        
        this.currentData = curves;
        this.isMonteCarloMode = true;
        
        this.updateChart(curves, true);
        this.updateMonteCarloMetrics(curves, params);
        this.updateRiskMetrics();
        
        this.hideLoading();
      } catch (error) {
        console.error('Errore nella simulazione Monte Carlo:', error);
        this.hideLoading();
        alert('Errore durante la generazione della simulazione Monte Carlo');
      }
    }, 1000);
  }

  simulateTrading(params, randomize = false) {
    const { initialBalance, riskPerTrade, winRate, avgWin, avgLoss, numTrades } = params;
    
    let balance = initialBalance;
    let equity = [{ trade: 0, balance: balance }];
    let winningTrades = 0;
    let losingTrades = 0;
    let maxDrawdown = 0;
    let peak = balance;
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    
    for (let i = 1; i <= numTrades; i++) {
      const riskAmount = balance * (riskPerTrade / 100);
      
      let isWin, winPercent, lossPercent;
      
      if (randomize) {
        isWin = Math.random() < (winRate / 100);
        winPercent = this.randomNormal(avgWin, avgWin * 0.3);
        lossPercent = this.randomNormal(avgLoss, avgLoss * 0.3);
      } else {
        isWin = Math.random() < (winRate / 100);
        winPercent = avgWin;
        lossPercent = avgLoss;
      }
      
      let tradeResult;
      if (isWin) {
        tradeResult = riskAmount * (winPercent / 100);
        winningTrades++;
        currentWinStreak++;
        currentLossStreak = 0;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
        grossProfit += tradeResult;
      } else {
        tradeResult = -riskAmount * (lossPercent / 100);
        losingTrades++;
        currentLossStreak++;
        currentWinStreak = 0;
        maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
        grossLoss += Math.abs(tradeResult);
      }
      
      balance += tradeResult;
      
      if (balance > peak) {
        peak = balance;
      }
      
      const currentDrawdown = ((peak - balance) / peak) * 100;
      maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
      
      equity.push({ trade: i, balance: balance });
    }
    
    const totalReturn = ((balance - initialBalance) / initialBalance) * 100;
    const actualWinRate = (winningTrades / numTrades) * 100;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
    
    // Calcolo Sharpe Ratio
    const returns = [];
    for (let i = 1; i < equity.length; i++) {
      const returnPercent = ((equity[i].balance - equity[i-1].balance) / equity[i-1].balance) * 100;
      returns.push(returnPercent);
    }
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
    
    // Calmar Ratio
    const calmarRatio = maxDrawdown > 0 ? (totalReturn / maxDrawdown) : 0;
    
    return {
      equity,
      finalBalance: balance,
      totalReturn,
      maxDrawdown,
      winningTrades,
      losingTrades,
      actualWinRate,
      profitFactor,
      sharpeRatio,
      calmarRatio,
      maxWinStreak,
      maxLossStreak,
      grossProfit,
      grossLoss
    };
  }

  randomNormal(mean, stdDev) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(0.1, mean + z0 * stdDev);
  }

  updateChart(curves, isMonteCarloMode) {
    const ctx = document.getElementById('equityChart');
    if (!ctx) return;

    if (this.chart) {
      this.chart.destroy();
    }

    const isMobile = window.innerWidth <= 768;
    const datasets = [];

    if (isMonteCarloMode) {
      // Monte Carlo: curve multiple con trasparenza
      curves.forEach((curve, index) => {
        datasets.push({
          label: `Simulazione ${index + 1}`,
          data: curve.equity.map(point => ({ x: point.trade, y: point.balance })),
          borderColor: `hsla(${200 + (index * 7) % 160}, 70%, 60%, 0.3)`,
          backgroundColor: 'transparent',
          borderWidth: 1,
          pointRadius: 0,
          pointHoverRadius: 3,
          tension: 0.1,
          fill: false
        });
      });

      // Curva media
      const avgCurve = this.calculateAverageCurve(curves);
      datasets.push({
        label: 'Media',
        data: avgCurve.map((point, index) => ({ x: index, y: point })),
        borderColor: '#dc2626',
        backgroundColor: 'transparent',
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.1,
        fill: false
      });
    } else {
      // Simulazione singola
      const curve = curves[0];
      datasets.push({
        label: 'Equity Curve',
        data: curve.equity.map(point => ({ x: point.trade, y: point.balance })),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.1,
        fill: true
      });
    }

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      devicePixelRatio: window.devicePixelRatio || 1,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: !isMobile || !isMonteCarloMode,
          position: 'top',
          labels: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim(),
            font: {
              family: getComputedStyle(document.documentElement).getPropertyValue('--font-family-base').trim(),
              size: isMobile ? 10 : 12
            },
            filter: function(legendItem, chartData) {
              // Mostra solo la curva media in modalità Monte Carlo su mobile
              if (isMobile && isMonteCarloMode) {
                return legendItem.text === 'Media';
              }
              return true;
            }
          }
        },
        tooltip: {
          enabled: true,
          backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim(),
          titleColor: getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim(),
          bodyColor: getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim(),
          borderColor: getComputedStyle(document.documentElement).getPropertyValue('--color-border').trim(),
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            title: (context) => `Trade ${context[0].label}`,
            label: (context) => `Saldo: $${context.parsed.y.toLocaleString()}`
          }
        }
      },
      scales: {
        x: {
          title: {
            display: !isMobile,
            text: 'Numero Trade',
            color: getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary').trim()
          },
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary').trim(),
            maxTicksLimit: isMobile ? 5 : 10
          },
          grid: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--color-border').trim()
          }
        },
        y: {
          title: {
            display: !isMobile,
            text: 'Saldo ($)',
            color: getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary').trim()
          },
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary').trim(),
            callback: function(value) {
              return '$' + value.toLocaleString();
            }
          },
          grid: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--color-border').trim()
          }
        }
      }
    };

    this.chart = new Chart(ctx, {
      type: 'line',
      data: { datasets },
      options: chartOptions
    });
  }

  calculateAverageCurve(curves) {
    if (curves.length === 0) return [];
    
    const maxLength = Math.max(...curves.map(curve => curve.equity.length));
    const avgCurve = [];
    
    for (let i = 0; i < maxLength; i++) {
      let sum = 0;
      let count = 0;
      
      curves.forEach(curve => {
        if (i < curve.equity.length) {
          sum += curve.equity[i].balance;
          count++;
        }
      });
      
      avgCurve.push(count > 0 ? sum / count : 0);
    }
    
    return avgCurve;
  }

  updateMetrics(curve, params) {
    const totalProfit = curve.finalBalance - params.initialBalance;
    const totalReturn = curve.totalReturn;

    // Aggiorna le metriche principali
    document.getElementById('finalBalance').textContent = `$${curve.finalBalance.toLocaleString()}`;
    document.getElementById('finalBalanceChange').textContent = `${totalReturn.toFixed(2)}%`;
    document.getElementById('finalBalanceChange').className = `metric-change ${totalReturn >= 0 ? '' : 'negative'}`;

    document.getElementById('totalProfit').textContent = `$${totalProfit.toLocaleString()}`;
    document.getElementById('totalProfitChange').textContent = `${totalReturn.toFixed(2)}%`;
    document.getElementById('totalProfitChange').className = `metric-change ${totalProfit >= 0 ? '' : 'negative'}`;

    document.getElementById('maxDrawdown').textContent = `${curve.maxDrawdown.toFixed(2)}%`;
    document.getElementById('maxDrawdownChange').textContent = `${curve.maxDrawdown.toFixed(2)}%`;

    document.getElementById('actualWinRate').textContent = `${curve.actualWinRate.toFixed(1)}%`;
    document.getElementById('winRateChange').textContent = `${(curve.actualWinRate - params.winRate).toFixed(1)}%`;
    document.getElementById('winRateChange').className = `metric-change ${curve.actualWinRate >= params.winRate ? '' : 'negative'}`;

    // Aggiorna le statistiche dettagliate
    document.getElementById('totalTrades').textContent = params.numTrades;
    document.getElementById('winningTrades').textContent = curve.winningTrades;
    document.getElementById('losingTrades').textContent = curve.losingTrades;
    document.getElementById('profitFactor').textContent = curve.profitFactor.toFixed(2);
    document.getElementById('sharpeRatio').textContent = curve.sharpeRatio.toFixed(2);
    document.getElementById('calmarRatio').textContent = curve.calmarRatio.toFixed(2);
    document.getElementById('maxWinStreak').textContent = curve.maxWinStreak;
    document.getElementById('maxLossStreak').textContent = curve.maxLossStreak;
  }

  updateMonteCarloMetrics(curves, params) {
    // Calcola statistiche aggregate
    const finalBalances = curves.map(curve => curve.finalBalance);
    const totalReturns = curves.map(curve => curve.totalReturn);
    const maxDrawdowns = curves.map(curve => curve.maxDrawdown);
    const winRates = curves.map(curve => curve.actualWinRate);
    const sharpeRatios = curves.map(curve => curve.sharpeRatio);
    const profitFactors = curves.map(curve => curve.profitFactor);

    const avgFinalBalance = this.average(finalBalances);
    const avgTotalReturn = this.average(totalReturns);
    const avgMaxDrawdown = this.average(maxDrawdowns);
    const avgWinRate = this.average(winRates);
    const avgSharpeRatio = this.average(sharpeRatios);
    const avgProfitFactor = this.average(profitFactors);

    const totalProfit = avgFinalBalance - params.initialBalance;

    // Aggiorna le metriche principali con i valori medi
    document.getElementById('finalBalance').textContent = `$${avgFinalBalance.toLocaleString()}`;
    document.getElementById('finalBalanceChange').textContent = `${avgTotalReturn.toFixed(2)}%`;
    document.getElementById('finalBalanceChange').className = `metric-change ${avgTotalReturn >= 0 ? '' : 'negative'}`;

    document.getElementById('totalProfit').textContent = `$${totalProfit.toLocaleString()}`;
    document.getElementById('totalProfitChange').textContent = `${avgTotalReturn.toFixed(2)}%`;
    document.getElementById('totalProfitChange').className = `metric-change ${totalProfit >= 0 ? '' : 'negative'}`;

    document.getElementById('maxDrawdown').textContent = `${avgMaxDrawdown.toFixed(2)}%`;
    document.getElementById('maxDrawdownChange').textContent = `${avgMaxDrawdown.toFixed(2)}%`;

    document.getElementById('actualWinRate').textContent = `${avgWinRate.toFixed(1)}%`;
    document.getElementById('winRateChange').textContent = `${(avgWinRate - params.winRate).toFixed(1)}%`;
    document.getElementById('winRateChange').className = `metric-change ${avgWinRate >= params.winRate ? '' : 'negative'}`;

    // Aggiorna le statistiche dettagliate con i valori medi
    document.getElementById('totalTrades').textContent = params.numTrades;
    document.getElementById('winningTrades').textContent = Math.round(params.numTrades * (avgWinRate / 100));
    document.getElementById('losingTrades').textContent = Math.round(params.numTrades * ((100 - avgWinRate) / 100));
    document.getElementById('profitFactor').textContent = avgProfitFactor.toFixed(2);
    document.getElementById('sharpeRatio').textContent = avgSharpeRatio.toFixed(2);
    document.getElementById('calmarRatio').textContent = (avgTotalReturn / avgMaxDrawdown).toFixed(2);
    
    // Per le streak, prendiamo i valori medi
    const avgMaxWinStreak = this.average(curves.map(curve => curve.maxWinStreak));
    const avgMaxLossStreak = this.average(curves.map(curve => curve.maxLossStreak));
    document.getElementById('maxWinStreak').textContent = Math.round(avgMaxWinStreak);
    document.getElementById('maxLossStreak').textContent = Math.round(avgMaxLossStreak);
  }

  updateRiskMetrics() {
    const params = this.getFormData();
    
    // Calcoli di risk management teorici
    const expectedDrawdown = this.calculateExpectedDrawdown(params);
    const theoreticalSharpe = this.calculateTheoreticalSharpe(params);
    const theoreticalProfitFactor = (params.avgWin * params.winRate) / (params.avgLoss * (100 - params.winRate));
    
    document.getElementById('maxDrawdownRisk').textContent = `${expectedDrawdown.toFixed(1)}%`;
    document.getElementById('sharpeRatioRisk').textContent = theoreticalSharpe.toFixed(2);
    document.getElementById('profitFactorRisk').textContent = theoreticalProfitFactor.toFixed(2);
  }

  calculateExpectedDrawdown(params) {
    // Formula empirica per il drawdown atteso
    const { winRate, avgWin, avgLoss } = params;
    const expectancy = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;
    const winLossRatio = avgWin / avgLoss;
    
    // Stima conservativa del drawdown
    return Math.max(10, 100 / (1 + winLossRatio * (winRate / (100 - winRate))));
  }

  calculateTheoreticalSharpe(params) {
    // Calcolo teorico del Sharpe Ratio
    const { winRate, avgWin, avgLoss } = params;
    const expectancy = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;
    const variance = (winRate / 100) * Math.pow(avgWin, 2) + ((100 - winRate) / 100) * Math.pow(avgLoss, 2) - Math.pow(expectancy, 2);
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? (expectancy / stdDev) * Math.sqrt(252) : 0;
  }

  addCurrentScenario() {
    if (!this.currentData) {
      alert('Genera prima una simulazione');
      return;
    }

    const params = this.getFormData();
    const curve = this.isMonteCarloMode ? this.calculateAverageScenario(this.currentData) : this.currentData[0];
    
    const scenario = {
      id: Date.now(),
      name: `Scenario ${this.scenarios.length + 1}`,
      params,
      results: curve,
      isMonteCarloMode: this.isMonteCarloMode
    };

    this.scenarios.push(scenario);
    this.updateScenariosTable();
  }

  calculateAverageScenario(curves) {
    const finalBalances = curves.map(curve => curve.finalBalance);
    const totalReturns = curves.map(curve => curve.totalReturn);
    const maxDrawdowns = curves.map(curve => curve.maxDrawdown);
    const winRates = curves.map(curve => curve.actualWinRate);
    const sharpeRatios = curves.map(curve => curve.sharpeRatio);

    return {
      finalBalance: this.average(finalBalances),
      totalReturn: this.average(totalReturns),
      maxDrawdown: this.average(maxDrawdowns),
      actualWinRate: this.average(winRates),
      sharpeRatio: this.average(sharpeRatios)
    };
  }

  updateScenariosTable() {
    const tbody = document.getElementById('scenarioTableBody');
    tbody.innerHTML = '';

    this.scenarios.forEach((scenario, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${scenario.name}${scenario.isMonteCarloMode ? ' (MC)' : ''}</td>
        <td>${scenario.params.winRate}%</td>
        <td>${scenario.params.riskPerTrade}%</td>
        <td>${scenario.params.avgWin}%</td>
        <td>${scenario.params.avgLoss}%</td>
        <td class="${scenario.results.totalReturn >= 0 ? 'text-success' : 'text-danger'}">
          $${scenario.results.finalBalance.toLocaleString()}
        </td>
        <td class="text-danger">${scenario.results.maxDrawdown.toFixed(2)}%</td>
        <td>${scenario.results.sharpeRatio.toFixed(2)}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="dashboard.removeScenario(${index})">
            Rimuovi
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  removeScenario(index) {
    this.scenarios.splice(index, 1);
    this.updateScenariosTable();
  }

  exportChart() {
    if (!this.chart) {
      alert('Nessun grafico da esportare');
      return;
    }

    const link = document.createElement('a');
    link.download = 'equity-curve.png';
    link.href = this.chart.toBase64Image();
    link.click();
  }

  generateInitialSimulation() {
    // Genera una simulazione iniziale con i valori di default
    setTimeout(() => {
      this.generateSimulation();
    }, 100);
  }

  handleOrientationChange() {
    if (this.chart) {
      this.chart.resize();
    }
    this.updateLayout();
  }

  handleResize() {
    if (this.chart) {
      this.chart.resize();
    }
  }

  updateLayout() {
    // Aggiorna il layout dopo il cambio di orientamento
    const isMobile = window.innerWidth <= 768;
    
    if (this.chart && this.currentData) {
      // Rigenera il grafico con le nuove impostazioni responsive
      setTimeout(() => {
        this.updateChart(this.currentData, this.isMonteCarloMode);
      }, 100);
    }
  }

  // Utility functions
  average(arr) {
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Inizializza l'applicazione
const dashboard = new TradingDashboard();

// Gestione errori globali
window.addEventListener('error', (event) => {
  console.error('Errore JavaScript:', event.error);
  dashboard.hideLoading();
});

// Service Worker per PWA (opzionale)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('Service Worker registration failed:', err);
    });
  });
}
