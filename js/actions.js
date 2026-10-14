function go(path) {
  const target = '#/' + path;
  if (location.hash === target) renderApp();
  else location.hash = target;
}

function toast(message, tone) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = 'toast' + (tone === 'error' ? ' toast-error' : '');
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => { el.remove(); }, 2800);
}

function closeModal() {
  ui.modal = null;
  renderModal();
}

function setError(id, message) {
  const el = document.getElementById(id);
  if (el) el.textContent = message;
}

function collectMembersText() {
  const el = document.getElementById('booking-members');
  return el ? el.value.trim() : '';
}

function parseMembers(text) {
  return String(text || '').split(/[、,，;；\s]+/).map((x) => x.trim()).filter(Boolean);
}

const Actions = {
  'switch-login-tab': function (el) { ui.loginTab = el.dataset.tab; renderApp(); },

  'fill-demo': function (el) {
    ui.loginTab = el.dataset.tab;
    renderApp();
    const isAdmin = el.dataset.tab === 'admin';
    const a = document.getElementById(isAdmin ? 'login-admin-account' : 'login-student-id');
    const b = document.getElementById(isAdmin ? 'login-admin-pwd' : 'login-student-pwd');
    if (a) a.value = el.dataset.account;
    if (b) b.value = el.dataset.password;
  },

  'login-student': function () {
    const r = Store.loginStudent(val('login-student-id'), val('login-student-pwd'));
    if (!r.ok) { setError('login-error', r.message); return; }
    toast('欢迎回来，' + Store.currentUser().name);
    go('book');
  },

  'login-admin': function () {
    const r = Store.loginAdmin(val('login-admin-account'), val('login-admin-pwd'));
    if (!r.ok) { setError('login-error', r.message); return; }
    if (r.needChangePassword) ui.modal = { kind: 'password', error: '' };
    toast('管理员登录成功，请及时修改初始密码');
    go('admin');
    renderModal();
  },

  register: function () {
    const r = Store.register({ name: val('reg-name'), studentId: val('reg-student-id'), password: val('reg-pwd') });
    if (!r.ok) { setError('login-error', r.message); return; }
    toast('注册成功，请完善个人资料');
    go('me');
  },

  logout: function () {
    Store.logout();
    ui.modal = null;
    toast('已退出登录');
    go('login');
  },

  'pick-venue-type': function (el) { ui.venueTypeId = el.dataset.id; renderApp(); },

  'pick-date': function (el) {
    const bounds = monthBounds();
    if (!el.value) return;
    if (el.value < bounds.min || el.value > bounds.max) {
      toast('只能预约本月内日期', 'error');
      renderApp();
      return;
    }
    ui.date = el.value;
    renderApp();
  },

  'pick-date-quick': function (el) {
    const bounds = monthBounds();
    const target = dateStr(Number(el.dataset.offset));
    if (target < bounds.min || target > bounds.max) { toast('只能预约本月内日期', 'error'); return; }
    ui.date = target;
    renderApp();
  },

  'pick-team-date': function (el) {
    const value = String(el.value || '').trim();
    if (!value) { Actions['clear-team-date'](); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) { renderApp(); return; }
    ui.teamDate = value;
    syncTeamsQuery();
    renderApp();
  },

  'clear-team-date': function () {
    ui.teamDate = '';
    ui.mineTeams = false;
    syncTeamsQuery();
    renderApp();
  },

  'toggle-my-teams': function () {
    ui.mineTeams = !ui.mineTeams;
    syncTeamsQuery();
    renderApp();
  },

  cell: function (el) {
    const typeId = el.dataset.type;
    const no = el.dataset.no;
    const slot = Number(el.dataset.slot);
    const st = Store.slotStatus(typeId, no, ui.date, slot);
    if (st.state === 'mine') { ui.modal = { kind: 'booking-detail', id: st.booking.id }; renderModal(); return; }
    if (st.state !== 'free') return;
    ui.modal = { kind: 'booking', typeId: typeId, no: no, date: ui.date, slot: slot, reason: '', membersText: '', error: '' };
    renderModal();
  },

  'booking-to-team': function () {
    const m = ui.modal;
    ui.modal = {
      kind: 'team-create', typeId: m.typeId, no: m.no, date: m.date, slot: m.slot,
      title: '', need: 0, contact: '', note: '', error: '',
    };
    renderModal();
  },

  'booking-submit': function () {
    const m = ui.modal;
    const r = Store.createBooking({
      venueTypeId: m.typeId, venueNo: m.no, date: m.date, slot: m.slot,
      reason: val('booking-reason'), members: parseMembers(collectMembersText()),
    });
    if (!r.ok) {
      m.reason = val('booking-reason');
      m.membersText = collectMembersText();
      m.error = r.message;
      renderModal();
      return;
    }
    closeModal();
    toast('预约已提交，等待管理员审核');
    renderApp();
  },

  'booking-detail': function (el) { ui.modal = { kind: 'booking-detail', id: el.dataset.id }; renderModal(); },

  'cancel-booking': function (el) {
    const r = Store.cancelBooking(el.dataset.id);
    if (!r.ok) { toast(r.message, 'error'); return; }
    closeModal();
    toast('已取消预约');
    renderApp();
  },

  'open-team-create': function () {
    ui.modal = { kind: 'team-create', typeId: ui.venueTypeId, no: '01', date: ui.date, slot: 15, need: 4, error: '' };
    renderModal();
  },

  'team-create-submit': function () {
    const m = ui.modal;
    if (m.kind === 'team-create') {
      const r = Store.createTeam({
        venueTypeId: val('tc-type'), venueNo: val('tc-no'), date: val('tc-date'), slot: val('tc-slot'),
        need: val('tc-need'), title: val('tc-title'), contact: val('tc-contact'), note: val('tc-note'),
      });
      if (!r.ok) { m.error = r.message; renderModal(); return; }
      closeModal();
      toast('组队消息已发布');
      go('teams');
      return;
    }
    const r = Store.createTeam({
      venueTypeId: m.typeId, venueNo: m.no, date: m.date, slot: m.slot,
      need: val('team-need'), title: val('team-title'), contact: val('team-contact'), note: val('team-note'),
    });
    if (!r.ok) { m.error = r.message; renderModal(); return; }
    closeModal();
    toast('组队消息已发布，可在「组队」页面查看入队申请');
    go('teams');
  },

  'team-apply': function (el) {
    const r = Store.applyTeam(el.dataset.id, '');
    toast(r.message || '入队申请已发送', r.ok ? 'ok' : 'error');
    if (r.ok) renderApp();
  },

  'open-team-manage': function (el) { ui.modal = { kind: 'team-manage', id: el.dataset.id }; renderModal(); },

  'team-leave': function (el) {
    const r = Store.leaveTeam(el.dataset.id);
    if (!r.ok) { toast(r.message, 'error'); return; }
    toast(r.message || '已退出队伍');
    renderApp();
  },

  'open-notice-history': function () { ui.modal = { kind: 'notice-history' }; renderModal(); },

  'team-review': function (el) {
    const r = Store.reviewTeamMember(el.dataset.id, el.dataset.user, el.dataset.approve === '1');
    if (!r.ok) { toast(r.message, 'error'); return; }
    toast(el.dataset.approve === '1' ? '已同意入队申请' : '已拒绝入队申请');
    renderApp();
    renderModal();
  },

  'team-book': function (el) {
    const r = Store.confirmTeamBooking(el.dataset.id);
    toast(r.ok ? (r.message || '已提交预约') : r.message, r.ok ? 'ok' : 'error');
    if (r.ok) { closeModal(); renderApp(); }
  },

  'post-submit': function () {
    const r = Store.createPost(val('post-content'));
    if (!r.ok) { toast(r.message, 'error'); return; }
    toast('发布成功');
    renderApp();
  },

  comment: function (el) {
    const r = Store.addComment(el.dataset.id, val('comment-' + el.dataset.id));
    if (!r.ok) { toast(r.message, 'error'); return; }
    renderApp();
  },

  like: function (el) {
    const r = Store.toggleLike(el.dataset.id);
    if (r.ok) renderApp();
  },

  favorite: function (el) {
    const r = Store.toggleFavorite(el.dataset.id);
    if (r.ok) { toast(r.saved ? '已收藏' : '已取消收藏'); renderApp(); }
  },

  'add-friend': function (el) {
    const r = Store.sendFriendRequest(el.dataset.id);
    toast(r.message || (r.ok ? '好友申请已发送' : '操作失败'), r.ok ? 'ok' : 'error');
  },

  'friend-respond': function (el) {
    const r = Store.respondFriendRequest(el.dataset.id, el.dataset.accept === '1');
    if (!r.ok) { toast(r.message, 'error'); return; }
    toast(el.dataset.accept === '1' ? '已同意好友申请' : '已拒绝好友申请');
    renderApp();
  },

  'report-post': function (el) {
    const author = Store.userById(el.dataset.target);
    ui.modal = { kind: 'report', targetType: 'post', postId: el.dataset.post, commentId: null, targetUserId: el.dataset.target, targetName: author ? author.name : '', error: '' };
    renderModal();
  },

  'report-comment': function (el) {
    const author = Store.userById(el.dataset.target);
    ui.modal = { kind: 'report', targetType: 'comment', postId: el.dataset.post, commentId: el.dataset.comment, targetUserId: el.dataset.target, targetName: author ? author.name : '', error: '' };
    renderModal();
  },

  'report-submit': function () {
    const m = ui.modal;
    const r = Store.report({ targetType: m.targetType, postId: m.postId, commentId: m.commentId, targetUserId: m.targetUserId, reason: val('report-reason') });
    if (!r.ok) { m.error = r.message; renderModal(); return; }
    closeModal();
    toast('举报已提交，管理员会尽快处理');
  },

  'save-profile': function () {
    const r = Store.updateProfile({
      name: val('pf-name'), gender: val('pf-gender'), age: val('pf-age'), grade: val('pf-grade'),
      major: val('pf-major'), className: val('pf-class'), hobbies: val('pf-hobbies'), bio: val('pf-bio'),
    });
    if (!r.ok) { toast(r.message, 'error'); return; }
    toast('资料已保存');
    renderApp();
  },

  'pick-me-tab': function (el) { ui.meTab = el.dataset.tab; renderApp(); },
  'pick-admin-tab': function (el) { ui.adminTab = el.dataset.tab; renderApp(); },

  'review-booking': function (el) {
    const r = Store.reviewBooking(el.dataset.id, el.dataset.status);
    if (!r.ok) { toast(r.message, 'error'); return; }
    toast(el.dataset.status === 'approved' ? '已通过该预约' : '已拒绝该预约');
    renderApp();
  },

  'notice-publish': function () {
    const r = Store.publishNotice(val('notice-title'), val('notice-content'));
    if (!r.ok) { setError('notice-error', r.message); return; }
    toast('通知已发布，将在交流中心顶部显示');
    renderApp();
  },

  'notice-delete': function (el) {
    Store.deleteNotice(el.dataset.id);
    toast('通知已删除');
    renderApp();
  },

  'report-resolve': function (el) {
    const map = { dismiss: '已驳回举报', warn: '已警告该用户', mute: '已禁止该用户发帖', ban: '已封禁该账号', 'remove-content': '已删除违规帖子', unmute: '已解除限制' };
    const r = Store.resolveReport(el.dataset.id, el.dataset.op);
    if (!r.ok) { toast(r.message, 'error'); return; }
    toast(map[el.dataset.op] || '处理完成');
    renderApp();
  },

  'password-submit': function () {
    const m = ui.modal;
    const pwd = val('pwd-new');
    if (pwd !== val('pwd-confirm')) { m.error = '两次输入的密码不一致'; renderModal(); return; }
    const r = Store.setPassword(pwd);
    if (!r.ok) { m.error = r.message; renderModal(); return; }
    closeModal();
    toast('密码修改成功');
    go('admin');
  },

  'close-modal': function () {
    if (ui.modal && ui.modal.kind === 'password') { toast('首次登录需先修改密码', 'error'); return; }
    closeModal();
  },

  'reset-demo': function () {
    if (!window.confirm('确定要重置演示数据吗？所有演示账号的预约、帖子、组队信息将恢复初始状态。')) return;
    Store.reset();
    ui.modal = null;
    toast('演示数据已重置');
    go('login');
  },
};

function handleChange(el, event) {
  const action = el.dataset.change;
  if (action === 'pick-date') {
    Actions['pick-date'](el, event);
  } else if (action === 'pick-team-date') {
    Actions['pick-team-date'](el, event);
  } else if (action === 'avatar-upload') {
    const file = el.files && el.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      Store.updateProfile({ avatar: String(reader.result) });
      toast('头像已更新');
      renderApp();
    };
    reader.readAsDataURL(file);
  }
}
