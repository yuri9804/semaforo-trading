class TradingDashboardPro {
  constructor() {
    this.chart = null;
    this.scenarios = JSON.parse(localStorage.getItem('tradingScenarios') || '[]');
    this.currentData = null;
    this.isMonteCarloMode = false;
    this.isMobile = window.innerWidth <= 768;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupTheme();
    this.setupResponsive();
    this.loadSavedConfig();
    this.updateScenariosTable();
    this.hideChartOverlay();
    
    // Auto-generate initial simulation
    setTimeout(() => {
      this.generateSimulation();
    }, 500);
  }

  setupEventListeners() {
    // Sidebar toggle
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
      this.toggleSidebar();
    });

    // Mobile overlay
    document.getElementById('mobileOverlay')?.addEventListener('click', () => {
      this.closeSidebar();
    });

    // Theme toggle
    document.getElementById('themeToggle')?.addEventListener('click', () => {
      this.toggleTheme();
    });

    // Simulation buttons
    document.getElementById('generateBtn')?.addEventListener('click', () => {
      this.generateSimulation();
    });

    document.getElementById('monteCarloBtn')?.addEventListener('click', () => {
      this.generateMonteCarloSimulation();
    });

    // Config actions
    document.getElementById('resetConfig')?.addEventListener('click', () => {
      this.resetConfig();
    });

    document.getElementById('saveConfig')?.addEventListener('click', () => {
      this.saveConfig();
    });

    // Chart controls
    document.getElementById('resetZoom')?.addEventListener('click', () => {
      this.resetChartZoom();
    });

    document.getElementById('fullscreen')?.addEventListener('click', () => {
      this.toggleChartFullscreen();
    });

    document.getElementById('exportChart')?.addEventListener('click', () => {
      this.exportChart();
    });

    // Scenario management
    document.getElementById('addScenario')?.addEventListener('click', () => {
      this.addCurrentScenario();
    });

    // Export data
    document.getElementById('exportData')?.addEventListener('click', () => {
      this.exportData();
    });

    // New simulation
    document.getElementById('newSimulation')?.addEventListener('click', () => {
      this.newSimulation();
    });

    // Input change handlers
    this.setupInputHandlers();
  }

  setupInputHandlers() {
    const inputs = document.querySelectorAll('.input-field');
    inputs.forEach(input => {
      input.addEventListener('input', this.debounce(() => {
        this.updateRiskMetrics();
        this.validateInputs();
      }, 300));
    });
  }

  setupTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    this.updateThemeToggle(savedTheme);
  }

  toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    this.updateThemeToggle(newTheme
