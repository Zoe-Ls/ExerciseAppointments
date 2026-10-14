function parseRoute() {
  const raw = String(location.hash || '').replace(/^#\/?/, '');
  const path = raw.split('?')[0].trim();
  return path || 'login';
}

function queryParam(name) {
  const raw = String(location.hash || '');
  const idx = raw.indexOf('?');
  if (idx < 0) return '';
  return new URLSearchParams(raw.slice(idx + 1)).get(name) || '';
}

function syncTeamsQuery() {
  const path = String(location.hash || '').replace(/^#\/?/, '').split('?')[0].trim() || 'teams';
  const params = [];
  if (ui.teamDate) params.push('teamDate=' + encodeURIComponent(ui.teamDate));
  if (ui.mineTeams) params.push('mine=1');
  const target = '#/' + path + (params.length ? '?' + params.join('&') : '');
  if (location.hash === target) return;
  try { history.replaceState(null, '', target); } catch (err) { location.hash = target; }
}

const STUDENT_VIEWS = { book: Views.book, teams: Views.teams, forum: Views.forum, me: Views.me };

function renderApp() {
  const app = document.getElementById('app');
  if (!app) return;
  try {
    Store.purgeExpiredBookings();
    Store.purgeExpiredTeams();
    const user = Store.currentUser();
    const path = parseRoute();
    if (!user) {
      if (path !== 'login') { location.hash = '#/login'; return; }
      app.innerHTML = tr(Views.login());
    } else if (user.role === 'admin') {
      if (path !== 'admin') { location.hash = '#/admin'; return; }
      app.innerHTML = tr(Views.admin());
    } else if (path === 'login') {
      location.hash = '#/book';
      return;
    } else if (path === 'admin') {
      toast('仅管理员可访问管理后台', 'error');
      location.hash = '#/book';
      return;
    } else {
      const teamDate = queryParam('teamDate');
      ui.teamDate = /^\d{4}-\d{2}-\d{2}$/.test(teamDate) ? teamDate : '';
      ui.mineTeams = queryParam('mine') === '1';
      if (path === 'me') {
        Store.markNavRead();
        Store.markUnreadRead(ui.meTab);
      }
      if (path === 'teams') Store.markUnreadRead('teamApps');
      app.innerHTML = tr((STUDENT_VIEWS[path] || Views.book)());
    }
    if (user && user.mustChangePassword && (!ui.modal || ui.modal.kind !== 'password')) {
      ui.modal = { kind: 'password', error: '' };
    }
    renderModal();
  } catch (err) {
    app.innerHTML = '<div class="page"><div class="card card-pad"><h3>页面渲染出错</h3>'
      + '<p class="hint">' + esc(err && err.message ? err.message : String(err)) + '</p>'
      + '<p class="hint">可尝试点击下方按钮重置演示数据后重新登录。</p>'
      + '<button class="btn btn-primary" style="margin-top:12px" data-action="reset-demo">重置演示数据</button></div></div>';
  }
}

document.addEventListener('click', function (e) {
  const target = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
  if (!target) return;
  const fn = Actions[target.dataset.action];
  if (!fn) return;
  e.preventDefault();
  fn(target, e);
});

document.addEventListener('change', function (e) {
  const el = e.target;
  if (el && el.dataset && el.dataset.change) handleChange(el, e);
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && ui.modal && ui.modal.kind !== 'password') closeModal();
});

window.addEventListener('hashchange', renderApp);

renderApp();
