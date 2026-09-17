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

  // Semillas demo para que Inversiones y Deudas sean inmediatamente funcionales
  const DEFAULT_INVERSIONES = [
    {
      id: 'inv-1',
      nombre: 'CDT Bancolombia',
      tipo: 'Renta Fija',
      institucion: 'Bancolombia',
      montoInvertido: 5000000,
      valorActual: 5430000,
      tasaEA: 11.5,
      fechaVencimiento: '2026-11-20',
      moneda: 'COP'
    },
    {
      id: 'inv-2',
      nombre: 'Nu Cajita Remunerada',
      tipo: 'Ahorro',
      institucion: 'Nu',
      montoInvertido: 2500000,
      valorActual: 2680000,
      tasaEA: 13.0,
      fechaVencimiento: '',
      moneda: 'COP'
    },
    {
      id: 'inv-3',
      nombre: 'S&P 500 Index (VOO)',
      tipo: 'Renta Variable',
      institucion: 'Hapi',
      montoInvertido: 3500000,
      valorActual: 3950000,
      tasaEA: 14.8,
      fechaVencimiento: '',
      moneda: 'COP'
    }
  ];

  const DEFAULT_DEUDAS = [
    {
      id: 'deb-1',
      nombre: 'Tarjeta Nu Mastercard',
      tipo: 'Tarjeta',
      entidad: 'Nu',
      saldoPendiente: 1850000,
      cupoTotal: 6000000,
      tasaEA: 24.8,
      cuotaMensual: 185000,
      diaCorte: 15,
      diaPago: 25,
      estado: 'Activa'
    },
    {
      id: 'deb-2',
      nombre: 'Crédito Libre Inversión',
      tipo: 'Consumo',
      entidad: 'Bancolombia',
      saldoPendiente: 3200000,
      cupoTotal: 4500000,
      tasaEA: 18.2,
      cuotaMensual: 210000,
      diaCorte: 28,
      diaPago: 5,
      estado: 'Activa'
    }
  ];

  // Application State
  const state = {
    accessPin: localStorage.getItem('finanzas_access_pin') || '',
    privacyMode: localStorage.getItem('finanzas_privacy') === 'true',
    gastos: [],
    inversiones: JSON.parse(localStorage.getItem('finanzas_inversiones') || 'null') || DEFAULT_INVERSIONES,
    deudas: JSON.parse(localStorage.getItem('finanzas_deudas') || 'null') || DEFAULT_DEUDAS,
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
      moneda: 'COP'
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

    // Analytics
    analyticsDonut: document.getElementById('chart-analytics-donut'),
    analyticsCategories: document.getElementById('analytics-categories-list'),
    analyticsPayments: document.getElementById('analytics-payments-bars'),

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
    formInversion: document.getElementById('form-inversion'),
    btnCloseModalInv: document.getElementById('btn-close-modal-inv'),

    modalDeuda: document.getElementById('modal-deuda'),
    formDeuda: document.getElementById('form-deuda'),
    btnCloseModalDebt: document.getElementById('btn-close-modal-debt'),

    modalValUpdate: document.getElementById('modal-val-update'),
    modalValAssetName: document.getElementById('modal-val-asset-name'),
    valNewAmount: document.getElementById('val-new-amount'),
    btnSaveValUpdate: document.getElementById('btn-save-val-update'),
    btnCloseModalVal: document.getElementById('btn-close-modal-val'),

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
      if (invLocal) state.inversiones = JSON.parse(invLocal);

      const debLocal = localStorage.getItem('finanzas_deudas');
      if (debLocal) state.deudas = JSON.parse(debLocal);
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
        } else {
          recalculateLocalResumen();
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
      } else if (g.tipo === 'Inversión' || g.tipo === 'Pago Deuda') {
        // Regla de Oro (Codex / GPT-6 Astra): No se computa como gasto de consumo
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
        filtered = filtered.filter(tx => tx.tipo === type);
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
      els.investmentsContainer.innerHTML = '<div class="list-placeholder">No hay inversiones registradas.</div>';
      return;
    }

    state.inversiones.forEach(inv => {
      const profit = (Number(inv.valorActual) || 0) - (Number(inv.montoInvertido) || 0);
      const profitPct = inv.montoInvertido > 0 ? ((profit / inv.montoInvertido) * 100).toFixed(1) : 0;
      const icon = (ASSET_CLASS_META[inv.tipo] && ASSET_CLASS_META[inv.tipo].icon) || '📈';

      const row = document.createElement('div');
      row.className = 'investment-item';
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
          <button class="item-action-link" data-inv-id="${inv.id}">Actualizar saldo</button>
        </div>
      `;

      row.querySelector('.item-action-link').addEventListener('click', (e) => {
        e.stopPropagation();
        triggerHaptic();
        openValUpdateModal(inv);
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
      els.debtsContainer.innerHTML = '<div class="list-placeholder">No hay deudas registradas. ¡Estás libre de deudas!</div>';
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
          <div style="font-size: 0.68rem; color: var(--text-secondary); margin-top: 3px;">Cupo: ${util}% usado</div>
        </div>
      `;
      els.debtsContainer.appendChild(row);
    });
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
  // Analytics
  // =========================================================================

  function renderAnalyticsView() {
    renderDonutChart(els.analyticsDonut, state.resumen.porCategoria, 200, 28, CATEGORY_META);

    els.analyticsCategories.innerHTML = '';
    const sorted = [...state.resumen.porCategoria].sort((a, b) => b.valor - a.valor);
    const totalG = state.resumen.totalGastos || 1;

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
      els.analyticsCategories.appendChild(row);
    });

    els.analyticsPayments.innerHTML = '';
    const totalMed = state.resumen.porMedio.reduce((acc, m) => acc + (m.valor || 0), 0) || 1;
    state.resumen.porMedio.forEach(med => {
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

  function openAddInvModal() {
    els.modalInversion.classList.add('active');
  }

  function closeAddInvModal() {
    els.modalInversion.classList.remove('active');
    els.formInversion.reset();
  }

  function openAddDebtModal() {
    els.modalDeuda.classList.add('active');
  }

  function closeAddDebtModal() {
    els.modalDeuda.classList.remove('active');
    els.formDeuda.reset();
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
  // Formulario Polimórfico (Gasto, Ingreso, Inversión, Pago Deuda)
  // =========================================================================

  function updateMovementForm(type) {
    state.formData.tipo = type;
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

    triggerHaptic();

    const newTx = {
      id: crypto.randomUUID ? crypto.randomUUID() : `mob-${Date.now()}`,
      fecha: new Date().toISOString().substring(0, 10),
      hora: new Date().toTimeString().substring(0, 5),
      valor: amount,
      concepto: concept,
      categoria: state.formData.categoria || 'Otros',
      medioPago: state.formData.medioPago || 'Débito',
      cuenta: state.formData.cuenta || 'Otra',
      nota: els.formNote.value.trim(),
      tipo: state.formData.tipo,
      moneda: 'COP'
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
      const matchDebt = state.deudas.find(d => concept.toLowerCase().includes(d.nombre.toLowerCase()));
      if (matchDebt) {
        matchDebt.saldoPendiente = Math.max(0, (Number(matchDebt.saldoPendiente) || 0) - amount);
      }
    }

    recalculateLocalResumen();
    saveLocalCache();
    renderAll();

    // Reset Form
    els.formAmount.value = '';
    els.formConcept.value = '';
    els.formNote.value = '';
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
      openAddInvModal();
    });
    els.btnCloseModalInv.addEventListener('click', closeAddInvModal);

    els.btnOpenAddDebt.addEventListener('click', () => {
      triggerHaptic();
      openAddDebtModal();
    });
    els.btnCloseModalDebt.addEventListener('click', closeAddDebtModal);

    // Save Investment Form
    els.formInversion.addEventListener('submit', e => {
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
      saveLocalCache();
      renderAll();
      closeAddInvModal();
      showToast('Inversión agregada con éxito ✓');
    });

    // Save Debt Form
    els.formDeuda.addEventListener('submit', e => {
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
        estado: 'Activa'
      };

      state.deudas.unshift(newDebt);
      saveLocalCache();
      renderAll();
      closeAddDebtModal();
      showToast('Deuda agregada con éxito ✓');
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

    els.btnSaveValUpdate.addEventListener('click', () => {
      if (!state.selectedInvForVal) return;
      const digits = els.valNewAmount.value.replace(/\D/g, '');
      const newVal = parseInt(digits, 10);
      if (!newVal || newVal < 0) {
        showToast('Ingresa un valor válido');
        return;
      }
      state.selectedInvForVal.valorActual = newVal;
      saveLocalCache();
      renderAll();
      closeValUpdateModal();
      showToast('Valoración actualizada ✓');
    });
    els.btnCloseModalVal.addEventListener('click', closeValUpdateModal);

    // Movement Detail Modal
    els.btnCloseModal.addEventListener('click', closeDetailModal);
    els.modalDetail.addEventListener('click', e => {
      if (e.target === els.modalDetail) closeDetailModal();
    });
    els.btnModalDelete.addEventListener('click', deleteSelectedMovement);
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
