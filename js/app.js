/**
 * Gestor de Finanzas Personal — Core Mobile Application
 * Conforme con Apple Human Interface Guidelines (HIG)
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
    'Otros': { icon: '📦', color: '#A2845E' }
  };

  const PALETTE = ['#FF9500', '#34C759', '#FF3B30', '#007AFF', '#5856D6', '#AF52DE', '#30B0C7', '#FF2D55', '#FFCC00', '#A2845E'];

  // Application State
  const state = {
    accessPin: localStorage.getItem('finanzas_access_pin') || '',
    gastos: [],
    resumen: {
      mesActual: 'Septiembre 2026',
      totalGastos: 73800,
      totalIngresos: 0,
      balance: -73800,
      porCategoria: [],
      porMedio: []
    },
    activeTab: 'tab-inicio',
    filterCategory: 'all',
    searchQuery: '',
    selectedMovement: null,
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
    toast: document.getElementById('toast'),

    // Home
    homeBalance: document.getElementById('home-balance'),
    homeGastos: document.getElementById('home-gastos'),
    homeIngresos: document.getElementById('home-ingresos'),
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
    formNote: document.getElementById('form-note'),
    btnSubmitExpense: document.getElementById('btn-submit-expense'),
    typeSegments: document.querySelectorAll('.segment-btn'),
    quickAmtBtns: document.querySelectorAll('.quick-amt-btn'),
    merchantChips: document.querySelectorAll('.merchant-chip'),
    catPills: document.querySelectorAll('.cat-pill'),
    payPills: document.querySelectorAll('.pay-pill'),

    // Analytics
    analyticsDonut: document.getElementById('chart-analytics-donut'),
    analyticsCategories: document.getElementById('analytics-categories-list'),
    analyticsPayments: document.getElementById('analytics-payments-bars'),

    // Modal
    modalDetail: document.getElementById('modal-detail'),
    modalConcept: document.getElementById('modal-concept'),
    modalAmount: document.getElementById('modal-amount'),
    modalDatetime: document.getElementById('modal-datetime'),
    modalCategory: document.getElementById('modal-category'),
    modalPayment: document.getElementById('modal-payment'),
    modalNote: document.getElementById('modal-note'),
    modalId: document.getElementById('modal-id'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnModalDelete: document.getElementById('btn-modal-delete'),

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
          renderAll();
        }
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
      // Si la API remota aún no tiene action=getData desplegado, calcular localmente desde caché
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
      'tab-agregar': 'Nuevo Gasto',
      'tab-graficas': 'Análisis'
    };
    els.headerTitle.textContent = titles[targetId] || 'Mis Finanzas';

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (targetId === 'tab-graficas') {
      renderAnalyticsView();
    }
  }

  // =========================================================================
  // Renderers
  // =========================================================================

  function renderAll() {
    renderHomeView();
    renderFeedView();
    renderAnalyticsView();
  }

  function renderHomeView() {
    if (state.resumen.mesActual) {
      els.headerDate.textContent = state.resumen.mesActual;
    }
    els.homeBalance.textContent = formatCOP(state.resumen.balance);
    els.homeGastos.textContent = formatCOP(state.resumen.totalGastos);
    els.homeIngresos.textContent = formatCOP(state.resumen.totalIngresos);
    els.donutCenterVal.textContent = formatCOP(state.resumen.totalGastos);
    els.chartTotalCount.textContent = `${state.gastos.length} mov.`;

    // Render Donut SVG
    renderDonutChart(els.donutSvg, state.resumen.porCategoria, 170, 24);

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
    const meta = CATEGORY_META[tx.categoria] || { icon: '📦', color: '#8E8E93' };
    const row = document.createElement('div');
    row.className = 'tx-row-item';
    const isExpense = tx.tipo !== 'Ingreso';
    const sign = isExpense ? '-' : '+';
    const amountClass = isExpense ? 'is-expense' : 'is-income';

    row.innerHTML = `
      <div class="tx-left">
        <div class="tx-category-badge" style="background-color: ${meta.color}15">
          ${meta.icon}
        </div>
        <div class="tx-details">
          <span class="tx-concept">${escapeHtml(tx.concepto)}</span>
          <span class="tx-meta">${escapeHtml(tx.categoria)} • ${escapeHtml(tx.medioPago)}</span>
        </div>
      </div>
      <div class="tx-right">
        <span class="tx-amount ${amountClass}">${sign}${formatCOP(tx.valor)}</span>
        <span class="tx-time">${tx.fecha ? tx.fecha.substring(5) : ''} ${tx.hora || ''}</span>
      </div>
    `;

    row.addEventListener('click', () => {
      openDetailModal(tx);
    });

    return row;
  }

  function renderFeedView() {
    els.feedContainer.innerHTML = '';

    let filtered = state.gastos;

    // Filter by Category
    if (state.filterCategory !== 'all') {
      filtered = filtered.filter(g => g.categoria === state.filterCategory);
    }

    // Filter by Search Query
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase();
      filtered = filtered.filter(g =>
        g.concepto.toLowerCase().includes(q) ||
        g.categoria.toLowerCase().includes(q) ||
        g.medioPago.toLowerCase().includes(q) ||
        (g.nota && g.nota.toLowerCase().includes(q))
      );
    }

    if (!filtered.length) {
      els.feedContainer.innerHTML = '<div class="list-placeholder">No se encontraron movimientos.</div>';
      return;
    }

    // Group by Date
    const groups = {};
    filtered.forEach(tx => {
      const dateKey = tx.fecha || 'Sin fecha';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(tx);
    });

    Object.keys(groups).forEach(dateKey => {
      const groupHeader = document.createElement('div');
      groupHeader.className = 'group-date-header';
      groupHeader.textContent = formatGroupDate(dateKey);
      els.feedContainer.appendChild(groupHeader);

      const card = document.createElement('div');
      card.className = 'ios-card';
      const list = document.createElement('div');
      list.className = 'transactions-list';

      groups[dateKey].forEach(tx => {
        list.appendChild(createTransactionRow(tx));
      });

      card.appendChild(list);
      els.feedContainer.appendChild(card);
    });
  }

  function formatGroupDate(dateStr) {
    const today = new Date().toISOString().substring(0, 10);
    if (dateStr === today) return 'Hoy';
    return dateStr;
  }

  function renderAnalyticsView() {
    renderDonutChart(els.analyticsDonut, state.resumen.porCategoria, 220, 28);

    // Breakdown list
    els.analyticsCategories.innerHTML = '';
    const total = state.resumen.totalGastos || 1;
    const sorted = [...state.resumen.porCategoria].sort((a, b) => b.valor - a.valor);

    sorted.forEach((item, idx) => {
      const color = (CATEGORY_META[item.categoria] && CATEGORY_META[item.categoria].color) || PALETTE[idx % PALETTE.length];
      const pct = Math.round((item.valor / total) * 100);
      const row = document.createElement('div');
      row.className = 'breakdown-row';
      row.innerHTML = `
        <div class="breakdown-left">
          <span class="legend-color-dot" style="background-color: ${color}"></span>
          <span style="font-weight: 600;">${item.categoria}</span>
          <span style="color: var(--text-secondary); font-size: 13px;">${pct}%</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="breakdown-bar-bg">
            <div class="breakdown-bar-fill" style="width: ${pct}%; background-color: ${color};"></div>
          </div>
          <span style="font-weight: 700; font-size: 15px;">${formatCOP(item.valor)}</span>
        </div>
      `;
      els.analyticsCategories.appendChild(row);
    });

    // Payment Methods Breakdown
    els.analyticsPayments.innerHTML = '';
    const sortedMedios = [...state.resumen.porMedio].sort((a, b) => b.valor - a.valor);
    sortedMedios.forEach((item, idx) => {
      const pct = Math.round((item.valor / total) * 100);
      const row = document.createElement('div');
      row.className = 'breakdown-row';
      row.innerHTML = `
        <div class="breakdown-left">
          <span style="font-weight: 600;">${item.medio}</span>
          <span style="color: var(--text-secondary); font-size: 13px;">${pct}%</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="breakdown-bar-bg">
            <div class="breakdown-bar-fill" style="width: ${pct}%; background-color: var(--ios-blue);"></div>
          </div>
          <span style="font-weight: 700; font-size: 15px;">${formatCOP(item.valor)}</span>
        </div>
      `;
      els.analyticsPayments.appendChild(row);
    });
  }

  // =========================================================================
  // SVG Donut Chart Engine (Smooth arcs)
  // =========================================================================

  function renderDonutChart(svg, data, size, strokeWidth) {
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
      const color = (CATEGORY_META[item.categoria] && CATEGORY_META[item.categoria].color) || PALETTE[idx % PALETTE.length];

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
    els.modalConcept.textContent = tx.concepto;
    els.modalAmount.textContent = `${tx.tipo === 'Ingreso' ? '+' : '-'}${formatCOP(tx.valor)} ${tx.moneda || 'COP'}`;
    els.modalAmount.style.color = tx.tipo === 'Ingreso' ? 'var(--ios-green)' : 'var(--text-primary)';
    els.modalDatetime.textContent = `${tx.fecha || '-'} ${tx.hora || ''}`;
    els.modalCategory.textContent = `${(CATEGORY_META[tx.categoria] && CATEGORY_META[tx.categoria].icon) || ''} ${tx.categoria}`;
    els.modalPayment.textContent = tx.medioPago || '-';
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
  // Form Submission
  // =========================================================================

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
      showToast('Ingresa el comercio o concepto');
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
      categoria: state.formData.categoria,
      medioPago: state.formData.medioPago,
      cuenta: state.formData.cuenta || 'Otra',
      nota: els.formNote.value.trim(),
      tipo: state.formData.tipo,
      moneda: 'COP'
    };

    // Optimistic addition
    state.gastos.unshift(newTx);
    recalculateLocalResumen();
    saveLocalCache();
    renderAll();

    // Reset Form
    els.formAmount.value = '';
    els.formConcept.value = '';
    els.formNote.value = '';
    showToast('¡Guardado exitosamente! ✓');
    switchTab('tab-inicio');

    // Send to Google Apps Script
    try {
      await apiRequest(newTx);
      // Sincronizar en segundo plano
      syncData(false);
    } catch (e) {
      console.warn('Guardado local (se sincronizará al conectar):', e);
    }
  }

  // =========================================================================
  // Event Listeners
  // =========================================================================

  function attachEvents() {
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

    // Quick Add Button
    els.btnQuickAdd.addEventListener('click', () => {
      triggerHaptic();
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

    // Form: Frequent Merchant Chips
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
        els.typeSegments.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.formData.tipo = btn.dataset.type;
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

    // Form: Submit
    els.btnSubmitExpense.addEventListener('click', handleSaveExpense);

    // Modal
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
    attachEvents();
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
