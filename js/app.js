/**
 * Gestor de Finanzas Personal — Core Mobile Application
 * Conforme con Apple Human Interface Guidelines (HIG)
 * Módulos: Gastos, Ingresos, Patrimonio (Inversiones & Deudas), Simulador y Análisis
 */

(() => {
  'use strict';

  // Production Google Apps Script Web App Endpoint
  const API_URL = 'https://script.google.com/macros/s/AKfycbyogIhzECXac_7knBSHpwT4DzGEm_PAhu6OaI_l574QLL6qBfXOAFd80hNcazTpQK8Y/exec';

  // Category Icon & Color Mapping
  const CATEGORY_META = {
    'Comida': { icon: '🍔', color: '#FF9500' },
    'Mercado / compras': { icon: '🛒', color: '#34C759' },
    'Gasolina': { icon: '⛽', color: '#FF3B30' },
    'Transporte': { icon: '🚌', color: '#007AFF' },
    'Tecnología': { icon: '💻', color: '#5856D6' },
    'Hogar': { icon: '🏠', color: '#AF52DE' },
    'Educación': { icon: '📚', color: '#5AC8FA' },
    'Entretenimiento': { icon: '🍿', color: '#FF2D55' },
    'Ropa': { icon: '👗', color: '#CC73E1' },
    'Salud': { icon: '💊', color: '#30B0C7' },
    'Regalos': { icon: '🎁', color: '#FFCC00' },
    'Trabajo': { icon: '💼', color: '#8E8E93' },
    'Otros': { icon: '📦', color: '#A2845E' },
    'Inversión': { icon: '📈', color: '#0A7C5B' },
    'Pago Deuda': { icon: '💳', color: '#E056FD' }
  };

  const ASSET_CLASS_META = {
    'Renta Fija': { icon: '📄', color: '#34C759' },
    'Ahorro': { icon: '💜', color: '#AF52DE' },
    'Renta Variable': { icon: '📊', color: '#007AFF' },
    'Fondos': { icon: '💼', color: '#FF9500' },
    'Cripto': { icon: '🪙', color: '#FFCC00' },
    'Inmobiliario': { icon: '🏠', color: '#5856D6' },
    'Otros': { icon: '📦', color: '#8E8E93' }
  };

  const PALETTE = ['#FF9500', '#34C759', '#FF3B30', '#007AFF', '#5856D6', '#AF52DE', '#30B0C7', '#FF2D55', '#FFCC00', '#A2845E'];

  // Semillas limpias: Inversiones y Deudas inician en blanco
  const DEFAULT_INVERSIONES = [];
  const DEFAULT_DEUDAS = [];

  // Application State
  const state = {
    accessPin: localStorage.getItem('finanzas_access_pin') || '',
    privacyMode: localStorage.getItem('finanzas_privacy') === 'true',
    gastos: [],
    inversiones: JSON.parse(localStorage.getItem('finanzas_inversiones') || '[]') || [],
    deudas: JSON.parse(localStorage.getItem('finanzas_deudas') || '[]') || [],
    presupuestosMensuales: [],
    presupuestoMesSeleccionado: new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit' }).format(new Date()),
    editingInvId: null,
    editingDebtId: null,
    analyticsPeriod: 'month',
    presupuesto: JSON.parse(localStorage.getItem('finanzas_presupuesto') || 'null') || {
      montoBase: 0,
      sobres: []
    },
    plannerActiveTab: 'draft',
    resumen: {
      mesActual: 'Septiembre 2026',
      totalGastos: 73800,
      totalIngresos: 0,
      balance: -73800,
      porCategoria: [],
      porMedio: []
    },
    activeTab: 'tab-inicio',
    activePatrimonioSubview: 'subview-inversiones',
    filterCategory: 'all',
    searchQuery: '',
    selectedMovement: null,
    selectedInvForVal: null,
    simulator: {
      strategy: 'avalanche',
      extraMonthly: 100000
    },
    formData: {
      tipo: 'Gasto',
      valor: 0,
      concepto: '',
      categoria: 'Comida',
      medioPago: 'Débito',
      cuenta: 'Otra',
      nota: '',
      moneda: 'COP',
      debtId: null
    }
  };

  // DOM Elements
  const els = {
    authGate: document.getElementById('auth-gate'),
    authForm: document.getElementById('auth-form'),
    authPin: document.getElementById('auth-pin'),
    authError: document.getElementById('auth-error'),
    headerDate: document.getElementById('header-date'),
    headerTitle: document.getElementById('header-main-title'),
    btnSync: document.getElementById('btn-sync'),
    btnTogglePrivacy: document.getElementById('btn-toggle-privacy'),
    toast: document.getElementById('toast'),

    // Home
    homeBalance: document.getElementById('home-balance'),
    homeGastos: document.getElementById('home-gastos'),
    homeIngresos: document.getElementById('home-ingresos'),
    homeNetWorthVal: document.getElementById('home-net-worth-val'),
    homeNetWorthPill: document.getElementById('home-net-worth-pill'),
    cardSnapshotInv: document.getElementById('card-snapshot-inv'),
    snapInvVal: document.getElementById('snap-inv-val'),
    snapInvReturn: document.getElementById('snap-inv-return'),
    snapInvSub: document.getElementById('snap-inv-sub'),
    cardSnapshotDebt: document.getElementById('card-snapshot-debt'),
    snapDebtVal: document.getElementById('snap-debt-val'),
    snapDebtCount: document.getElementById('snap-debt-count'),
    snapDebtSub: document.getElementById('snap-debt-sub'),
    cardOpenPlanner: document.getElementById('card-open-planner'),
    btnOpenMonthlyBudget: document.getElementById('btn-open-monthly-budget'),
    monthlyBudgetSummary: document.getElementById('monthly-budget-summary'),
    modalMonthlyBudget: document.getElementById('modal-monthly-budget'),
    btnCloseMonthlyBudget: document.getElementById('btn-close-monthly-budget'),
    monthlyBudgetMonth: document.getElementById('monthly-budget-month'),
    monthlyBudgetList: document.getElementById('monthly-budget-list'),
    monthlyBudgetCategory: document.getElementById('monthly-budget-category'),
    monthlyBudgetAmount: document.getElementById('monthly-budget-amount'),
    btnSaveMonthlyBudget: document.getElementById('btn-save-monthly-budget'),
    plannerStatusBadge: document.getElementById('planner-status-badge'),
    plannerPreviewTotal: document.getElementById('planner-preview-total'),
    plannerPreviewAssigned: document.getElementById('planner-preview-assigned'),
    plannerPreviewSpent: document.getElementById('planner-preview-spent'),
    plannerPreviewProgress: document.getElementById('planner-preview-progress'),
    btnQuickAdd: document.getElementById('btn-quick-add'),
    donutSvg: document.getElementById('donut-svg'),
    donutCenterVal: document.getElementById('donut-center-val'),
    chartTotalCount: document.getElementById('chart-total-count'),
    homeChartLegend: document.getElementById('home-chart-legend'),
    homeRecentList: document.getElementById('home-recent-list'),
    btnSeeAll: document.getElementById('btn-see-all'),

    // Feed / Movimientos
    searchInput: document.getElementById('search-input'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    filterChips: document.getElementById('filter-chips-container'),
    feedContainer: document.getElementById('feed-container'),

    // Form
    formAmount: document.getElementById('form-amount'),
    formConcept: document.getElementById('form-concept'),
    formConceptLabel: document.getElementById('form-concept-label'),
    formNote: document.getElementById('form-note'),
    formNoteLabel: document.getElementById('form-note-label'),
    btnSubmitExpense: document.getElementById('btn-submit-expense'),
    btnSubmitText: document.querySelector('#btn-submit-expense .btn-text'),
    typeSegments: document.querySelectorAll('.segment-btn'),
    quickAmtBtns: document.querySelectorAll('.quick-amt-btn'),
    merchantChips: document.querySelectorAll('.merchant-chip'),
    expenseConceptChips: document.getElementById('expense-concept-chips'),
    incomeSourceChips: document.getElementById('income-source-chips'),
    incomeSourceButtons: document.querySelectorAll('.income-source-chip'),
    investmentConceptChips: document.getElementById('investment-concept-chips'),
    debtConceptChips: document.getElementById('debt-concept-chips'),
    expenseCategoryBlock: document.getElementById('expense-category-block'),
    expensePaymentBlock: document.getElementById('expense-payment-block'),
    incomeAccountBlock: document.getElementById('income-account-block'),
    accountPills: document.querySelectorAll('.account-pill'),
    catPills: document.querySelectorAll('.cat-pill'),
    payPills: document.querySelectorAll('.pay-pill'),

    // Patrimonio (Inversiones & Deudas)
    patNavBtns: document.querySelectorAll('.pat-nav-btn'),
    badgeTotalInv: document.getElementById('badge-total-inv'),
    badgeTotalDebt: document.getElementById('badge-total-debt'),
    subviewInversiones: document.getElementById('subview-inversiones'),
    subviewDeudas: document.getElementById('subview-deudas'),
    invTotalMarket: document.getElementById('inv-total-market'),
    invTotalPrincipal: document.getElementById('inv-total-principal'),
    invTotalProfit: document.getElementById('inv-total-profit'),
    invHeroYield: document.getElementById('inv-hero-yield'),
    btnOpenAddInv: document.getElementById('btn-open-add-inv'),
    invDonutSvg: document.getElementById('inv-donut-svg'),
    invDonutCenterVal: document.getElementById('inv-donut-center-val'),
    invAssetCount: document.getElementById('inv-asset-count'),
    invChartLegend: document.getElementById('inv-chart-legend'),
    investmentsContainer: document.getElementById('investments-container'),

    debtTotalAmount: document.getElementById('debt-total-amount'),
    debtTotalMonthly: document.getElementById('debt-total-monthly'),
    debtUtilizationVal: document.getElementById('debt-utilization-val'),
    debtHeroDtiBadge: document.getElementById('debt-hero-dti-badge'),
    btnOpenAddDebt: document.getElementById('btn-open-add-debt'),
    strategyBtns: document.querySelectorAll('.strategy-btn'),
    simExtraSlider: document.getElementById('sim-extra-slider'),
    simExtraVal: document.getElementById('sim-extra-val'),
    simMonthsFree: document.getElementById('sim-months-free'),
    simDateFree: document.getElementById('sim-date-free'),
    simInterestSaved: document.getElementById('sim-interest-saved'),
    simTimeSaved: document.getElementById('sim-time-saved'),
    debtsContainer: document.getElementById('debts-container'),

    // Analytics 2.0
    analyticsPeriodControl: document.getElementById('analytics-period-control'),
    kpiSavingsRate: document.getElementById('kpi-savings-rate'),
    kpiSavingsBadge: document.getElementById('kpi-savings-badge'),
    kpiDailyAvg: document.getElementById('kpi-daily-avg'),
    kpiDailySub: document.getElementById('kpi-daily-sub'),
    kpiPeakDay: document.getElementById('kpi-peak-day'),
    kpiPeakDayAmount: document.getElementById('kpi-peak-day-amount'),
    kpiPeriodBalance: document.getElementById('kpi-period-balance'),
    kpiPeriodBalanceSub: document.getElementById('kpi-period-balance-sub'),
    timelineBarsContainer: document.getElementById('timeline-bars-container'),
    timelineChartSubtitle: document.getElementById('timeline-chart-subtitle'),
    timelineAvgBadge: document.getElementById('timeline-avg-badge'),
    analyticsDonut: document.getElementById('chart-analytics-donut'),
    analyticsDonutCenter: document.getElementById('analytics-donut-center'),
    donutCenterCategoryLabel: document.getElementById('donut-center-category-label'),
    donutCenterCategoryVal: document.getElementById('donut-center-category-val'),
    donutCenterCategorySub: document.getElementById('donut-center-category-sub'),
    analyticsCategories: document.getElementById('analytics-categories-list'),
    analyticsPayments: document.getElementById('analytics-payments-bars'),
    netWorthBadge: document.getElementById('net-worth-badge'),
    nwTotalAssets: document.getElementById('nw-total-assets'),
    nwNetWorth: document.getElementById('nw-net-worth'),
    nwTotalLiabilities: document.getElementById('nw-total-liabilities'),
    nwBarAsset: document.getElementById('nw-bar-asset'),
    nwBarDebt: document.getElementById('nw-bar-debt'),
    nwRatioText: document.getElementById('nw-ratio-text'),
    analyticsTopExpenses: document.getElementById('analytics-top-expenses'),

    // Modals
    modalDetail: document.getElementById('modal-detail'),
    modalConcept: document.getElementById('modal-concept'),
    modalAmount: document.getElementById('modal-amount'),
    modalDatetime: document.getElementById('modal-datetime'),
    modalCategoryLabel: document.getElementById('modal-category-label'),
    modalCategory: document.getElementById('modal-category'),
    modalPaymentLabel: document.getElementById('modal-payment-label'),
    modalPayment: document.getElementById('modal-payment'),
    modalNote: document.getElementById('modal-note'),
    modalId: document.getElementById('modal-id'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnModalDelete: document.getElementById('btn-modal-delete'),

    modalInversion: document.getElementById('modal-inversion'),
    modalInvTitle: document.getElementById('modal-inv-title'),
    formInversion: document.getElementById('form-inversion'),
    btnSaveInvText: document.getElementById('btn-save-inv-text'),
    btnDeleteInv: document.getElementById('btn-delete-inv'),
    btnCloseModalInv: document.getElementById('btn-close-modal-inv'),

    modalDeuda: document.getElementById('modal-deuda'),
    modalDebtTitle: document.getElementById('modal-debt-title'),
    formDeuda: document.getElementById('form-deuda'),
    btnSaveDebtText: document.getElementById('btn-save-debt-text'),
    btnDeleteDebt: document.getElementById('btn-delete-debt'),
    btnCloseModalDebt: document.getElementById('btn-close-modal-debt'),

    modalValUpdate: document.getElementById('modal-val-update'),
    modalValAssetName: document.getElementById('modal-val-asset-name'),
    valNewAmount: document.getElementById('val-new-amount'),
    btnSaveValUpdate: document.getElementById('btn-save-val-update'),
    btnCloseModalVal: document.getElementById('btn-close-modal-val'),

    // Modal Gestor & Distribuidor de Dinero
    modalPresupuesto: document.getElementById('modal-presupuesto'),
    btnCloseModalPlanner: document.getElementById('btn-close-modal-planner'),
    plannerTabBtns: document.querySelectorAll('.planner-tab-btn'),
    plannerSubviewDraft: document.getElementById('planner-subview-draft'),
    plannerSubviewCompare: document.getElementById('planner-subview-compare'),
    plannerBaseAmount: document.getElementById('planner-base-amount'),
    btnUseMonthlyIncome: document.getElementById('btn-use-monthly-income'),
    presetChips: document.querySelectorAll('.preset-chip'),
    plannerAllocatedVal: document.getElementById('planner-allocated-val'),
    plannerRemainingVal: document.getElementById('planner-remaining-val'),
    plannerRemainingLbl: document.getElementById('planner-remaining-lbl'),
    plannerAllocatedBar: document.getElementById('planner-allocated-bar'),
    plannerEnvelopesList: document.getElementById('planner-envelopes-list'),
    plannerEnvelopesCount: document.getElementById('planner-envelopes-count'),
    btnAddEnvelope: document.getElementById('btn-add-envelope'),
    btnSavePlannerDraft: document.getElementById('btn-save-planner-draft'),
    compareTotalBudgeted: document.getElementById('compare-total-budgeted'),
    compareTotalSpent: document.getElementById('compare-total-spent'),
    compareNetDiff: document.getElementById('compare-net-diff'),
    compareHeroBadge: document.getElementById('compare-hero-badge'),
    compareProgressBar: document.getElementById('compare-progress-bar'),
    plannerComparisonList: document.getElementById('planner-comparison-list'),
    plannerUnbudgetedList: document.getElementById('planner-unbudgeted-list'),

    // Navigation
    tabItems: document.querySelectorAll('.tab-item')
  };

  // =========================================================================
  // Utilities
  // =========================================================================

  function formatCOP(amount) {
    const val = Number(amount) || 0;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  }

  function showToast(message, duration = 2500) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(els.toast._timer);
    els.toast._timer = setTimeout(() => {
      els.toast.classList.remove('show');
    }, duration);
  }

  function triggerHaptic() {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }

  function togglePrivacyMode(force) {
    state.privacyMode = typeof force === 'boolean' ? force : !state.privacyMode;
    document.body.classList.toggle('privacy-active', state.privacyMode);
    localStorage.setItem('finanzas_privacy', state.privacyMode);
    showToast(state.privacyMode ? 'Modo privacidad activado' : 'Cifras visibles');
  }

  // =========================================================================
  // Calculations & Patrimonio Engines
  // =========================================================================

  function calculatePatrimonioTotals() {
    const totalInvMarket = state.inversiones.reduce((acc, i) => acc + (Number(i.valorActual) || 0), 0);
    const totalInvPrincipal = state.inversiones.reduce((acc, i) => acc + (Number(i.montoInvertido) || 0), 0);
    const totalInvProfit = totalInvMarket - totalInvPrincipal;
    const invYieldPct = totalInvPrincipal > 0 ? ((totalInvProfit / totalInvPrincipal) * 100).toFixed(1) : '0';

    const totalDebt = state.deudas.reduce((acc, d) => acc + (Number(d.saldoPendiente) || 0), 0);
    const totalDebtMonthly = state.deudas.reduce((acc, d) => acc + (Number(d.cuotaMensual) || 0), 0);
    const totalDebtLimit = state.deudas.reduce((acc, d) => acc + (Number(d.cupoTotal) || Number(d.saldoPendiente) || 0), 0);
    const debtUtilization = totalDebtLimit > 0 ? Math.round((totalDebt / totalDebtLimit) * 100) : 0;

    // Net Worth = Inversiones + Balance mes - Deudas
    const cashBalance = state.resumen.balance || 0;
    const netWorth = totalInvMarket + cashBalance - totalDebt;

    // DTI (Debt-to-Income Ratio): cuotas mensuales / ingresos del mes
    const monthlyIncome = Math.max(state.resumen.totalIngresos, 1);
    const dtiRatio = state.resumen.totalIngresos > 0
      ? Math.round((totalDebtMonthly / state.resumen.totalIngresos) * 100)
      : Math.round((totalDebtMonthly / 3500000) * 100); // Estimado referencial si ingresos no registrados

    return {
      totalInvMarket,
      totalInvPrincipal,
      totalInvProfit,
      invYieldPct,
      totalDebt,
      totalDebtMonthly,
      debtUtilization,
      netWorth,
      dtiRatio
    };
  }

  // =========================================================================
  // Data Fetching & Sync
  // =========================================================================

  async function apiRequest(payload) {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ ...payload, accessPin: state.accessPin })
    });
    const data = await resp.json();
    if (data && data.code === 'UNAUTHORIZED') {
      localStorage.removeItem('finanzas_access_pin');
      state.accessPin = '';
      els.authGate.classList.remove('is-hidden');
      els.authError.textContent = 'El PIN no es correcto.';
      throw new Error('UNAUTHORIZED');
    }
    return data;
  }

  function loadLocalCache() {
    try {
      const cached = localStorage.getItem('finanzas_cache_data');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.gastos && parsed.gastos.length) {
          state.gastos = parsed.gastos;
          state.resumen = parsed.resumen || state.resumen;
        }
      }
      const invLocal = localStorage.getItem('finanzas_inversiones');
      if (invLocal) {
        state.inversiones = JSON.parse(invLocal) || [];
      }
      // Purgar semillas demo anteriores si existían en caché
      const dummyInvIds = ['inv-1', 'inv-2', 'inv-3'];
      state.inversiones = (state.inversiones || []).filter(i => !dummyInvIds.includes(i.id));

      const debLocal = localStorage.getItem('finanzas_deudas');
      if (debLocal) {
        state.deudas = JSON.parse(debLocal) || [];
      }
      // Purgar semillas demo anteriores si existían en caché
      const dummyDebtIds = ['deb-1', 'deb-2'];
      state.deudas = (state.deudas || []).filter(d => !dummyDebtIds.includes(d.id));

      // Guardar depuración en caché
      localStorage.setItem('finanzas_inversiones', JSON.stringify(state.inversiones));
      localStorage.setItem('finanzas_deudas', JSON.stringify(state.deudas));

      const presLocal = localStorage.getItem('finanzas_presupuesto');
      if (presLocal) {
        try { state.presupuesto = JSON.parse(presLocal); } catch (_) {}
      }
    } catch (e) {
      console.warn('Error al leer caché local:', e);
    }
  }

  function saveLocalCache() {
    try {
      localStorage.setItem('finanzas_cache_data', JSON.stringify({
        gastos: state.gastos,
        resumen: state.resumen,
        timestamp: Date.now()
      }));
      localStorage.setItem('finanzas_inversiones', JSON.stringify(state.inversiones));
      localStorage.setItem('finanzas_deudas', JSON.stringify(state.deudas));
      localStorage.setItem('finanzas_presupuesto', JSON.stringify(state.presupuesto));
    } catch (e) {
      console.warn('Error al guardar caché:', e);
    }
  }

  async function syncData(showFeedback = false) {
    els.btnSync.classList.add('rotating');
    try {
      const data = await apiRequest({ action: 'getData' });

      if (data.ok && data.gastos) {
        state.gastos = data.gastos;
        if (data.resumen) {
          state.resumen = data.resumen;
        }
        recalculateLocalResumen();
        if (Array.isArray(data.presupuestosMensuales)) {
          state.presupuestosMensuales = data.presupuestosMensuales;
        }

        // Sincronizar Inversiones desde Google Sheets
        if (Array.isArray(data.inversiones)) {
          if (data.inversiones.length > 0) {
            state.inversiones = data.inversiones;
          } else if (state.inversiones && state.inversiones.length > 0) {
            // Migración inicial: subir registros locales existentes al nuevo Sheet de Inversiones
            state.inversiones.forEach(inv => {
              apiRequest({ action: 'saveInversion', ...inv }).catch(err => console.warn('Error migrando inversión a Sheets:', err));
            });
          }
        }

        // Sincronizar Deudas desde Google Sheets
        if (Array.isArray(data.deudas)) {
          if (data.deudas.length > 0) {
            state.deudas = data.deudas;
          } else if (state.deudas && state.deudas.length > 0) {
            // Migración inicial: subir registros locales existentes al nuevo Sheet de Deudas
            state.deudas.forEach(deb => {
              apiRequest({ action: 'saveDeuda', ...deb }).catch(err => console.warn('Error migrando deuda a Sheets:', err));
            });
          }
        }

        saveLocalCache();
        renderAll();
        if (showFeedback) showToast('Sincronizado con Google Sheets ✓');
        return true;
      } else {
        throw new Error(data.error || 'Respuesta no válida');
      }
    } catch (err) {
      console.error('Fallo en sincronización:', err);
      recalculateLocalResumen();
      renderAll();
      if (showFeedback && err.message !== 'UNAUTHORIZED') showToast('Modo sin conexión (datos locales)');
      return false;
    } finally {
      els.btnSync.classList.remove('rotating');
    }
  }

  function recalculateLocalResumen() {
    let totalG = 0;
    let totalI = 0;
    const catMap = {};
    const medMap = {};

    state.gastos.forEach(g => {
      const v = Number(g.valor) || 0;
      if (g.tipo === 'Ingreso') {
        totalI += v;
      } else if (g.tipo === 'Inversión') {
        // Los aportes de inversión no son gasto de consumo.
      } else {
        totalG += v;
        const cat = g.categoria || 'Otros';
        const med = g.medioPago || 'Efectivo';
        catMap[cat] = (catMap[cat] || 0) + v;
        medMap[med] = (medMap[med] || 0) + v;
      }
    });

    state.resumen.totalGastos = totalG;
    state.resumen.totalIngresos = totalI;
    state.resumen.balance = totalI - totalG;
    state.resumen.porCategoria = Object.entries(catMap).map(([categoria, valor]) => ({ categoria, valor }));
    state.resumen.porMedio = Object.entries(medMap).map(([medio, valor]) => ({ medio, valor }));
  }

  // =========================================================================
  // Navigation & Tab Switching
  // =========================================================================

  function switchTab(targetId) {
    state.activeTab = targetId;

    // Actualizar vistas
    document.querySelectorAll('.tab-view').forEach(view => {
      view.classList.toggle('active', view.id === targetId);
    });

    // Actualizar botones de navegación
    els.tabItems.forEach(item => {
      const isActive = item.dataset.target === targetId;
      item.classList.toggle('active', isActive);
      if (isActive) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });

    // Actualizar título de cabecera
    const titles = {
      'tab-inicio': 'Mis Finanzas',
      'tab-movimientos': 'Movimientos',
      'tab-agregar': state.formData.tipo === 'Ingreso' ? 'Nuevo Ingreso' : (state.formData.tipo === 'Inversión' ? 'Nueva Inversión' : (state.formData.tipo === 'Pago Deuda' ? 'Pago De Deuda' : 'Nuevo Gasto')),
      'tab-patrimonio': 'Patrimonio',
      'tab-graficas': 'Análisis'
    };
    els.headerTitle.textContent = titles[targetId] || 'Mis Finanzas';

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (targetId === 'tab-patrimonio') {
      renderPatrimonioView();
    } else if (targetId === 'tab-graficas') {
      renderAnalyticsView();
    }
  }

  function switchPatrimonioSubview(subviewId) {
    state.activePatrimonioSubview = subviewId;
    els.patNavBtns.forEach(b => b.classList.toggle('active', b.dataset.subview === subviewId));
    if (subviewId === 'subview-inversiones') {
      els.subviewInversiones.classList.add('active');
      els.subviewDeudas.classList.remove('active');
    } else {
      els.subviewInversiones.classList.remove('active');
      els.subviewDeudas.classList.add('active');
    }
  }

  // =========================================================================
  // Renderers
  // =========================================================================

  function renderAll() {
    renderHomeView();
    renderFeedView();
    renderPatrimonioView();
    renderAnalyticsView();
    renderPlannerPreviewCard();
    renderMonthlyBudget();
  }

  function renderHomeView() {
    const pat = calculatePatrimonioTotals();

    if (state.resumen.mesActual) {
      els.headerDate.textContent = state.resumen.mesActual;
    }
    els.homeBalance.textContent = formatCOP(state.resumen.balance);
    els.homeGastos.textContent = formatCOP(state.resumen.totalGastos);
    els.homeIngresos.textContent = formatCOP(state.resumen.totalIngresos);
    els.donutCenterVal.textContent = formatCOP(state.resumen.totalGastos);
    els.chartTotalCount.textContent = `${state.gastos.length} mov.`;

    // Net Worth & Snapshots
    els.homeNetWorthVal.textContent = formatCOP(pat.netWorth);
    els.snapInvVal.textContent = formatCOP(pat.totalInvMarket);
    els.snapInvReturn.textContent = `${pat.invYieldPct >= 0 ? '+' : ''}${pat.invYieldPct}%`;
    els.snapInvSub.textContent = `${state.inversiones.length} activos`;

    els.snapDebtVal.textContent = formatCOP(pat.totalDebt);
    els.snapDebtCount.textContent = `${state.deudas.length} activas`;
    els.snapDebtSub.textContent = `Cuota mes: ${formatCOP(pat.totalDebtMonthly)}`;

    // Render Donut SVG
    renderDonutChart(els.donutSvg, state.resumen.porCategoria, 170, 24, CATEGORY_META);

    // Render Legend
    els.homeChartLegend.innerHTML = '';
    const topCategories = [...state.resumen.porCategoria].sort((a, b) => b.valor - a.valor).slice(0, 4);
    topCategories.forEach((item, idx) => {
      const color = (CATEGORY_META[item.categoria] && CATEGORY_META[item.categoria].color) || PALETTE[idx % PALETTE.length];
      const div = document.createElement('div');
      div.className = 'legend-chip';
      div.innerHTML = `<span class="legend-color-dot" style="background-color: ${color}"></span><span>${item.categoria} (${formatCOP(item.valor)})</span>`;
      els.homeChartLegend.appendChild(div);
    });

    // Recent 5 Transactions
    els.homeRecentList.innerHTML = '';
    const recent = state.gastos.slice(0, 5);
    if (!recent.length) {
      els.homeRecentList.innerHTML = '<div class="list-placeholder">No hay movimientos registrados.</div>';
      return;
    }

    recent.forEach(tx => {
      els.homeRecentList.appendChild(createTransactionRow(tx));
    });
  }

  function createTransactionRow(tx) {
    const isIncome = tx.tipo === 'Ingreso';
    const isInv = tx.tipo === 'Inversión';
    const isDebt = tx.tipo === 'Pago Deuda';

    let amountColor = 'var(--text-primary)';
    let prefix = '-';
    let icon = '🍔';
    let categoryTitle = tx.categoria || 'Gasto';
    let methodOrAccount = tx.medioPago || 'Efectivo';

    if (isIncome) {
      amountColor = 'var(--ios-green)';
      prefix = '+';
      icon = '💰';
      categoryTitle = 'Ingreso';
      methodOrAccount = tx.cuenta ? `Destino: ${tx.cuenta}` : 'Cuenta principal';
    } else if (isInv) {
      amountColor = 'var(--ios-blue)';
      prefix = '↗';
      icon = '📈';
      categoryTitle = 'Aporte Inversión';
      methodOrAccount = tx.cuenta ? `Activo: ${tx.cuenta}` : 'Portafolio';
    } else if (isDebt) {
      amountColor = 'var(--ios-purple)';
      prefix = '↘';
      icon = '💳';
      categoryTitle = 'Pago de Deuda';
      methodOrAccount = tx.cuenta ? `Abono: ${tx.cuenta}` : 'Crédito';
    } else {
      icon = (CATEGORY_META[tx.categoria] && CATEGORY_META[tx.categoria].icon) || '📦';
    }

    const row = document.createElement('div');
    row.className = 'tx-row';
    row.innerHTML = `
      <div class="tx-icon" aria-hidden="true">${icon}</div>
      <div class="tx-details">
        <span class="tx-concept">${escapeHtml(tx.concepto)}</span>
        <span class="tx-meta">${escapeHtml(categoryTitle)} • ${escapeHtml(methodOrAccount)}</span>
      </div>
      <div class="tx-amount" style="color: ${amountColor}">
        ${prefix}${formatCOP(tx.valor)}
      </div>
    `;

    row.addEventListener('click', () => {
      triggerHaptic();
      openDetailModal(tx);
    });

    return row;
  }

  function renderFeedView() {
    els.feedContainer.innerHTML = '';
    let filtered = [...state.gastos];

    // Filter by Type or Category
    if (state.filterCategory && state.filterCategory !== 'all') {
      if (state.filterCategory.startsWith('type:')) {
        const type = state.filterCategory.replace('type:', '');
        filtered = filtered.filter(tx => type === 'Gasto'
          ? tx.tipo === 'Gasto' || tx.tipo === 'Pago Deuda' || !tx.tipo
          : tx.tipo === type);
      } else {
        filtered = filtered.filter(tx => tx.categoria === state.filterCategory);
      }
    }

    // Search Query Filter
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      filtered = filtered.filter(tx =>
        (tx.concepto && tx.concepto.toLowerCase().includes(q)) ||
        (tx.categoria && tx.categoria.toLowerCase().includes(q)) ||
        (tx.nota && tx.nota.toLowerCase().includes(q)) ||
        (tx.medioPago && tx.medioPago.toLowerCase().includes(q)) ||
        (tx.cuenta && tx.cuenta.toLowerCase().includes(q))
      );
    }

    if (!filtered.length) {
      els.feedContainer.innerHTML = '<div class="list-placeholder">No se encontraron movimientos.</div>';
      return;
    }

    // Group by Date
    const grouped = {};
    filtered.forEach(tx => {
      const dateKey = tx.fecha || 'Sin fecha';
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(tx);
    });

    Object.keys(grouped).sort((a, b) => b.localeCompare(a)).forEach(dateStr => {
      const groupEl = document.createElement('div');
      groupEl.className = 'feed-group';

      const header = document.createElement('div');
      header.className = 'feed-group-header';
      header.textContent = formatDateLabel(dateStr);
      groupEl.appendChild(header);

      const itemsCard = document.createElement('div');
      itemsCard.className = 'ios-card feed-card';
      grouped[dateStr].forEach(tx => {
        itemsCard.appendChild(createTransactionRow(tx));
      });
      groupEl.appendChild(itemsCard);

      els.feedContainer.appendChild(groupEl);
    });
  }

  function formatDateLabel(dateStr) {
    if (!dateStr || dateStr === 'Sin fecha') return 'Sin fecha';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return new Intl.DateTimeFormat('es-CO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      }).format(date);
    } catch (e) {
      return dateStr;
    }
  }

  // =========================================================================
  // MÓDULO DE PATRIMONIO (INVERSIONES & DEUDAS)
  // =========================================================================

  function renderPatrimonioView() {
    const pat = calculatePatrimonioTotals();

    // Badges en el switcher
    els.badgeTotalInv.textContent = formatCOP(pat.totalInvMarket);
    els.badgeTotalDebt.textContent = formatCOP(pat.totalDebt);

    renderInversionesSub(pat);
    renderDeudasSub(pat);
  }

  function renderInversionesSub(pat) {
    els.invTotalMarket.textContent = formatCOP(pat.totalInvMarket);
    els.invTotalPrincipal.textContent = formatCOP(pat.totalInvPrincipal);
    els.invTotalProfit.textContent = `${pat.totalInvProfit >= 0 ? '+' : ''}${formatCOP(pat.totalInvProfit)}`;
    els.invHeroYield.textContent = `${pat.invYieldPct >= 0 ? '+' : ''}${pat.invYieldPct}% E.A.`;
    els.invAssetCount.textContent = `${state.inversiones.length} activos`;

    // Asset Allocation Breakdown
    const assetMap = {};
    state.inversiones.forEach(inv => {
      const tipo = inv.tipo || 'Otros';
      assetMap[tipo] = (assetMap[tipo] || 0) + (Number(inv.valorActual) || 0);
    });

    const assetData = Object.entries(assetMap).map(([categoria, valor]) => ({ categoria, valor }));
    renderDonutChart(els.invDonutSvg, assetData, 170, 24, ASSET_CLASS_META);

    // Legend
    els.invChartLegend.innerHTML = '';
    assetData.forEach((item, idx) => {
      const color = (ASSET_CLASS_META[item.categoria] && ASSET_CLASS_META[item.categoria].color) || PALETTE[idx % PALETTE.length];
      const pct = pat.totalInvMarket > 0 ? Math.round((item.valor / pat.totalInvMarket) * 100) : 0;
      const div = document.createElement('div');
      div.className = 'legend-chip';
      div.innerHTML = `<span class="legend-color-dot" style="background-color: ${color}"></span><span>${item.categoria} (${pct}% • ${formatCOP(item.valor)})</span>`;
      els.invChartLegend.appendChild(div);
    });

    // Holdings list
    els.investmentsContainer.innerHTML = '';
    if (!state.inversiones.length) {
      els.investmentsContainer.innerHTML = `
        <div class="patrimonio-empty-state">
          <div class="empty-state-icon">📈</div>
          <div class="empty-state-title">Sin inversiones registradas</div>
          <div class="empty-state-desc">Lleva el control de tus cuentas remuneradas, CDTs, acciones o fondos.</div>
          <button type="button" class="btn-empty-action" id="btn-empty-add-inv">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            <span>Registrar inversión</span>
          </button>
        </div>
      `;
      document.getElementById('btn-empty-add-inv')?.addEventListener('click', () => {
        triggerHaptic();
        openInvModal();
      });
      return;
    }

    state.inversiones.forEach(inv => {
      const profit = (Number(inv.valorActual) || 0) - (Number(inv.montoInvertido) || 0);
      const profitPct = inv.montoInvertido > 0 ? ((profit / inv.montoInvertido) * 100).toFixed(1) : 0;
      const icon = (ASSET_CLASS_META[inv.tipo] && ASSET_CLASS_META[inv.tipo].icon) || '📈';

      const row = document.createElement('div');
      row.className = 'investment-item';
      row.style.cursor = 'pointer';
      row.innerHTML = `
        <div class="item-info">
          <div class="item-title">${icon} ${escapeHtml(inv.nombre)}</div>
          <div class="item-subtitle">
            <span>${escapeHtml(inv.institucion || 'Propio')}</span>
            ${inv.tasaEA ? `• <span>${inv.tasaEA}% E.A.</span>` : ''}
            ${inv.fechaVencimiento ? `• <span class="tag-badge">Vence: ${inv.fechaVencimiento}</span>` : ''}
          </div>
        </div>
        <div class="item-amount-col">
          <div class="item-main-val">${formatCOP(inv.valorActual)}</div>
          <div class="item-delta ${profit >= 0 ? 'text-green' : 'text-danger'}">
            ${profit >= 0 ? '+' : ''}${formatCOP(profit)} (${profitPct}%)
          </div>
          <div class="item-actions-row">
            <button type="button" class="item-action-edit" data-edit-inv="${inv.id}">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <span>Editar</span>
            </button>
            <button type="button" class="item-action-link" data-inv-id="${inv.id}">Saldo</button>
          </div>
        </div>
      `;

      row.querySelector('.item-action-link').addEventListener('click', (e) => {
        e.stopPropagation();
        triggerHaptic();
        openValUpdateModal(inv);
      });

      row.querySelector('.item-action-edit').addEventListener('click', (e) => {
        e.stopPropagation();
        triggerHaptic();
        openInvModal(inv);
      });

      row.addEventListener('click', () => {
        triggerHaptic();
        openInvModal(inv);
      });

      els.investmentsContainer.appendChild(row);
    });
  }

  function renderDeudasSub(pat) {
    els.debtTotalAmount.textContent = formatCOP(pat.totalDebt);
    els.debtTotalMonthly.textContent = formatCOP(pat.totalDebtMonthly);
    els.debtUtilizationVal.textContent = `${pat.debtUtilization}%`;
    els.debtHeroDtiBadge.textContent = `DTI: ${pat.dtiRatio}%`;
    els.debtHeroDtiBadge.style.background = pat.dtiRatio > 40 ? 'rgba(255,59,48,0.2)' : 'rgba(52,199,89,0.2)';
    els.debtHeroDtiBadge.style.color = pat.dtiRatio > 40 ? 'var(--ios-red)' : 'var(--ios-green)';

    // Run Debt Simulator
    runDebtSimulator();

    // Debts List
    els.debtsContainer.innerHTML = '';
    if (!state.deudas.length) {
      els.debtsContainer.innerHTML = `
        <div class="patrimonio-empty-state">
          <div class="empty-state-icon">🎉</div>
          <div class="empty-state-title">¡Estás libre de deudas!</div>
          <div class="empty-state-desc">No tienes compromisos pendientes o aún no has registrado tus créditos o tarjetas.</div>
          <button type="button" class="btn-empty-action" id="btn-empty-add-debt">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            <span>Registrar deuda</span>
          </button>
        </div>
      `;
      document.getElementById('btn-empty-add-debt')?.addEventListener('click', () => {
        triggerHaptic();
        openDebtModal();
      });
      return;
    }

    state.deudas.forEach(debt => {
      const limit = Number(debt.cupoTotal) || Number(debt.saldoPendiente) || 1;
      const util = Math.min(100, Math.round((Number(debt.saldoPendiente) / limit) * 100));
      let utilClass = '';
      if (util > 75) utilClass = 'danger';
      else if (util > 40) utilClass = 'warning';

      const row = document.createElement('div');
      row.className = 'debt-item';
      row.style.cursor = 'pointer';
      row.innerHTML = `
        <div class="item-info">
          <div class="item-title">💳 ${escapeHtml(debt.nombre)}</div>
          <div class="item-subtitle">
            <span>${escapeHtml(debt.entidad || 'Entidad')}</span>
            ${debt.tasaEA ? `• <span>${debt.tasaEA}% E.A.</span>` : ''}
            ${debt.diaPago ? `• <span>Pago día ${debt.diaPago}</span>` : ''}
          </div>
          <div class="credit-util-bar">
            <div class="credit-util-fill ${utilClass}" style="width: ${util}%;"></div>
          </div>
        </div>
        <div class="item-amount-col">
          <div class="item-main-val" style="color: #FF5E5E;">${formatCOP(debt.saldoPendiente)}</div>
          <div class="item-delta">Cuota: ${formatCOP(debt.cuotaMensual)}</div>
          <div class="item-actions-row">
            <button type="button" class="item-action-pay" data-pay-debt="${debt.id}" aria-label="Abonar a ${escapeHtml(debt.nombre)}">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>
              <span>Abonar</span>
            </button>
            <button type="button" class="item-action-edit" data-edit-debt="${debt.id}">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <span>Editar</span>
            </button>
            <span style="font-size: 0.68rem; color: var(--text-secondary);">${util}% cupo</span>
          </div>
        </div>
      `;

      row.querySelector('.item-action-pay').addEventListener('click', (e) => {
        e.stopPropagation();
        triggerHaptic();
        startDebtPayment(debt);
      });

      row.querySelector('.item-action-edit').addEventListener('click', (e) => {
        e.stopPropagation();
        triggerHaptic();
        openDebtModal(debt);
      });

      row.addEventListener('click', () => {
        triggerHaptic();
        openDebtModal(debt);
      });

      els.debtsContainer.appendChild(row);
    });
  }

  function startDebtPayment(debt) {
    const balance = Number(debt.saldoPendiente) || 0;
    if (balance <= 0) {
      showToast('Esta deuda ya no tiene saldo pendiente');
      return;
    }

    updateMovementForm('Pago Deuda');
    state.formData.debtId = debt.id;
    state.formData.cuenta = debt.nombre;
    els.formConcept.value = debt.nombre;
    const suggestedAmount = Math.min(Number(debt.cuotaMensual) || 0, balance);
    els.formAmount.value = suggestedAmount > 0 ? suggestedAmount.toLocaleString('es-CO') : '';
    els.formNote.value = `Abono a ${debt.nombre}`;
    switchTab('tab-agregar');
    setTimeout(() => {
      els.formAmount.focus();
      els.formAmount.select();
    }, 150);
  }

  // =========================================================================
  // Simulador de Desendeudamiento (Bola de Nieve vs Avalancha)
  // =========================================================================

  function runDebtSimulator() {
    if (!state.deudas.length) {
      els.simMonthsFree.textContent = '0 meses';
      els.simDateFree.textContent = 'Sin deudas';
      els.simInterestSaved.textContent = '$0';
      els.simTimeSaved.textContent = '0 meses antes';
      return;
    }

    const extra = state.simulator.extraMonthly;
    const strategy = state.simulator.strategy; // 'avalanche' | 'snowball'
    els.simExtraVal.textContent = `${formatCOP(extra)} COP`;

    // Simulación A: Con el abono extra aplicando la estrategia elegida
    const simWithExtra = simulatePayoff([...state.deudas], extra, strategy);
    // Simulación B: Sin abono extra (solo cuotas mínimas)
    const simBase = simulatePayoff([...state.deudas], 0, strategy);

    els.simMonthsFree.textContent = `${simWithExtra.months} meses`;

    // Fecha proyectada de libertad
    const freeDate = new Date();
    freeDate.setMonth(freeDate.getMonth() + simWithExtra.months);
    els.simDateFree.textContent = `Fecha proyectada: ${freeDate.toLocaleString('es-CO', { month: 'short', year: 'numeric' })}`;

    const interestSaved = Math.max(0, simBase.totalInterest - simWithExtra.totalInterest);
    const monthsSaved = Math.max(0, simBase.months - simWithExtra.months);

    els.simInterestSaved.textContent = formatCOP(interestSaved);
    els.simTimeSaved.textContent = `${monthsSaved} meses antes`;
  }

  function simulatePayoff(debtsList, extraPayment, strategy) {
    // Clonar saldos
    let debts = debtsList.map(d => ({
      saldo: Number(d.saldoPendiente) || 0,
      cuota: Number(d.cuotaMensual) || 50000,
      tasaEA: Number(d.tasaEA) || 20.0
    })).filter(d => d.saldo > 0);

    let months = 0;
    let totalInterest = 0;
    const maxMonths = 360; // Límite de seguridad 30 años

    while (debts.some(d => d.saldo > 0) && months < maxMonths) {
      months++;
      let extraAvailable = extraPayment;

      // 1. Cobro de intereses mensuales y cuotas mínimas
      debts.forEach(d => {
        if (d.saldo <= 0) return;
        // Tasa mensual equivalente: (1 + EA)^(1/12) - 1
        const rMonth = Math.pow(1 + (d.tasaEA / 100), 1 / 12) - 1;
        const interest = d.saldo * rMonth;
        totalInterest += interest;
        d.saldo += interest;

        // Pagar cuota mínima
        const payMin = Math.min(d.saldo, d.cuota);
        d.saldo -= payMin;
      });

      // 2. Ordenar para inyectar el dinero extra según la estrategia
      if (strategy === 'avalanche') {
        debts.sort((a, b) => b.tasaEA - a.tasaEA); // Mayor tasa primero
      } else {
        debts.sort((a, b) => a.saldo - b.saldo); // Menor saldo primero (Bola de nieve)
      }

      // Aplicar abono extra a la deuda prioritaria
      for (const d of debts) {
        if (d.saldo > 0 && extraAvailable > 0) {
          const abono = Math.min(d.saldo, extraAvailable);
          d.saldo -= abono;
          extraAvailable -= abono;
        }
      }
    }

    return { months, totalInterest };
  }

  // =========================================================================
  // =========================================================================
  // Analytics 2.0: Comprehensive Financial Intelligence Center
  // =========================================================================

  function renderAnalyticsView() {
    const period = state.analyticsPeriod || 'month';
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let filteredGastos = [...state.gastos];

    if (period === 'month') {
      const yearMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
      const monthTxs = state.gastos.filter(tx => tx.fecha && tx.fecha.startsWith(yearMonthStr));
      if (monthTxs.length > 0) {
        filteredGastos = monthTxs;
      } else if (state.gastos.length > 0) {
        const latestTx = state.gastos.find(tx => tx.fecha);
        if (latestTx && latestTx.fecha) {
          const ym = latestTx.fecha.substring(0, 7);
          filteredGastos = state.gastos.filter(tx => tx.fecha && tx.fecha.startsWith(ym));
        }
      }
    } else if (period === 'quarter') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      const cutoffStr = cutoff.toISOString().substring(0, 10);
      filteredGastos = state.gastos.filter(tx => tx.fecha && tx.fecha >= cutoffStr);
      if (!filteredGastos.length && state.gastos.length) filteredGastos = [...state.gastos];
    } else if (period === 'year') {
      const yearStr = `${currentYear}`;
      filteredGastos = state.gastos.filter(tx => tx.fecha && tx.fecha.startsWith(yearStr));
      if (!filteredGastos.length && state.gastos.length) filteredGastos = [...state.gastos];
    }

    let periodGastos = 0;
    let periodIngresos = 0;
    const catMap = {};
    const medMap = {};
    const dailyMap = {};
    const dayOfWeekMap = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const dayNames = ['Domingos', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábados'];

    filteredGastos.forEach(tx => {
      const val = Number(tx.valor) || 0;
      if (tx.tipo === 'Ingreso') {
        periodIngresos += val;
      } else if (tx.tipo === 'Inversión') {
        // Aportes de inversión no computan como gasto de consumo corriente.
      } else {
        periodGastos += val;
        const cat = tx.categoria || 'Otros';
        const med = tx.medioPago || 'Efectivo';
        catMap[cat] = (catMap[cat] || 0) + val;
        medMap[med] = (medMap[med] || 0) + val;

        if (tx.fecha) {
          dailyMap[tx.fecha] = (dailyMap[tx.fecha] || 0) + val;
          try {
            const [y, m, d] = tx.fecha.split('-').map(Number);
            const dt = new Date(y, m - 1, d);
            const dow = dt.getDay();
            dayOfWeekMap[dow] = (dayOfWeekMap[dow] || 0) + val;
          } catch (_) {}
        }
      }
    });

    const periodBalance = periodIngresos - periodGastos;
    const savingsRate = periodIngresos > 0 ? Math.round(((periodIngresos - periodGastos) / periodIngresos) * 100) : 0;
    const distinctDaysCount = Math.max(1, Object.keys(dailyMap).length);
    const dailyAvg = Math.round(periodGastos / distinctDaysCount);

    let peakDayIdx = 5;
    let peakDayVal = -1;
    for (let i = 0; i < 7; i++) {
      if (dayOfWeekMap[i] > peakDayVal) {
        peakDayVal = dayOfWeekMap[i];
        peakDayIdx = i;
      }
    }

    // Render KPIs
    if (els.kpiSavingsRate) {
      els.kpiSavingsRate.textContent = `${savingsRate}%`;
      els.kpiSavingsRate.style.color = savingsRate >= 20 ? 'var(--ios-green)' : (savingsRate >= 0 ? 'var(--ios-blue)' : 'var(--ios-red)');
    }
    if (els.kpiSavingsBadge) {
      if (periodIngresos === 0) {
        els.kpiSavingsBadge.textContent = 'Sin ingresos reg.';
        els.kpiSavingsBadge.style.background = 'rgba(142,142,147,0.15)';
        els.kpiSavingsBadge.style.color = 'var(--text-secondary)';
      } else if (savingsRate >= 25) {
        els.kpiSavingsBadge.textContent = 'Excelente ⭐';
        els.kpiSavingsBadge.style.background = 'rgba(52,199,89,0.2)';
        els.kpiSavingsBadge.style.color = 'var(--ios-green)';
      } else if (savingsRate >= 10) {
        els.kpiSavingsBadge.textContent = 'Saludable ✓';
        els.kpiSavingsBadge.style.background = 'rgba(0,122,255,0.2)';
        els.kpiSavingsBadge.style.color = 'var(--ios-blue)';
      } else if (savingsRate >= 0) {
        els.kpiSavingsBadge.textContent = 'Ajustada ⚠️';
        els.kpiSavingsBadge.style.background = 'rgba(255,149,0,0.2)';
        els.kpiSavingsBadge.style.color = 'var(--ios-orange)';
      } else {
        els.kpiSavingsBadge.textContent = 'Déficit 🚨';
        els.kpiSavingsBadge.style.background = 'rgba(255,59,48,0.2)';
        els.kpiSavingsBadge.style.color = 'var(--ios-red)';
      }
    }

    if (els.kpiDailyAvg) els.kpiDailyAvg.textContent = formatCOP(dailyAvg);
    if (els.kpiDailySub) els.kpiDailySub.textContent = `En ${distinctDaysCount} días con registro`;

    if (els.kpiPeakDay) els.kpiPeakDay.textContent = peakDayVal > 0 ? dayNames[peakDayIdx] : '-';
    if (els.kpiPeakDayAmount) els.kpiPeakDayAmount.textContent = peakDayVal > 0 ? `${formatCOP(peakDayVal)} acumulado` : 'Sin registros';

    if (els.kpiPeriodBalance) {
      els.kpiPeriodBalance.textContent = `${periodBalance >= 0 ? '+' : ''}${formatCOP(periodBalance)}`;
      els.kpiPeriodBalance.style.color = periodBalance >= 0 ? 'var(--ios-green)' : 'var(--ios-red)';
    }
    if (els.kpiPeriodBalanceSub) {
      els.kpiPeriodBalanceSub.textContent = `+${formatCOP(periodIngresos)} / -${formatCOP(periodGastos)}`;
    }

    renderTimelineChart(dailyMap, dailyAvg);

    const periodCatData = Object.entries(catMap).map(([categoria, valor]) => ({ categoria, valor }));
    renderInteractiveDonut(periodCatData, periodGastos);
    renderPaymentBreakdown(medMap);
    renderPatrimonialStructure();
    renderTopExpenses(filteredGastos);
  }

  function renderTimelineChart(dailyMap, avgExpense) {
    if (!els.timelineBarsContainer) return;
    els.timelineBarsContainer.innerHTML = '';

    const dates = Object.keys(dailyMap).sort();
    if (!dates.length) {
      els.timelineBarsContainer.innerHTML = '<div class="list-placeholder" style="width: 100%; text-align: center;">No hay gastos registrados en este período.</div>';
      if (els.timelineAvgBadge) els.timelineAvgBadge.textContent = 'Prom: $0/d';
      return;
    }

    if (els.timelineAvgBadge) els.timelineAvgBadge.textContent = `Prom: ${formatCOP(avgExpense)}/d`;

    const maxVal = Math.max(...Object.values(dailyMap), 1);

    dates.forEach(dtStr => {
      const val = dailyMap[dtStr];
      const heightPct = Math.max(8, Math.min(100, Math.round((val / maxVal) * 100)));
      const dayNum = dtStr.split('-')[2] || dtStr;

      const col = document.createElement('div');
      col.className = 'timeline-bar-col';
      col.innerHTML = `
        <div class="timeline-bar-tooltip">${dayNum}: ${formatCOP(val)}</div>
        <div class="timeline-bar-fill" style="height: ${heightPct}%;"></div>
        <span class="timeline-bar-lbl">${dayNum}</span>
      `;

      col.addEventListener('click', () => {
        triggerHaptic();
        col.parentElement.querySelectorAll('.timeline-bar-col').forEach(c => c.classList.remove('selected'));
        col.classList.add('selected');
        showToast(`${dtStr}: ${formatCOP(val)}`);
      });

      els.timelineBarsContainer.appendChild(col);
    });

    setTimeout(() => {
      els.timelineBarsContainer.scrollLeft = els.timelineBarsContainer.scrollWidth;
    }, 50);
  }

  function renderInteractiveDonut(catData, totalGastos) {
    if (!els.analyticsDonut) return;
    renderDonutChart(els.analyticsDonut, catData, 220, 28, CATEGORY_META);

    if (els.donutCenterCategoryLabel) els.donutCenterCategoryLabel.textContent = 'Total Gastos';
    if (els.donutCenterCategoryVal) els.donutCenterCategoryVal.textContent = formatCOP(totalGastos);
    if (els.donutCenterCategorySub) els.donutCenterCategorySub.textContent = `${catData.length} categorías`;

    els.analyticsCategories.innerHTML = '';
    const sorted = [...catData].sort((a, b) => b.valor - a.valor);
    const totalG = totalGastos || 1;

    sorted.forEach(cat => {
      const pct = Math.round((cat.valor / totalG) * 100);
      const icon = (CATEGORY_META[cat.categoria] && CATEGORY_META[cat.categoria].icon) || '📦';
      const color = (CATEGORY_META[cat.categoria] && CATEGORY_META[cat.categoria].color) || '#8E8E93';

      const row = document.createElement('div');
      row.className = 'analytics-row';
      row.innerHTML = `
        <div class="row-header">
          <span class="row-cat">${icon} ${escapeHtml(cat.categoria)}</span>
          <span class="row-val">${formatCOP(cat.valor)} (${pct}%)</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${pct}%; background-color: ${color}"></div>
        </div>
      `;

      row.addEventListener('click', () => {
        triggerHaptic();
        if (els.donutCenterCategoryLabel) els.donutCenterCategoryLabel.textContent = cat.categoria;
        if (els.donutCenterCategoryVal) els.donutCenterCategoryVal.textContent = formatCOP(cat.valor);
        if (els.donutCenterCategorySub) els.donutCenterCategorySub.textContent = `${pct}% del total`;
      });

      els.analyticsCategories.appendChild(row);
    });
  }

  function renderPaymentBreakdown(medMap) {
    if (!els.analyticsPayments) return;
    els.analyticsPayments.innerHTML = '';
    const items = Object.entries(medMap).map(([medio, valor]) => ({ medio, valor }));
    const totalMed = items.reduce((acc, m) => acc + m.valor, 0) || 1;

    items.sort((a, b) => b.valor - a.valor).forEach(med => {
      const pct = Math.round((med.valor / totalMed) * 100);
      const row = document.createElement('div');
      row.className = 'analytics-row';
      row.innerHTML = `
        <div class="row-header">
          <span class="row-cat">💳 ${escapeHtml(med.medio)}</span>
          <span class="row-val">${formatCOP(med.valor)} (${pct}%)</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${pct}%; background-color: var(--ios-blue)"></div>
        </div>
      `;
      els.analyticsPayments.appendChild(row);
    });
  }

  function renderPatrimonialStructure() {
    const pat = calculatePatrimonioTotals();
    const assets = pat.totalInvMarket;
    const debt = pat.totalDebt;
    const netWorth = assets - debt;
    const sum = assets + debt;

    if (els.nwTotalAssets) els.nwTotalAssets.textContent = formatCOP(assets);
    if (els.nwTotalLiabilities) els.nwTotalLiabilities.textContent = formatCOP(debt);
    if (els.nwNetWorth) {
      els.nwNetWorth.textContent = `${netWorth >= 0 ? '+' : ''}${formatCOP(netWorth)}`;
      els.nwNetWorth.style.color = netWorth >= 0 ? 'var(--ios-green)' : 'var(--ios-red)';
    }

    if (els.netWorthBadge) {
      if (assets === 0 && debt === 0) {
        els.netWorthBadge.textContent = 'En blanco';
        els.netWorthBadge.style.background = 'rgba(142,142,147,0.15)';
        els.netWorthBadge.style.color = 'var(--text-secondary)';
      } else if (netWorth >= 0) {
        els.netWorthBadge.textContent = 'Solvente ✓';
        els.netWorthBadge.style.background = 'rgba(52,199,89,0.2)';
        els.netWorthBadge.style.color = 'var(--ios-green)';
      } else {
        els.netWorthBadge.textContent = 'Endeudado ⚠️';
        els.netWorthBadge.style.background = 'rgba(255,59,48,0.2)';
        els.netWorthBadge.style.color = 'var(--ios-red)';
      }
    }

    const assetPct = sum > 0 ? Math.round((assets / sum) * 100) : 50;
    const debtPct = sum > 0 ? (100 - assetPct) : 50;

    if (els.nwBarAsset) els.nwBarAsset.style.width = `${assetPct}%`;
    if (els.nwBarDebt) els.nwBarDebt.style.width = `${debtPct}%`;

    if (els.nwRatioText) {
      const leverageRatio = assets > 0 ? Math.round((debt / assets) * 100) : (debt > 0 ? 100 : 0);
      els.nwRatioText.textContent = `Apalancamiento: ${leverageRatio}% (Pasivos / Activos)`;
    }
  }

  function renderTopExpenses(txs) {
    if (!els.analyticsTopExpenses) return;
    els.analyticsTopExpenses.innerHTML = '';

    const expensesOnly = txs.filter(tx => tx.tipo === 'Gasto' || !tx.tipo);
    if (!expensesOnly.length) {
      els.analyticsTopExpenses.innerHTML = '<div class="list-placeholder">No hay gastos en este período.</div>';
      return;
    }

    const top5 = [...expensesOnly].sort((a, b) => Number(b.valor) - Number(a.valor)).slice(0, 5);

    top5.forEach((tx, idx) => {
      const icon = (CATEGORY_META[tx.categoria] && CATEGORY_META[tx.categoria].icon) || '📦';
      const row = document.createElement('div');
      row.className = 'top-expense-row';
      row.innerHTML = `
        <div class="top-expense-left">
          <div class="top-expense-rank">#${idx + 1}</div>
          <div class="top-expense-info">
            <span class="top-expense-concept">${icon} ${escapeHtml(tx.concepto)}</span>
            <span class="top-expense-meta">${escapeHtml(tx.categoria || 'Gasto')} • ${tx.fecha || ''}</span>
          </div>
        </div>
        <div class="top-expense-val">-${formatCOP(tx.valor)}</div>
      `;

      row.addEventListener('click', () => {
        triggerHaptic();
        openDetailModal(tx);
      });

      els.analyticsTopExpenses.appendChild(row);
    });
  }

  function renderDonutChart(svg, data, size, strokeWidth, metaMap = CATEGORY_META) {
    svg.innerHTML = '';
    const total = data.reduce((acc, d) => acc + (d.valor || 0), 0);
    if (!total) {
      svg.innerHTML = `<circle cx="${size/2}" cy="${size/2}" r="${(size - strokeWidth)/2}" fill="none" stroke="var(--bg-tertiary)" stroke-width="${strokeWidth}" />`;
      return;
    }

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    let accumulatedAngle = 0;

    data.forEach((item, idx) => {
      if (!item.valor) return;
      const ratio = item.valor / total;
      const strokeDasharray = `${ratio * circumference} ${circumference}`;
      const strokeDashoffset = -accumulatedAngle * circumference;
      const color = (metaMap[item.categoria] && metaMap[item.categoria].color) || PALETTE[idx % PALETTE.length];

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', size / 2);
      circle.setAttribute('cy', size / 2);
      circle.setAttribute('r', radius);
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', color);
      circle.setAttribute('stroke-width', strokeWidth);
      circle.setAttribute('stroke-dasharray', strokeDasharray);
      circle.setAttribute('stroke-dashoffset', strokeDashoffset);
      circle.style.transition = 'stroke-dasharray 0.6s ease';

      svg.appendChild(circle);
      accumulatedAngle += ratio;
    });
  }

  // =========================================================================
  // Detail Modal
  // =========================================================================

  function openDetailModal(tx) {
    state.selectedMovement = tx;
    const isIncome = tx.tipo === 'Ingreso';
    const isInv = tx.tipo === 'Inversión';
    const isDebt = tx.tipo === 'Pago Deuda';

    els.modalConcept.textContent = tx.concepto;
    els.modalAmount.textContent = `${isIncome ? '+' : '-'}${formatCOP(tx.valor)} ${tx.moneda || 'COP'}`;
    els.modalAmount.style.color = isIncome ? 'var(--ios-green)' : (isInv ? 'var(--ios-blue)' : (isDebt ? 'var(--ios-purple)' : 'var(--text-primary)'));
    els.modalDatetime.textContent = `${tx.fecha || '-'} ${tx.hora || ''}`;
    els.modalCategoryLabel.textContent = isIncome ? 'Tipo' : (isInv ? 'Destino' : 'Categoría');
    els.modalCategory.textContent = isIncome
      ? 'Ingreso'
      : (isInv ? 'Inversión' : (isDebt ? 'Pago Deuda' : `${(CATEGORY_META[tx.categoria] && CATEGORY_META[tx.categoria].icon) || ''} ${tx.categoria}`));
    els.modalPaymentLabel.textContent = isIncome ? 'Cuenta destino' : 'Medio de pago';
    els.modalPayment.textContent = tx.cuenta || tx.medioPago || '-';
    els.modalNote.textContent = tx.nota || '(Sin nota)';
    els.modalId.textContent = tx.id || '(Sin ID)';

    els.modalDetail.classList.add('active');
    els.modalDetail.setAttribute('aria-hidden', 'false');
  }

  function closeDetailModal() {
    els.modalDetail.classList.remove('active');
    els.modalDetail.setAttribute('aria-hidden', 'true');
    state.selectedMovement = null;
  }

  async function deleteSelectedMovement() {
    if (!state.selectedMovement) return;
    const item = state.selectedMovement;
    const confirmDelete = confirm(`¿Deseas eliminar el registro "${item.concepto}" por ${formatCOP(item.valor)}?`);
    if (!confirmDelete) return;

    triggerHaptic();
    closeDetailModal();
    showToast('Eliminando movimiento...');

    // Optimistic delete
    state.gastos = state.gastos.filter(g => g.id !== item.id);
    if (item.tipo === 'Pago Deuda') {
      const linkedDebt = state.deudas.find(d => d.nombre === item.cuenta)
        || state.deudas.find(d => item.concepto.toLowerCase().includes(d.nombre.toLowerCase()));
      if (linkedDebt) {
        linkedDebt.saldoPendiente = (Number(linkedDebt.saldoPendiente) || 0) + (Number(item.valor) || 0);
        linkedDebt.estado = 'Activa';
        apiRequest({ action: 'saveDeuda', ...linkedDebt }).catch(e => console.warn('Error actualizando deuda en backend:', e));
      }
    }
    recalculateLocalResumen();
    saveLocalCache();
    renderAll();

    try {
      const res = await apiRequest({ action: 'delete', id: item.id });
      if (res.ok) {
        showToast('Movimiento eliminado con éxito ✓');
      } else {
        showToast(`Aviso: ${res.error || 'No se pudo eliminar en el servidor'}`);
      }
    } catch (e) {
      console.warn('Error al eliminar en backend:', e);
      showToast('Eliminado en local (sin conexión)');
    }
  }

  // =========================================================================
  // Modales Inversión, Deuda & Actualización de Saldo
  // =========================================================================

  function openInvModal(inv = null) {
    if (inv) {
      state.editingInvId = inv.id;
      if (els.modalInvTitle) els.modalInvTitle.textContent = 'Editar Inversión';
      if (els.btnSaveInvText) els.btnSaveInvText.textContent = 'Guardar cambios';
      if (els.btnDeleteInv) els.btnDeleteInv.style.display = 'flex';

      document.getElementById('inv-nombre').value = inv.nombre || '';
      document.getElementById('inv-tipo').value = inv.tipo || 'Renta Fija';
      document.getElementById('inv-institucion').value = inv.institucion || '';
      document.getElementById('inv-monto').value = parseInt(inv.montoInvertido, 10).toLocaleString('es-CO');
      document.getElementById('inv-valor-actual').value = parseInt(inv.valorActual, 10).toLocaleString('es-CO');
      document.getElementById('inv-tasa').value = inv.tasaEA !== null && inv.tasaEA !== undefined ? inv.tasaEA : '';
      document.getElementById('inv-vencimiento').value = inv.fechaVencimiento || '';
    } else {
      state.editingInvId = null;
      if (els.modalInvTitle) els.modalInvTitle.textContent = 'Nueva Inversión';
      if (els.btnSaveInvText) els.btnSaveInvText.textContent = 'Guardar inversión';
      if (els.btnDeleteInv) els.btnDeleteInv.style.display = 'none';
      els.formInversion.reset();
    }
    els.modalInversion.classList.add('active');
    setTimeout(() => document.getElementById('inv-nombre').focus(), 150);
  }

  function closeInvModal() {
    els.modalInversion.classList.remove('active');
    state.editingInvId = null;
    els.formInversion.reset();
  }

  function openDebtModal(debt = null) {
    if (debt) {
      state.editingDebtId = debt.id;
      if (els.modalDebtTitle) els.modalDebtTitle.textContent = 'Editar Deuda / Crédito';
      if (els.btnSaveDebtText) els.btnSaveDebtText.textContent = 'Guardar cambios';
      if (els.btnDeleteDebt) els.btnDeleteDebt.style.display = 'flex';

      document.getElementById('debt-nombre').value = debt.nombre || '';
      document.getElementById('debt-tipo').value = debt.tipo || 'Tarjeta';
      document.getElementById('debt-entidad').value = debt.entidad || '';
      document.getElementById('debt-saldo').value = parseInt(debt.saldoPendiente, 10).toLocaleString('es-CO');
      document.getElementById('debt-cupo').value = debt.cupoTotal ? parseInt(debt.cupoTotal, 10).toLocaleString('es-CO') : '';
      document.getElementById('debt-tasa').value = debt.tasaEA !== null && debt.tasaEA !== undefined ? debt.tasaEA : '';
      document.getElementById('debt-cuota').value = debt.cuotaMensual ? parseInt(debt.cuotaMensual, 10).toLocaleString('es-CO') : '';
      document.getElementById('debt-dia-corte').value = debt.diaCorte || '';
      document.getElementById('debt-dia-pago').value = debt.diaPago || '';
    } else {
      state.editingDebtId = null;
      if (els.modalDebtTitle) els.modalDebtTitle.textContent = 'Nueva Deuda / Crédito';
      if (els.btnSaveDebtText) els.btnSaveDebtText.textContent = 'Guardar deuda';
      if (els.btnDeleteDebt) els.btnDeleteDebt.style.display = 'none';
      els.formDeuda.reset();
    }
    els.modalDeuda.classList.add('active');
    setTimeout(() => document.getElementById('debt-nombre').focus(), 150);
  }

  function closeDebtModal() {
    els.modalDeuda.classList.remove('active');
    state.editingDebtId = null;
    els.formDeuda.reset();
  }

  async function deleteCurrentEditingInv() {
    if (!state.editingInvId) return;
    if (!confirm('¿Seguro que deseas eliminar esta inversión?')) return;
    triggerHaptic();
    const targetId = state.editingInvId;
    state.inversiones = state.inversiones.filter(i => i.id !== targetId);
    saveLocalCache();
    renderAll();
    closeInvModal();
    showToast('Inversión eliminada ✓');

    try {
      await apiRequest({ action: 'deleteInversion', id: targetId });
    } catch (e) {
      console.warn('Inversión eliminada en local (se sincronizará al conectar):', e);
    }
  }

  async function deleteCurrentEditingDebt() {
    if (!state.editingDebtId) return;
    if (!confirm('¿Seguro que deseas eliminar esta deuda?')) return;
    triggerHaptic();
    const targetId = state.editingDebtId;
    state.deudas = state.deudas.filter(d => d.id !== targetId);
    saveLocalCache();
    renderAll();
    closeDebtModal();
    showToast('Deuda eliminada ✓');

    try {
      await apiRequest({ action: 'deleteDeuda', id: targetId });
    } catch (e) {
      console.warn('Deuda eliminada en local (se sincronizará al conectar):', e);
    }
  }

  function openValUpdateModal(inv) {
    state.selectedInvForVal = inv;
    els.modalValAssetName.textContent = `Actualizar: ${inv.nombre}`;
    els.valNewAmount.value = parseInt(inv.valorActual, 10).toLocaleString('es-CO');
    els.modalValUpdate.classList.add('active');
    setTimeout(() => els.valNewAmount.focus(), 150);
  }

  function closeValUpdateModal() {
    els.modalValUpdate.classList.remove('active');
    state.selectedInvForVal = null;
  }

  // =========================================================================
  // Money Allocator & Budget Planner (Borrador vs Comparativa de Fin de Mes)
  // =========================================================================

  function budgetSpent(mes, categoria) {
    return state.gastos.reduce((total, tx) => {
      if (!String(tx.fecha || '').startsWith(mes)) return total;
      if (tx.tipo !== 'Gasto' && tx.tipo !== 'Pago Deuda' && tx.tipo) return total;
      return (tx.categoria || 'Otros') === categoria ? total + (Number(tx.valor) || 0) : total;
    }, 0);
  }

  function budgetRows(mes) {
    return state.presupuestosMensuales.filter(item => item.mes === mes)
      .sort((a, b) => a.categoria.localeCompare(b.categoria, 'es'));
  }

  function budgetLine(item) {
    const gastado = budgetSpent(item.mes, item.categoria);
    const disponible = Number(item.monto) - gastado;
    const row = document.createElement('div');
    row.className = 'monthly-budget-row';
    const title = document.createElement('strong');
    title.textContent = item.categoria;
    const amounts = document.createElement('small');
    amounts.textContent = `Gastado ${formatCOP(gastado)} de ${formatCOP(item.monto)} · ${disponible >= 0 ? 'Quedan' : 'Excedido'} ${formatCOP(Math.abs(disponible))}`;
    const track = document.createElement('div');
    track.className = 'monthly-budget-track';
    const fill = document.createElement('div');
    fill.className = 'monthly-budget-fill';
    fill.style.width = `${Math.min(100, Math.round(gastado / Number(item.monto) * 100))}%`;
    if (disponible < 0) fill.classList.add('over');
    track.appendChild(fill);
    row.append(title, amounts, track);
    return row;
  }

  function renderMonthlyBudget() {
    const mes = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit' }).format(new Date());
    if (!els.monthlyBudgetSummary) return;
    els.monthlyBudgetSummary.replaceChildren();
    const rows = budgetRows(mes);
    if (!rows.length) {
      els.monthlyBudgetSummary.textContent = 'Sin topes este mes. Pulsa Gestionar para crear uno.';
    } else {
      rows.forEach(item => els.monthlyBudgetSummary.appendChild(budgetLine(item)));
    }
    if (els.modalMonthlyBudget && els.modalMonthlyBudget.classList.contains('active')) renderMonthlyBudgetEditor();
  }

  function renderMonthlyBudgetEditor() {
    const mes = state.presupuestoMesSeleccionado;
    els.monthlyBudgetMonth.value = mes;
    els.monthlyBudgetList.replaceChildren();
    const rows = budgetRows(mes);
    if (!rows.length) els.monthlyBudgetList.textContent = 'Todavía no hay topes para este mes.';
    rows.forEach(item => {
      const row = budgetLine(item);
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'card-link-btn';
      edit.textContent = 'Editar';
      edit.addEventListener('click', () => {
        els.monthlyBudgetCategory.value = item.categoria;
        els.monthlyBudgetAmount.value = Number(item.monto).toLocaleString('es-CO');
      });
      row.appendChild(edit);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'card-link-btn';
      remove.textContent = 'Eliminar';
      remove.addEventListener('click', async () => {
        if (!confirm(`¿Eliminar el tope de ${item.categoria} para ${mes}?`)) return;
        remove.disabled = true;
        try {
          const result = await apiRequest({ action: 'deletePresupuestoMensual', mes, categoria: item.categoria });
          if (!result.ok) throw new Error(result.error || 'No se pudo eliminar');
          state.presupuestosMensuales = state.presupuestosMensuales.filter(x => x !== item);
          renderMonthlyBudget();
          showToast('Presupuesto eliminado del Sheet');
        } catch (_) {
          remove.disabled = false;
          showToast('No se eliminó en Sheets');
        }
      });
      row.appendChild(remove);
      els.monthlyBudgetList.appendChild(row);
    });
  }

  function openMonthlyBudget() {
    triggerHaptic();
    els.monthlyBudgetCategory.replaceChildren();
    Object.keys(CATEGORY_META).filter(cat => cat !== 'Inversión').forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      els.monthlyBudgetCategory.appendChild(option);
    });
    els.modalMonthlyBudget.classList.add('active');
    renderMonthlyBudgetEditor();
  }

  async function saveMonthlyBudget() {
    const mes = state.presupuestoMesSeleccionado;
    const categoria = els.monthlyBudgetCategory.value;
    const monto = Number(els.monthlyBudgetAmount.value.replace(/\D/g, ''));
    if (!monto || monto <= 0) return showToast('Ingresa un tope mayor que cero');
    els.btnSaveMonthlyBudget.disabled = true;
    try {
      const result = await apiRequest({ action: 'savePresupuestoMensual', mes, categoria, monto });
      if (!result.ok) throw new Error(result.error || 'No se pudo guardar');
      const existing = state.presupuestosMensuales.find(item => item.mes === mes && item.categoria === categoria);
      if (existing) existing.monto = monto;
      else state.presupuestosMensuales.push({ mes, categoria, monto });
      els.monthlyBudgetAmount.value = '';
      renderMonthlyBudget();
      showToast('Presupuesto guardado en Google Sheets ✓');
    } catch (err) {
      showToast('No se guardó en Sheets. Inténtalo de nuevo.');
    } finally {
      els.btnSaveMonthlyBudget.disabled = false;
    }
  }

  function renderPlannerPreviewCard() {
    if (!els.cardOpenPlanner) return;
    const base = Number(state.presupuesto.montoBase) || 0;
    const sobres = state.presupuesto.sobres || [];
    const assigned = sobres.reduce((acc, s) => acc + (Number(s.valor) || 0), 0);
    const assignedPct = base > 0 ? Math.min(100, Math.round((assigned / base) * 100)) : 0;
    const spent = state.resumen.totalGastos || 0;

    if (els.plannerPreviewTotal) els.plannerPreviewTotal.textContent = formatCOP(base);
    if (els.plannerPreviewAssigned) {
      els.plannerPreviewAssigned.textContent = `${assignedPct}% (${sobres.length} rubros)`;
      els.plannerPreviewAssigned.style.color = assignedPct > 100 ? 'var(--ios-red)' : (assignedPct === 100 ? 'var(--ios-green)' : 'var(--text-primary)');
    }
    if (els.plannerPreviewSpent) els.plannerPreviewSpent.textContent = formatCOP(spent);
    if (els.plannerPreviewProgress) {
      els.plannerPreviewProgress.style.width = `${Math.min(100, assignedPct)}%`;
      els.plannerPreviewProgress.style.background = assignedPct > 100 ? 'var(--ios-red)' : 'linear-gradient(90deg, #007AFF, #5856D6)';
    }
    if (els.plannerStatusBadge) {
      if (base === 0) {
        els.plannerStatusBadge.textContent = 'Sin borrador';
        els.plannerStatusBadge.style.background = 'rgba(142,142,147,0.15)';
        els.plannerStatusBadge.style.color = 'var(--text-secondary)';
      } else if (assignedPct === 100) {
        els.plannerStatusBadge.textContent = '100% Asignado ✓';
        els.plannerStatusBadge.style.background = 'rgba(52,199,89,0.2)';
        els.plannerStatusBadge.style.color = 'var(--ios-green)';
      } else if (assignedPct > 100) {
        els.plannerStatusBadge.textContent = 'Excedido ⚠️';
        els.plannerStatusBadge.style.background = 'rgba(255,59,48,0.2)';
        els.plannerStatusBadge.style.color = 'var(--ios-red)';
      } else {
        els.plannerStatusBadge.textContent = `${100 - assignedPct}% Por asignar`;
        els.plannerStatusBadge.style.background = 'rgba(0,122,255,0.18)';
        els.plannerStatusBadge.style.color = 'var(--ios-blue)';
      }
    }
  }

  function openPlannerModal() {
    if (!els.modalPresupuesto) return;
    triggerHaptic();
    els.modalPresupuesto.classList.add('active');
    renderPlannerDraft();
    renderPlannerComparison();
  }

  function closePlannerModal() {
    if (!els.modalPresupuesto) return;
    els.modalPresupuesto.classList.remove('active');
    renderPlannerPreviewCard();
  }

  function switchPlannerTab(tabId) {
    state.plannerActiveTab = tabId;
    triggerHaptic();
    if (els.plannerTabBtns) {
      els.plannerTabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
    }
    if (els.plannerSubviewDraft) els.plannerSubviewDraft.classList.toggle('active', tabId === 'draft');
    if (els.plannerSubviewCompare) els.plannerSubviewCompare.classList.toggle('active', tabId === 'compare');

    if (tabId === 'compare') {
      renderPlannerComparison();
    } else {
      renderPlannerDraft();
    }
  }

  function renderPlannerDraft() {
    const base = Number(state.presupuesto.montoBase) || 0;
    if (els.plannerBaseAmount) {
      els.plannerBaseAmount.value = base > 0 ? base.toLocaleString('es-CO') : '';
    }

    const sobres = state.presupuesto.sobres || [];
    const assigned = sobres.reduce((acc, s) => acc + (Number(s.valor) || 0), 0);
    const assignedPct = base > 0 ? ((assigned / base) * 100).toFixed(1) : 0;
    const remaining = base - assigned;
    const remainingPct = base > 0 ? ((remaining / base) * 100).toFixed(1) : 100;

    if (els.plannerAllocatedVal) els.plannerAllocatedVal.textContent = `${formatCOP(assigned)} (${assignedPct}%)`;
    if (els.plannerRemainingVal) {
      if (remaining >= 0) {
        els.plannerRemainingVal.textContent = `${formatCOP(remaining)} (${remainingPct}%)`;
        els.plannerRemainingVal.className = 'alloc-val text-green';
        if (els.plannerRemainingLbl) els.plannerRemainingLbl.textContent = 'Por asignar';
      } else {
        els.plannerRemainingVal.textContent = `-${formatCOP(Math.abs(remaining))} (Excedido)`;
        els.plannerRemainingVal.className = 'alloc-val text-danger';
        if (els.plannerRemainingLbl) els.plannerRemainingLbl.textContent = 'Sobreasignado';
      }
    }

    if (els.plannerAllocatedBar) {
      const width = base > 0 ? Math.min(100, Math.round((assigned / base) * 100)) : 0;
      els.plannerAllocatedBar.style.width = `${width}%`;
      els.plannerAllocatedBar.classList.toggle('overflow', remaining < 0);
    }

    if (els.plannerEnvelopesCount) {
      els.plannerEnvelopesCount.textContent = `${sobres.length} ${sobres.length === 1 ? 'rubro' : 'rubros'}`;
    }

    // Render Envelopes List
    if (!els.plannerEnvelopesList) return;
    els.plannerEnvelopesList.innerHTML = '';

    if (!sobres.length) {
      els.plannerEnvelopesList.innerHTML = `
        <div class="list-placeholder" style="padding: 24px 12px; text-align: center;">
          No has agregado rubros aún.<br>
          <span style="font-size: 0.78rem; color: var(--text-tertiary);">Usa las plantillas rápidas de arriba o pulsa 'Agregar rubro'.</span>
        </div>
      `;
      return;
    }

    const categoryKeys = Object.keys(CATEGORY_META);

    sobres.forEach((sobre, idx) => {
      const card = document.createElement('div');
      card.className = 'envelope-card';

      const isMonto = sobre.modo === 'monto';
      const counterpartText = isMonto
        ? `= ${base > 0 ? ((sobre.valor / base) * 100).toFixed(1) : 0}%`
        : `= ${formatCOP(sobre.valor)}`;

      const inputValue = isMonto
        ? (sobre.valor ? parseInt(sobre.valor, 10).toLocaleString('es-CO') : '')
        : (sobre.porcentaje || '');

      let optionsHtml = '';
      categoryKeys.forEach(cat => {
        const selected = (sobre.categoria === cat) ? 'selected' : '';
        const meta = CATEGORY_META[cat];
        optionsHtml += `<option value="${escapeHtml(cat)}" ${selected}>${meta.icon} ${escapeHtml(cat)}</option>`;
      });

      card.innerHTML = `
        <div class="envelope-top-row">
          <select class="envelope-category-select" data-env-idx="${idx}">
            ${optionsHtml}
          </select>
          <button type="button" class="btn-remove-envelope" data-remove-idx="${idx}" title="Eliminar rubro">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6"/></svg>
          </button>
        </div>
        <div class="envelope-controls-row">
          <div class="btn-mode-toggle">
            <button type="button" class="btn-mode-opt ${isMonto ? 'active' : ''}" data-mode="monto" data-env-idx="${idx}">$ COP</button>
            <button type="button" class="btn-mode-opt ${!isMonto ? 'active' : ''}" data-mode="porcentaje" data-env-idx="${idx}">%</button>
          </div>
          <div class="envelope-input-box">
            <input type="text" class="envelope-input" inputmode="numeric" placeholder="${isMonto ? '0' : '0%'}" value="${inputValue}" data-env-idx="${idx}">
          </div>
          <span class="envelope-counterpart-label">${counterpartText}</span>
        </div>
      `;

      // Event Listeners on Envelope Card
      const catSelect = card.querySelector('.envelope-category-select');
      catSelect.addEventListener('change', (e) => {
        sobre.categoria = e.target.value;
      });

      const removeBtn = card.querySelector('.btn-remove-envelope');
      removeBtn.addEventListener('click', () => {
        triggerHaptic();
        state.presupuesto.sobres.splice(idx, 1);
        renderPlannerDraft();
      });

      const modeOpts = card.querySelectorAll('.btn-mode-opt');
      modeOpts.forEach(btn => {
        btn.addEventListener('click', () => {
          triggerHaptic();
          sobre.modo = btn.dataset.mode;
          renderPlannerDraft();
        });
      });

      const input = card.querySelector('.envelope-input');
      input.addEventListener('input', (e) => {
        const raw = e.target.value;
        const currentBase = Number(state.presupuesto.montoBase) || 0;

        if (sobre.modo === 'porcentaje') {
          const num = parseFloat(raw.replace(/[^\d.]/g, '')) || 0;
          sobre.porcentaje = Math.min(100, num);
          sobre.valor = Math.round(currentBase * (sobre.porcentaje / 100));
        } else {
          const digits = raw.replace(/\D/g, '');
          const val = parseInt(digits, 10) || 0;
          e.target.value = val > 0 ? val.toLocaleString('es-CO') : '';
          sobre.valor = val;
          sobre.porcentaje = currentBase > 0 ? parseFloat(((val / currentBase) * 100).toFixed(1)) : 0;
        }

        const cpLbl = card.querySelector('.envelope-counterpart-label');
        if (cpLbl) {
          cpLbl.textContent = sobre.modo === 'porcentaje'
            ? `= ${formatCOP(sobre.valor)}`
            : `= ${currentBase > 0 ? ((sobre.valor / currentBase) * 100).toFixed(1) : 0}%`;
        }

        updateLiveAllocationBanner();
      });

      els.plannerEnvelopesList.appendChild(card);
    });
  }

  function updateLiveAllocationBanner() {
    const base = Number(state.presupuesto.montoBase) || 0;
    const sobres = state.presupuesto.sobres || [];
    const assigned = sobres.reduce((acc, s) => acc + (Number(s.valor) || 0), 0);
    const assignedPct = base > 0 ? ((assigned / base) * 100).toFixed(1) : 0;
    const remaining = base - assigned;
    const remainingPct = base > 0 ? ((remaining / base) * 100).toFixed(1) : 100;

    if (els.plannerAllocatedVal) els.plannerAllocatedVal.textContent = `${formatCOP(assigned)} (${assignedPct}%)`;
    if (els.plannerRemainingVal) {
      if (remaining >= 0) {
        els.plannerRemainingVal.textContent = `${formatCOP(remaining)} (${remainingPct}%)`;
        els.plannerRemainingVal.className = 'alloc-val text-green';
        if (els.plannerRemainingLbl) els.plannerRemainingLbl.textContent = 'Por asignar';
      } else {
        els.plannerRemainingVal.textContent = `-${formatCOP(Math.abs(remaining))} (Excedido)`;
        els.plannerRemainingVal.className = 'alloc-val text-danger';
        if (els.plannerRemainingLbl) els.plannerRemainingLbl.textContent = 'Sobreasignado';
      }
    }

    if (els.plannerAllocatedBar) {
      const width = base > 0 ? Math.min(100, Math.round((assigned / base) * 100)) : 0;
      els.plannerAllocatedBar.style.width = `${width}%`;
      els.plannerAllocatedBar.classList.toggle('overflow', remaining < 0);
    }
  }

  function addEnvelope() {
    triggerHaptic();
    const existingCats = (state.presupuesto.sobres || []).map(s => s.categoria);
    const allCats = Object.keys(CATEGORY_META);
    const candidate = allCats.find(c => !existingCats.includes(c)) || 'Otros';

    if (!state.presupuesto.sobres) state.presupuesto.sobres = [];
    state.presupuesto.sobres.push({
      id: `env-${Date.now()}`,
      categoria: candidate,
      modo: 'monto',
      valor: 0,
      porcentaje: 0
    });
    renderPlannerDraft();
  }

  function applyPreset(presetName) {
    triggerHaptic();
    let base = Number(state.presupuesto.montoBase) || 0;
    if (base <= 0) {
      base = state.resumen.totalIngresos > 0 ? state.resumen.totalIngresos : 2500000;
      state.presupuesto.montoBase = base;
      if (els.plannerBaseAmount) els.plannerBaseAmount.value = base.toLocaleString('es-CO');
    }

    if (presetName === '50-30-20') {
      state.presupuesto.sobres = [
        { id: `env-${Date.now()}-1`, categoria: 'Mercado / compras', modo: 'porcentaje', porcentaje: 50, valor: Math.round(base * 0.5) },
        { id: `env-${Date.now()}-2`, categoria: 'Entretenimiento', modo: 'porcentaje', porcentaje: 30, valor: Math.round(base * 0.3) },
        { id: `env-${Date.now()}-3`, categoria: 'Inversión', modo: 'porcentaje', porcentaje: 20, valor: Math.round(base * 0.2) }
      ];
      showToast('Plantilla 50/30/20 aplicada ✓');
    } else if (presetName === '70-20-10') {
      state.presupuesto.sobres = [
        { id: `env-${Date.now()}-1`, categoria: 'Hogar', modo: 'porcentaje', porcentaje: 70, valor: Math.round(base * 0.7) },
        { id: `env-${Date.now()}-2`, categoria: 'Inversión', modo: 'porcentaje', porcentaje: 20, valor: Math.round(base * 0.2) },
        { id: `env-${Date.now()}-3`, categoria: 'Comida', modo: 'porcentaje', porcentaje: 10, valor: Math.round(base * 0.1) }
      ];
      showToast('Plantilla 70/20/10 aplicada ✓');
    } else if (presetName === 'clear') {
      state.presupuesto.sobres = [];
      showToast('Borrador restablecido');
    }

    saveLocalCache();
    renderPlannerDraft();
    renderPlannerPreviewCard();
  }

  function renderPlannerComparison() {
    const sobres = state.presupuesto.sobres || [];
    const totalBudgeted = sobres.reduce((acc, s) => acc + (Number(s.valor) || 0), 0);

    const now = new Date();
    const curYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let monthGastos = state.gastos.filter(tx => tx.fecha && tx.fecha.startsWith(curYearMonth));
    if (!monthGastos.length && state.gastos.length) {
      monthGastos = [...state.gastos];
    }

    const actualCatSpent = {};
    let totalActualSpent = 0;
    monthGastos.forEach(tx => {
      if (tx.tipo === 'Gasto' || !tx.tipo) {
        const v = Number(tx.valor) || 0;
        const cat = tx.categoria || 'Otros';
        actualCatSpent[cat] = (actualCatSpent[cat] || 0) + v;
        totalActualSpent += v;
      }
    });

    const netDiff = totalBudgeted - totalActualSpent;

    if (els.compareTotalBudgeted) els.compareTotalBudgeted.textContent = formatCOP(totalBudgeted);
    if (els.compareTotalSpent) els.compareTotalSpent.textContent = formatCOP(totalActualSpent);
    if (els.compareNetDiff) {
      els.compareNetDiff.textContent = `${netDiff >= 0 ? '+' : ''}${formatCOP(netDiff)}`;
      els.compareNetDiff.className = `metric-val ${netDiff >= 0 ? 'text-green' : 'text-danger'}`;
    }

    if (els.compareHeroBadge) {
      if (totalBudgeted === 0) {
        els.compareHeroBadge.textContent = 'Sin borrador';
        els.compareHeroBadge.style.background = 'rgba(142,142,147,0.15)';
        els.compareHeroBadge.style.color = 'var(--text-secondary)';
      } else if (netDiff >= 0) {
        els.compareHeroBadge.textContent = 'Dentro del plan ✓';
        els.compareHeroBadge.style.background = 'rgba(52,199,89,0.2)';
        els.compareHeroBadge.style.color = 'var(--ios-green)';
      } else {
        els.compareHeroBadge.textContent = 'Excedido ⚠️';
        els.compareHeroBadge.style.background = 'rgba(255,59,48,0.2)';
        els.compareHeroBadge.style.color = 'var(--ios-red)';
      }
    }

    if (els.compareProgressBar) {
      const execRatio = totalBudgeted > 0 ? Math.min(100, Math.round((totalActualSpent / totalBudgeted) * 100)) : 0;
      els.compareProgressBar.style.width = `${execRatio}%`;
      els.compareProgressBar.style.background = totalActualSpent > totalBudgeted ? 'var(--ios-red)' : 'linear-gradient(90deg, #34C759, #30D158)';
    }

    if (!els.plannerComparisonList) return;
    els.plannerComparisonList.innerHTML = '';

    if (!sobres.length) {
      els.plannerComparisonList.innerHTML = '<div class="list-placeholder">No has configurado rubros en tu borrador.</div>';
    } else {
      sobres.forEach(sobre => {
        const cat = sobre.categoria || 'Otros';
        const planned = Number(sobre.valor) || 0;
        const spent = actualCatSpent[cat] || 0;
        const diff = planned - spent;
        const ratio = planned > 0 ? Math.round((spent / planned) * 100) : 0;
        const meta = CATEGORY_META[cat] || { icon: '📦', color: '#8E8E93' };

        let tagClass = 'green';
        let tagText = `+${formatCOP(diff)} disponible`;
        let barColor = 'var(--ios-green)';

        if (diff < 0) {
          tagClass = 'red';
          tagText = `-${formatCOP(Math.abs(diff))} excedido`;
          barColor = 'var(--ios-red)';
        } else if (ratio >= 85) {
          tagClass = 'yellow';
          tagText = `${formatCOP(diff)} restante (${ratio}%)`;
          barColor = 'var(--ios-orange)';
        }

        const card = document.createElement('div');
        card.className = 'compare-card';
        card.innerHTML = `
          <div class="compare-top-row">
            <div class="compare-cat-title">
              <span>${meta.icon}</span>
              <span>${escapeHtml(cat)}</span>
            </div>
            <span class="compare-diff-tag ${tagClass}">${tagText}</span>
          </div>
          <div class="compare-amounts-row">
            <span>Planeado: <strong>${formatCOP(planned)}</strong></span>
            <span>Gastado: <strong>${formatCOP(spent)}</strong> (${ratio}%)</span>
          </div>
          <div class="compare-bar-track">
            <div class="compare-bar-fill" style="width: ${Math.min(100, ratio)}%; background: ${barColor};"></div>
          </div>
        `;
        els.plannerComparisonList.appendChild(card);
      });
    }

    if (!els.plannerUnbudgetedList) return;
    els.plannerUnbudgetedList.innerHTML = '';

    const budgetedCatNames = sobres.map(s => s.categoria);
    const unbudgetedCats = Object.keys(actualCatSpent).filter(c => !budgetedCatNames.includes(c));

    if (!unbudgetedCats.length) {
      els.plannerUnbudgetedList.innerHTML = '<div class="list-placeholder" style="padding: 12px; font-size: 0.78rem;">¡Excelente! Todos tus gastos del mes estuvieron cubiertos por tu borrador.</div>';
    } else {
      unbudgetedCats.forEach(cat => {
        const spent = actualCatSpent[cat] || 0;
        const meta = CATEGORY_META[cat] || { icon: '📦', color: '#8E8E93' };
        const row = document.createElement('div');
        row.className = 'compare-card';
        row.style.background = 'var(--bg-secondary)';
        row.innerHTML = `
          <div class="compare-top-row">
            <div class="compare-cat-title">
              <span>${meta.icon}</span>
              <span>${escapeHtml(cat)}</span>
            </div>
            <span class="compare-diff-tag red">Sin presupuestar</span>
          </div>
          <div class="compare-amounts-row">
            <span>Gastado fuera de plan: <strong>${formatCOP(spent)}</strong></span>
          </div>
        `;
        els.plannerUnbudgetedList.appendChild(row);
      });
    }
  }

  // =========================================================================
  // Formulario Polimórfico (Gasto, Ingreso, Inversión, Pago Deuda)
  // =========================================================================

  function updateMovementForm(type) {
    state.formData.tipo = type;
    if (type !== 'Pago Deuda') state.formData.debtId = null;
    els.typeSegments.forEach(button => button.classList.toggle('active', button.dataset.type === type));

    const isExpense = type === 'Gasto';
    const isIncome = type === 'Ingreso';
    const isInv = type === 'Inversión';
    const isDebt = type === 'Pago Deuda';

    els.expenseConceptChips.hidden = !isExpense;
    els.incomeSourceChips.hidden = !isIncome;
    els.investmentConceptChips.hidden = !isInv;
    els.debtConceptChips.hidden = !isDebt;

    els.expenseCategoryBlock.hidden = !isExpense;
    els.expensePaymentBlock.hidden = !isExpense && !isDebt;
    els.incomeAccountBlock.hidden = !isIncome && !isInv;

    if (isIncome) {
      els.formConceptLabel.textContent = 'Origen del ingreso';
      els.formConcept.placeholder = 'Ej. Nómina, honorarios o venta';
      els.btnSubmitText.textContent = 'Guardar ingreso';
      state.formData.categoria = 'Otros';
    } else if (isInv) {
      els.formConceptLabel.textContent = 'Activo o instrumento destino';
      els.formConcept.placeholder = 'Ej. Aporte CDT, compra ETF, cajita';
      els.btnSubmitText.textContent = 'Guardar aporte';
      state.formData.categoria = 'Inversión';
    } else if (isDebt) {
      els.formConceptLabel.textContent = 'Deuda o tarjeta a abonar';
      els.formConcept.placeholder = 'Ej. Pago Tarjeta Nu, cuota crédito';
      els.btnSubmitText.textContent = 'Guardar abono a deuda';
      state.formData.categoria = 'Pago Deuda';
    } else {
      els.formConceptLabel.textContent = 'Comercio / concepto';
      els.formConcept.placeholder = '¿En qué gastaste? (Ej. Terpel)';
      els.btnSubmitText.textContent = 'Guardar gasto';
    }

    if (state.activeTab === 'tab-agregar') {
      const titleMap = {
        'Gasto': 'Nuevo Gasto',
        'Ingreso': 'Nuevo Ingreso',
        'Inversión': 'Aporte a Inversión',
        'Pago Deuda': 'Abono a Deuda'
      };
      els.headerTitle.textContent = titleMap[type] || 'Nuevo Registro';
    }
  }

  async function handleSaveExpense() {
    const rawVal = els.formAmount.value.replace(/\D/g, '');
    const amount = parseInt(rawVal, 10);
    const concept = els.formConcept.value.trim();

    if (!amount || amount <= 0) {
      showToast('Ingresa un valor mayor a cero');
      els.formAmount.focus();
      return;
    }

    if (!concept) {
      showToast('Ingresa el concepto del movimiento');
      els.formConcept.focus();
      return;
    }

    const selectedDebt = state.formData.tipo === 'Pago Deuda'
      ? state.deudas.find(d => d.id === state.formData.debtId)
        || state.deudas.find(d => concept.toLowerCase().includes(d.nombre.toLowerCase()))
      : null;

    if (state.formData.tipo === 'Pago Deuda' && !selectedDebt) {
      showToast('Selecciona una deuda registrada para aplicar el abono');
      return;
    }

    if (selectedDebt && amount > Number(selectedDebt.saldoPendiente || 0)) {
      showToast(`El abono supera el saldo de ${formatCOP(selectedDebt.saldoPendiente)}`);
      return;
    }

    triggerHaptic();

    const newTx = {
      id: crypto.randomUUID ? crypto.randomUUID() : `mob-${Date.now()}`,
      fecha: new Date().toISOString().substring(0, 10),
      hora: new Date().toTimeString().substring(0, 5),
      valor: amount,
      concepto: concept,
      categoria: state.formData.categoria || 'Otros',
      medioPago: state.formData.medioPago || 'Débito',
      cuenta: selectedDebt ? selectedDebt.nombre : (state.formData.cuenta || 'Otra'),
      nota: els.formNote.value.trim(),
      tipo: state.formData.tipo,
      moneda: 'COP',
      debtId: selectedDebt ? selectedDebt.id : null
    };

    // Optimistic addition
    state.gastos.unshift(newTx);

    // Si es aporte a inversión o abono a deuda, impactar la entidad correspondiente
    if (state.formData.tipo === 'Inversión') {
      const matchInv = state.inversiones.find(i => concept.toLowerCase().includes(i.nombre.toLowerCase()));
      if (matchInv) {
        matchInv.valorActual = (Number(matchInv.valorActual) || 0) + amount;
        matchInv.montoInvertido = (Number(matchInv.montoInvertido) || 0) + amount;
      }
    } else if (state.formData.tipo === 'Pago Deuda') {
      if (selectedDebt) {
        selectedDebt.saldoPendiente = Math.max(0, (Number(selectedDebt.saldoPendiente) || 0) - amount);
      }
    }

    recalculateLocalResumen();
    saveLocalCache();
    renderAll();

    // Reset Form
    els.formAmount.value = '';
    els.formConcept.value = '';
    els.formNote.value = '';
    state.formData.debtId = null;
    showToast('Movimiento registrado con éxito ✓');
    switchTab('tab-inicio');

    // Send to Google Apps Script
    try {
      await apiRequest(newTx);
      syncData(false);
    } catch (e) {
      console.warn('Guardado local (se sincronizará al conectar):', e);
    }
  }

  // =========================================================================
  // Event Listeners
  // =========================================================================

  function attachEvents() {
    // Auth Gate
    els.authForm.addEventListener('submit', async event => {
      event.preventDefault();
      const pin = els.authPin.value.replace(/\D/g, '');
      if (pin.length !== 8) {
        els.authError.textContent = 'Ingresa los 8 dígitos.';
        return;
      }

      const button = els.authForm.querySelector('button[type="submit"]');
      button.disabled = true;
      button.textContent = 'Verificando…';
      els.authError.textContent = '';
      state.accessPin = pin;
      const connected = await syncData(false);
      if (connected) {
        localStorage.setItem('finanzas_access_pin', pin);
        els.authPin.value = '';
        els.authGate.classList.add('is-hidden');
      }
      button.disabled = false;
      button.textContent = 'Desbloquear';
    });

    // Sync Button
    els.btnSync.addEventListener('click', () => {
      triggerHaptic();
      syncData(true);
    });

    // Privacy Toggle Button
    els.btnTogglePrivacy.addEventListener('click', () => {
      triggerHaptic();
      togglePrivacyMode();
    });

    // Snapshots clickables en Home
    els.cardSnapshotInv.addEventListener('click', () => {
      triggerHaptic();
      switchTab('tab-patrimonio');
      switchPatrimonioSubview('subview-inversiones');
    });

    els.cardSnapshotDebt.addEventListener('click', () => {
      triggerHaptic();
      switchTab('tab-patrimonio');
      switchPatrimonioSubview('subview-deudas');
    });

    // Quick Add Button
    els.btnQuickAdd.addEventListener('click', () => {
      triggerHaptic();
      updateMovementForm('Gasto');
      switchTab('tab-agregar');
      els.formAmount.focus();
    });

    els.btnSeeAll.addEventListener('click', () => {
      triggerHaptic();
      switchTab('tab-movimientos');
    });

    // Navigation Tabs
    els.tabItems.forEach(item => {
      item.addEventListener('click', () => {
        triggerHaptic();
        switchTab(item.dataset.target);
      });
    });

    // Patrimonio Subview Switcher
    els.patNavBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        triggerHaptic();
        switchPatrimonioSubview(btn.dataset.subview);
      });
    });

    // Search Input
    els.searchInput.addEventListener('input', e => {
      state.searchQuery = e.target.value;
      els.btnClearSearch.hidden = !state.searchQuery;
      renderFeedView();
    });

    els.btnClearSearch.addEventListener('click', () => {
      els.searchInput.value = '';
      state.searchQuery = '';
      els.btnClearSearch.hidden = true;
      renderFeedView();
    });

    // Filter Chips
    els.filterChips.querySelectorAll('.chip-item').forEach(chip => {
      chip.addEventListener('click', () => {
        triggerHaptic();
        els.filterChips.querySelectorAll('.chip-item').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.filterCategory = chip.dataset.filter;
        renderFeedView();
      });
    });

    // Form: Amount Formatting
    els.formAmount.addEventListener('input', e => {
      const digits = e.target.value.replace(/\D/g, '');
      if (!digits) {
        e.target.value = '';
        return;
      }
      e.target.value = parseInt(digits, 10).toLocaleString('es-CO');
    });

    // Form: Quick Amount Increments
    els.quickAmtBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        triggerHaptic();
        const add = parseInt(btn.dataset.add, 10);
        const current = parseInt(els.formAmount.value.replace(/\D/g, ''), 10) || 0;
        const total = current + add;
        els.formAmount.value = total.toLocaleString('es-CO');
      });
    });

    // Form: Frequent Merchant & Concept Chips
    els.merchantChips.forEach(chip => {
      chip.addEventListener('click', () => {
        triggerHaptic();
        els.formConcept.value = chip.dataset.concept;
        const cat = chip.dataset.cat;
        if (cat) {
          state.formData.categoria = cat;
          els.catPills.forEach(p => p.classList.toggle('active', p.dataset.cat === cat));
        }
      });
    });

    // Form: Movement Type Segments
    els.typeSegments.forEach(btn => {
      btn.addEventListener('click', () => {
        triggerHaptic();
        updateMovementForm(btn.dataset.type);
      });
    });

    // Form: Chips de Atajos
    els.incomeSourceButtons.forEach(chip => {
      chip.addEventListener('click', () => {
        triggerHaptic();
        els.formConcept.value = chip.dataset.concept;
      });
    });

    document.querySelectorAll('.inv-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        triggerHaptic();
        els.formConcept.value = chip.dataset.concept;
      });
    });

    document.querySelectorAll('.debt-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        triggerHaptic();
        els.formConcept.value = chip.dataset.concept;
      });
    });

    // Form: Destination Account for Income
    els.accountPills.forEach(pill => {
      pill.addEventListener('click', () => {
        triggerHaptic();
        els.accountPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.formData.cuenta = pill.dataset.account;
      });
    });

    // Form: Category Selection
    els.catPills.forEach(pill => {
      pill.addEventListener('click', () => {
        triggerHaptic();
        els.catPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.formData.categoria = pill.dataset.cat;
      });
    });

    // Form: Payment Method Selection
    els.payPills.forEach(pill => {
      pill.addEventListener('click', () => {
        triggerHaptic();
        els.payPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.formData.medioPago = pill.dataset.method;
      });
    });

    // Form: Submit Movement
    els.btnSubmitExpense.addEventListener('click', handleSaveExpense);

    // Simulator: Strategy Buttons
    els.strategyBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        triggerHaptic();
        els.strategyBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.simulator.strategy = btn.dataset.strategy;
        runDebtSimulator();
      });
    });

    // Simulator: Slider Abono Extra
    els.simExtraSlider.addEventListener('input', e => {
      state.simulator.extraMonthly = parseInt(e.target.value, 10);
      runDebtSimulator();
    });

    // Modals: Open Add Inv & Debt
    els.btnOpenAddInv.addEventListener('click', () => {
      triggerHaptic();
      openInvModal();
    });
    els.btnCloseModalInv.addEventListener('click', closeInvModal);
    if (els.btnDeleteInv) els.btnDeleteInv.addEventListener('click', deleteCurrentEditingInv);

    els.btnOpenAddDebt.addEventListener('click', () => {
      triggerHaptic();
      openDebtModal();
    });
    els.btnCloseModalDebt.addEventListener('click', closeDebtModal);
    if (els.btnDeleteDebt) els.btnDeleteDebt.addEventListener('click', deleteCurrentEditingDebt);

    // Period selector in Analytics
    if (els.analyticsPeriodControl) {
      els.analyticsPeriodControl.addEventListener('click', (e) => {
        const btn = e.target.closest('.period-btn');
        if (!btn) return;
        triggerHaptic();
        els.analyticsPeriodControl.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.analyticsPeriod = btn.dataset.period || 'month';
        renderAnalyticsView();
      });
    }

    // Save Investment Form (Create or Edit)
    els.formInversion.addEventListener('submit', async e => {
      e.preventDefault();
      const nombre = document.getElementById('inv-nombre').value.trim();
      const tipo = document.getElementById('inv-tipo').value;
      const institucion = document.getElementById('inv-institucion').value.trim();
      const monto = parseInt(document.getElementById('inv-monto').value.replace(/\D/g, ''), 10) || 0;
      const valorActual = parseInt(document.getElementById('inv-valor-actual').value.replace(/\D/g, ''), 10) || monto;
      const tasa = parseFloat(document.getElementById('inv-tasa').value) || null;
      const vencimiento = document.getElementById('inv-vencimiento').value;

      if (!nombre || monto <= 0) {
        showToast('Ingresa un nombre y capital válido');
        return;
      }

      let invRecord = null;
      if (state.editingInvId) {
        const idx = state.inversiones.findIndex(i => i.id === state.editingInvId);
        if (idx !== -1) {
          state.inversiones[idx] = {
            ...state.inversiones[idx],
            nombre,
            tipo,
            institucion,
            montoInvertido: monto,
            valorActual,
            tasaEA: tasa,
            fechaVencimiento: vencimiento
          };
          invRecord = state.inversiones[idx];
        }
        showToast('Inversión actualizada ✓');
      } else {
        const newInv = {
          id: `inv-${Date.now()}`,
          nombre,
          tipo,
          institucion,
          montoInvertido: monto,
          valorActual,
          tasaEA: tasa,
          fechaVencimiento: vencimiento,
          moneda: 'COP'
        };
        state.inversiones.unshift(newInv);
        invRecord = newInv;
        showToast('Inversión agregada con éxito ✓');
      }

      saveLocalCache();
      renderAll();
      closeInvModal();

      if (invRecord) {
        try {
          await apiRequest({ action: 'saveInversion', ...invRecord });
        } catch (err) {
          console.warn('Inversión guardada en local (se sincronizará al conectar):', err);
        }
      }
    });

    // Save Debt Form (Create or Edit)
    els.formDeuda.addEventListener('submit', async e => {
      e.preventDefault();
      const nombre = document.getElementById('debt-nombre').value.trim();
      const tipo = document.getElementById('debt-tipo').value;
      const entidad = document.getElementById('debt-entidad').value.trim();
      const saldo = parseInt(document.getElementById('debt-saldo').value.replace(/\D/g, ''), 10) || 0;
      const cupo = parseInt(document.getElementById('debt-cupo').value.replace(/\D/g, ''), 10) || saldo;
      const tasa = parseFloat(document.getElementById('debt-tasa').value) || 20;
      const cuota = parseInt(document.getElementById('debt-cuota').value.replace(/\D/g, ''), 10) || Math.round(saldo * 0.05);
      const diaCorte = parseInt(document.getElementById('debt-dia-corte').value, 10) || 15;
      const diaPago = parseInt(document.getElementById('debt-dia-pago').value, 10) || 25;

      if (!nombre || saldo <= 0) {
        showToast('Ingresa un nombre y saldo válido');
        return;
      }

      let debtRecord = null;
      if (state.editingDebtId) {
        const idx = state.deudas.findIndex(d => d.id === state.editingDebtId);
        if (idx !== -1) {
          state.deudas[idx] = {
            ...state.deudas[idx],
            nombre,
            tipo,
            entidad,
            saldoPendiente: saldo,
            cupoTotal: cupo,
            tasaEA: tasa,
            cuotaMensual: cuota,
            diaCorte,
            diaPago,
            estado: saldo <= 0 ? 'Pagada' : 'Activa'
          };
          debtRecord = state.deudas[idx];
        }
        showToast('Deuda actualizada ✓');
      } else {
        const newDebt = {
          id: `deb-${Date.now()}`,
          nombre,
          tipo,
          entidad,
          saldoPendiente: saldo,
          cupoTotal: cupo,
          tasaEA: tasa,
          cuotaMensual: cuota,
          diaCorte,
          diaPago,
          estado: saldo <= 0 ? 'Pagada' : 'Activa'
        };
        state.deudas.unshift(newDebt);
        debtRecord = newDebt;
        showToast('Deuda agregada con éxito ✓');
      }

      saveLocalCache();
      renderAll();
      closeDebtModal();

      if (debtRecord) {
        try {
          await apiRequest({ action: 'saveDeuda', ...debtRecord });
        } catch (err) {
          console.warn('Deuda guardada en local (se sincronizará al conectar):', err);
        }
      }
    });

    // Micro-Modal: Actualizar Saldo Inversión
    els.valNewAmount.addEventListener('input', e => {
      const digits = e.target.value.replace(/\D/g, '');
      if (!digits) {
        e.target.value = '';
        return;
      }
      e.target.value = parseInt(digits, 10).toLocaleString('es-CO');
    });

    els.btnSaveValUpdate.addEventListener('click', async () => {
      if (!state.selectedInvForVal) return;
      const digits = els.valNewAmount.value.replace(/\D/g, '');
      const newVal = parseInt(digits, 10);
      if (!newVal || newVal < 0) {
        showToast('Ingresa un valor válido');
        return;
      }
      state.selectedInvForVal.valorActual = newVal;
      const invToUpdate = { ...state.selectedInvForVal };
      saveLocalCache();
      renderAll();
      closeValUpdateModal();
      showToast('Valoración actualizada ✓');

      try {
        await apiRequest({ action: 'saveInversion', ...invToUpdate });
      } catch (err) {
        console.warn('Valoración guardada en local (se sincronizará al conectar):', err);
      }
    });
    els.btnCloseModalVal.addEventListener('click', closeValUpdateModal);

    // Movement Detail Modal
    els.btnCloseModal.addEventListener('click', closeDetailModal);
    els.modalDetail.addEventListener('click', e => {
      if (e.target === els.modalDetail) closeDetailModal();
    });
    els.btnModalDelete.addEventListener('click', deleteSelectedMovement);

    // Money Allocator & Budget Planner Events
    if (els.btnOpenMonthlyBudget) els.btnOpenMonthlyBudget.addEventListener('click', openMonthlyBudget);
    if (els.btnCloseMonthlyBudget) els.btnCloseMonthlyBudget.addEventListener('click', () => els.modalMonthlyBudget.classList.remove('active'));
    if (els.modalMonthlyBudget) els.modalMonthlyBudget.addEventListener('click', e => {
      if (e.target === els.modalMonthlyBudget) els.modalMonthlyBudget.classList.remove('active');
    });
    if (els.monthlyBudgetMonth) els.monthlyBudgetMonth.addEventListener('change', e => {
      if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)) {
        state.presupuestoMesSeleccionado = e.target.value;
        renderMonthlyBudgetEditor();
      }
    });
    if (els.monthlyBudgetAmount) els.monthlyBudgetAmount.addEventListener('input', e => {
      const value = Number(e.target.value.replace(/\D/g, ''));
      e.target.value = value ? value.toLocaleString('es-CO') : '';
    });
    if (els.btnSaveMonthlyBudget) els.btnSaveMonthlyBudget.addEventListener('click', saveMonthlyBudget);
    if (els.cardOpenPlanner) {
      els.cardOpenPlanner.addEventListener('click', openPlannerModal);
    }
    if (els.btnCloseModalPlanner) {
      els.btnCloseModalPlanner.addEventListener('click', closePlannerModal);
    }
    if (els.modalPresupuesto) {
      els.modalPresupuesto.addEventListener('click', e => {
        if (e.target === els.modalPresupuesto) closePlannerModal();
      });
    }

    if (els.plannerTabBtns) {
      els.plannerTabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchPlannerTab(btn.dataset.tab));
      });
    }

    if (els.btnUseMonthlyIncome) {
      els.btnUseMonthlyIncome.addEventListener('click', () => {
        triggerHaptic();
        const inc = state.resumen.totalIngresos || 0;
        if (inc > 0) {
          state.presupuesto.montoBase = inc;
          if (els.plannerBaseAmount) els.plannerBaseAmount.value = inc.toLocaleString('es-CO');
          // Update envelopes values if any exist in percentage mode
          (state.presupuesto.sobres || []).forEach(s => {
            if (s.modo === 'porcentaje') {
              s.valor = Math.round(inc * (s.porcentaje / 100));
            } else if (inc > 0) {
              s.porcentaje = parseFloat(((s.valor / inc) * 100).toFixed(1));
            }
          });
          renderPlannerDraft();
          showToast('Ingresos del mes aplicados ✓');
        } else {
          showToast('No hay ingresos registrados en el mes');
        }
      });
    }

    if (els.plannerBaseAmount) {
      els.plannerBaseAmount.addEventListener('input', e => {
        const digits = e.target.value.replace(/\D/g, '');
        const val = parseInt(digits, 10) || 0;
        e.target.value = val > 0 ? val.toLocaleString('es-CO') : '';
        state.presupuesto.montoBase = val;

        (state.presupuesto.sobres || []).forEach(s => {
          if (s.modo === 'porcentaje') {
            s.valor = Math.round(val * (s.porcentaje / 100));
          } else if (val > 0) {
            s.porcentaje = parseFloat(((s.valor / val) * 100).toFixed(1));
          }
        });

        renderPlannerDraft();
      });
    }

    if (els.presetChips) {
      els.presetChips.forEach(chip => {
        chip.addEventListener('click', () => applyPreset(chip.dataset.preset));
      });
    }

    if (els.btnAddEnvelope) {
      els.btnAddEnvelope.addEventListener('click', addEnvelope);
    }

    if (els.btnSavePlannerDraft) {
      els.btnSavePlannerDraft.addEventListener('click', () => {
        triggerHaptic();
        saveLocalCache();
        renderPlannerPreviewCard();
        closePlannerModal();
        showToast('Borrador guardado con éxito ✓');
      });
    }
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  // =========================================================================
  // Initial Boot
  // =========================================================================

  function init() {
    loadLocalCache();
    if (state.privacyMode) {
      document.body.classList.add('privacy-active');
    }
    attachEvents();
    updateMovementForm('Gasto');
    renderAll();
    if (state.accessPin) {
      els.authGate.classList.add('is-hidden');
      syncData(false);
    } else {
      els.authGate.classList.remove('is-hidden');
      setTimeout(() => els.authPin.focus(), 150);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
