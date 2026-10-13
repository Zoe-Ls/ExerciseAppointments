const ui = {
  loginTab: 'student',
  venueTypeId: 'badminton',
  date: todayStr(),
  teamDate: '',
  adminTab: 'review',
  meTab: 'bookings',
  modal: null,
  report: null,
};

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function val(id) {
  const el = document.getElementById(id);
  return el ? String(el.value).trim() : '';
}

function fmtDay(date) {
  const parts = String(date).split('-');
  return Number(parts[1]) + '月' + Number(parts[2]) + '日';
}

function dayLabel(date) {
  if (date === todayStr()) return '今天 · ' + fmtDay(date);
  if (date === dateStr(1)) return '明天 · ' + fmtDay(date);
  if (date === dateStr(2)) return '后天 · ' + fmtDay(date);
  return fmtDay(date);
}

function slotLabel(slotId) {
  const slot = TIME_SLOTS.find((s) => s.id === Number(slotId));
  return slot ? slot.label : String(slotId) + ':00';
}

function toneOf(id) {
  let sum = 0;
  String(id || '').split('').forEach((ch) => { sum += ch.charCodeAt(0); });
  return sum % 6;
}

function avatarHtml(user, size) {
  const cls = 'avatar ' + (size || '') + ' tone-' + toneOf(user ? user.id : 'x');
  if (user && user.avatar) return '<span class="' + cls + '"><img src="' + user.avatar + '" alt=""></span>';
  const name = user && user.name ? user.name : '？';
  return '<span class="' + cls + '">' + esc(name.slice(0, 1)) + '</span>';
}

function logoMark() {
  return '<span class="logo-mark"><svg viewBox="0 0 64 64" role="img" aria-label="华中农业大学校徽">'
    + '<defs><linearGradient id="hzauMarkGrad" x1="0" y1="0" x2="1" y2="1">'
    + '<stop offset="0%" stop-color="#d6f280"/><stop offset="100%" stop-color="#a8dc3c"/>'
    + '</linearGradient></defs>'
    + '<circle cx="32" cy="32" r="31" fill="url(#hzauMarkGrad)"/>'
    + '<circle cx="32" cy="32" r="25.5" fill="none" stroke="#0c2a21" stroke-opacity="0.22" stroke-width="1.4"/>'
    + '<path d="M32 47V27" stroke="#0c2a21" stroke-width="2.6" stroke-linecap="round"/>'
    + '<path d="M32 29c0-6.4 4.6-11.3 11.4-12.1C44 23.6 39.3 29 32 29z" fill="#0c2a21"/>'
    + '<path d="M32 35c0-5.6-3.9-9.6-9.8-10.3C21.3 30.9 25.4 35 32 35z" fill="#0c2a21" fill-opacity="0.6"/>'
    + '</svg></span>';
}

function brandLockup() {
  return '<a class="brand" href="#/book">'
    + '<img class="logo-img" src="assets/logo.png" alt="华中农业大学校徽" onerror="this.remove()" onload="var n=this.nextElementSibling; if(n&&n.className&&n.className.indexOf(\'logo-mark\')>=0){n.remove();}">'
    + logoMark()
    + '<span><strong>' + HZAU.name + '</strong><small>' + HZAU.system + ' · ' + HZAU.version + '</small></span>'
    + '</a>';
}

function badge(text, tone) {
  return '<span class="badge badge-' + (tone || 'gray') + '">' + esc(text) + '</span>';
}

function venueLabel(typeId, no) {
  const t = VENUE_MAP[typeId];
  if (!t) return typeId + ' ' + no;
  return t.name + ' ' + t.prefix + no;
}

function userChipById(id, size) {
  const u = Store.userById(id);
  return avatarHtml(u, size || 'avatar-sm') + '<span>' + esc(u ? u.name : '未知用户') + '</span>';
}

function bookingBadge(status) {
  if (status === 'approved') return badge('已通过', 'green');
  if (status === 'rejected') return badge('已拒绝', 'red');
  return badge('待审核', 'amber');
}

function shell(user, activePath, content) {
  const items = user.role === 'admin'
    ? [['admin', '管理后台', '🛠']]
    : [['book', '场馆预约', '📅'], ['teams', '组队', '🤝'], ['forum', '交流中心', '💬'], ['me', '个人主页', '🙂']];
  const nav = items.map((it) => '<a href="#/' + it[0] + '" class="' + (activePath === it[0] ? 'active' : '') + '">' + it[2] + ' ' + it[1] + '</a>').join('');
  let banners = '';
  if (user.banned) {
    banners += '<div class="banner banner-red">🚫 你的账号已被封禁：不能发帖、评论、添加好友，但仍可正常预约场馆。如需申诉请联系场馆管理员。</div>';
  } else if (user.muted) {
    banners += '<div class="banner banner-warn">⚠️ 你的账号已被禁止发帖：仍可浏览交流中心、评论和预约场馆。</div>';
  }
  return '<header class="app-header"><div class="app-header-inner">' + brandLockup()
    + '<nav class="nav">' + nav + '</nav>'
    + '<div class="user-chip">' + avatarHtml(user, 'avatar-sm')
    + '<span class="name">' + esc(user.name) + (user.role === 'admin' ? ' · 管理员' : '') + '</span>'
    + '<button class="btn btn-sm" data-action="logout">退出</button></div>'
    + '</div></header>'
    + '<main class="page">' + banners + content
    + '<p class="foot-note">' + HZAU.name + ' · ' + HZAU.system + '（' + HZAU.version + '）｜ ' + HZAU.motto + '</p></main>';
}

function viewLogin() {
  const tab = ui.loginTab;
  const tabs = [['student', '学生登录'], ['register', '注册账号'], ['admin', '管理员登录']];
  const demo = [
    { label: '学生 · 张伟（20213001）', account: '20213001', password: '123456', tab: 'student' },
    { label: '学生 · 李娜（20213002）', account: '20213002', password: '123456', tab: 'student' },
    { label: '管理员 admin（初始密码）', account: 'admin', password: 'admin123', tab: 'admin' },
  ];
  let form = '';
  if (tab === 'student') {
    form = '<div class="field"><label>学号</label><input id="login-student-id" placeholder="请输入学号，例如 20213001" autocomplete="off"></div>'
      + '<div class="field"><label>密码</label><input id="login-student-pwd" type="password" placeholder="请输入密码"></div>'
      + '<p class="form-error" id="login-error"></p>'
      + '<button class="btn btn-primary btn-block" data-action="login-student">登录</button>'
      + '<p class="hint" style="margin-top:10px">还没有账号？<a href="#" data-action="switch-login-tab" data-tab="register">立即注册</a></p>';
  } else if (tab === 'register') {
    form = '<div class="field"><label>姓名</label><input id="reg-name" placeholder="请输入真实姓名"></div>'
      + '<div class="field"><label>学号</label><input id="reg-student-id" placeholder="6-20 位数字学号"></div>'
      + '<div class="field"><label>密码</label><input id="reg-pwd" type="password" placeholder="至少 6 位"></div>'
      + '<p class="form-error" id="login-error"></p>'
      + '<button class="btn btn-primary btn-block" data-action="register">注册并登录</button>'
      + '<p class="hint" style="margin-top:10px">已有账号？<a href="#" data-action="switch-login-tab" data-tab="student">返回登录</a></p>';
  } else {
    form = '<div class="field"><label>管理员账号</label><input id="login-admin-account" placeholder="请输入管理员账号"></div>'
      + '<div class="field"><label>管理员密码</label><input id="login-admin-pwd" type="password" placeholder="请输入管理员密码"></div>'
      + '<p class="form-error" id="login-error"></p>'
      + '<button class="btn btn-primary btn-block" data-action="login-admin">进入管理后台</button>'
      + '<p class="hint" style="margin-top:10px">超级管理员账号由系统初始化脚本自动创建，首次登录需修改密码。</p>';
  }
  const heroList = [
    '20 片羽毛球馆（东体育馆 3楼）｜ 36 张乒乓球台（东体育馆 1楼）',
    '排球：老场 8 片（第二运动场）· 新场 6 片（第三运动场）· 室内 1 片（西体育馆）',
    '室内网球馆 3 片（东体育馆 2楼）· 室外网球场 4 片',
    '游泳馆（东体育馆）男女各 1 个，仅支持个人预约',
    '开放时间 08:00 - 22:00，每小时一个时段，仅可预约本月日期',
  ];
  return '<div class="auth"><section class="auth-hero">'
    + '<div class="hero-top">' + logoMark() + '<div><strong>' + HZAU.name + '</strong><span>' + HZAU.system + '</span></div></div>'
    + '<h1>校园场馆<br><em>一键预约</em></h1>'
    + '<p class="hero-sub">羽毛球 · 排球 · 乒乓球 · 网球 · 游泳</p>'
    + '<ul class="hero-list">' + heroList.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul>'
    + '<p class="hero-motto">' + HZAU.motto + '</p>'
    + '</section><section class="auth-panel"><div class="auth-card">'
    + '<div class="tabs">' + tabs.map((t) => '<button class="' + (tab === t[0] ? 'active' : '') + '" data-action="switch-login-tab" data-tab="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>'
    + form
    + '<div class="demo-box"><h4>演示账号（点击自动填入）</h4>'
    + demo.map((d) => '<div class="demo-item"><span>' + esc(d.label) + '</span><button class="btn btn-sm btn-ghost" data-action="fill-demo" data-tab="' + d.tab + '" data-account="' + d.account + '" data-password="' + d.password + '">填入</button></div>').join('')
    + '</div>'
    + '<p class="prototype-note">原型版本 ' + HZAU.version + '：数据保存在浏览器本地，可在页面底部重置。</p>'
    + '</div></section></div>';
}
function cellHtml(type, venue, slot) {
  const st = Store.slotStatus(type.id, venue.no, ui.date, slot.id);
  const data = 'data-action="cell" data-type="' + type.id + '" data-no="' + venue.no + '" data-slot="' + slot.id + '"';
  const title = slot.label + ' · ' + type.name + ' ' + venue.code;
  if (st.state === 'mine') return '<td><button class="cell cell-mine" ' + data + ' title="我的预约：' + title + '">我的</button></td>';
  if (st.state === 'taken') return '<td><button class="cell cell-taken" disabled title="已被预约：' + title + '">已约</button></td>';
  if (st.state === 'pending') return '<td><button class="cell cell-pending" disabled title="审核中：' + title + '">待审</button></td>';
  if (isPastSlot(ui.date, slot.id)) return '<td><button class="cell cell-past" disabled title="时段已过期：' + title + '">—</button></td>';
  return '<td><button class="cell cell-free" ' + data + ' title="可预约：' + title + '">可约</button></td>';
}

function viewBook() {
  const user = Store.currentUser();
  const type = VENUE_MAP[ui.venueTypeId] || VENUE_TYPES[0];
  const bounds = monthBounds();
  const venues = VENUES.filter((v) => v.typeId === type.id);
  let freeCount = 0;
  let takenCount = 0;
  venues.forEach((v) => {
    TIME_SLOTS.forEach((s) => {
      const st = Store.slotStatus(type.id, v.no, ui.date, s.id);
      if (st.state !== 'free') takenCount += 1;
      else if (!isPastSlot(ui.date, s.id)) freeCount += 1;
    });
  });
  const groups = [];
  VENUE_TYPES.forEach((t) => {
    let g = groups.find((x) => x.name === t.group);
    if (!g) { g = { name: t.group, items: [] }; groups.push(g); }
    g.items.push(t);
  });
  const chips = groups.map((g) => '<div class="chip-group"><span class="chip-group-label">' + esc(g.name) + '</span><div class="chips">'
    + g.items.map((t) => '<button class="chip ' + (t.id === type.id ? 'active' : '') + '" data-action="pick-venue-type" data-id="' + t.id + '">' + t.icon + ' ' + esc(t.name) + ' <span class="cnt">' + t.count + '片</span></button>').join('')
    + '</div></div>').join('');
  const rows = venues.map((v) => '<tr><th><span class="venue-code">' + v.code + '</span></th>'
    + TIME_SLOTS.map((s) => cellHtml(type, v, s)).join('') + '</tr>').join('');
  const content = '<div class="page-head">'
    + '<div><h1 class="page-title">场馆预约</h1><p class="sub">选择场馆类型与日期，绿色图标表示该时段可以预约</p></div>'
    + '<div class="row"><button class="btn btn-sm" data-action="reset-demo">重置演示数据</button></div>'
    + '</div>'
    + '<div class="card filter-card"><div class="chip-groups">' + chips + '</div>'
    + '<div class="date-bar">'
    + '<span class="muted">预约日期</span>'
    + '<input type="date" id="datePicker" data-change="pick-date" min="' + bounds.min + '" max="' + bounds.max + '" value="' + ui.date + '">'
    + '<button class="btn btn-sm" data-action="pick-date-quick" data-offset="0">今天</button>'
    + '<button class="btn btn-sm" data-action="pick-date-quick" data-offset="1">明天</button>'
    + '<button class="btn btn-sm" data-action="pick-date-quick" data-offset="2">后天</button>'
    + '<span class="hint">仅可预约本月内日期（' + bounds.min + ' ~ ' + bounds.max + '），每天 08:00 - 22:00，每小时一个时段</span>'
    + '<div class="legend">'
    + '<span><i class="dot dot-free"></i>可预约</span>'
    + '<span><i class="dot dot-mine"></i>我的预约</span>'
    + '<span><i class="dot dot-pending"></i>待审核</span>'
    + '<span><i class="dot dot-taken"></i>已预约</span>'
    + '<span><i class="dot dot-past"></i>已过期</span>'
    + '</div></div></div>'
    + '<div class="card venue-info">'
    + '<span class="venue-icon">' + type.icon + '</span>'
    + '<div><strong>' + esc(type.name) + '</strong><p class="hint">📍 ' + esc(type.location) + ' ｜ 共 ' + type.count + ' 个场地 ｜ ' + esc(type.capacityNote) + ' ｜ 支持：' + type.modes.map((m) => MODE_LABEL[m]).join(' / ') + '</p></div>'
    + '<div class="summary-pills"><span class="pill">' + dayLabel(ui.date) + '</span><span class="pill">可约 <b>' + freeCount + '</b></span><span class="pill">已约 / 待审 <b>' + takenCount + '</b></span></div>'
    + '</div>'
    + '<div class="card grid-card"><div class="grid-wrap"><table class="slot-grid">'
    + '<thead><tr><th>场地</th>' + TIME_SLOTS.map((s) => '<th>' + s.short + '</th>').join('') + '</tr></thead>'
    + '<tbody>' + rows + '</tbody></table></div></div>';
  return shell(user, 'book', content);
}

function teamCard(team, user) {
  const type = VENUE_MAP[team.venueTypeId];
  const joined = team.members.filter((m) => m.status === 'joined');
  const pending = team.members.filter((m) => m.status === 'pending');
  const isOwner = team.userId === user.id;
  const mine = team.members.find((m) => m.userId === user.id);
  const statusText = team.status === 'booked' ? badge('已提交预约', 'green')
    : (joined.length >= team.need ? badge('人数已满', 'blue') : badge('招募中 ' + joined.length + '/' + team.need, 'amber'));
  let actions = '';
  if (isOwner) {
    actions = '<button class="btn btn-sm btn-primary" data-action="open-team-manage" data-id="' + team.id + '">管理队伍' + (pending.length ? '（' + pending.length + ' 条申请）' : '') + '</button>'
      + '<button class="btn btn-sm" data-action="team-book" data-id="' + team.id + '"' + (joined.length < team.need || team.status === 'booked' ? ' disabled' : '') + '>满员后提交预约</button>';
  } else if (mine) {
    actions = '<button class="btn btn-sm" disabled>' + (mine.status === 'pending' ? '已申请，等待队长同意' : '已加入该队') + '</button>';
  } else {
    actions = '<button class="btn btn-sm btn-primary" data-action="team-apply" data-id="' + team.id + '">申请加入</button>';
  }
  return '<div class="card team-card"><div class="row-between">'
    + '<div><strong>' + esc(team.title) + '</strong><p class="hint">' + type.icon + ' ' + venueLabel(team.venueTypeId, team.venueNo) + ' ｜ ' + dayLabel(team.date) + ' ｜ ' + slotLabel(team.slot) + '</p></div>'
    + statusText + '</div>'
    + '<div class="team-meta"><span>发起人：' + esc(Store.userById(team.userId) ? Store.userById(team.userId).name : '未知') + '</span>'
    + '<span>需要人数：' + team.need + ' 人</span>'
    + '<span>已加入：' + joined.length + ' 人</span>'
    + (team.contact ? '<span>联系方式：' + esc(team.contact) + '</span>' : '')
    + '<span class="muted">发布于 ' + esc(team.createdAt) + '</span></div>'
    + (team.note ? '<p class="hint">' + esc(team.note) + '</p>' : '')
    + '<div class="team-members">' + team.members.map((m) => '<span class="member-pill ' + (m.status === 'pending' ? 'pending' : '') + '">' + esc(m.name) + (m.status === 'pending' ? '（待同意）' : '') + '</span>').join('') + '</div>'
    + '<div class="row" style="margin-top:12px">' + actions + '</div></div>';
}

function viewTeams() {
  const user = Store.currentUser();
  const all = Store.teams();
  const filterDate = ui.teamDate;
  const list = filterDate ? all.filter((t) => t.date === filterDate) : all;
  const dates = all.map((t) => t.date).filter(Boolean).sort();
  const month = monthBounds();
  const minDate = dates.length && dates[0] < month.min ? dates[0] : month.min;
  const maxDate = dates.length && dates[dates.length - 1] > month.max ? dates[dates.length - 1] : month.max;
  const filterBar = '<div class="card filter-card"><div class="date-bar" style="margin-top:0;padding-top:0;border-top:none">'
    + '<span class="muted">活动日期</span>'
    + '<input type="date" id="teamDateFilter" data-change="pick-team-date" min="' + minDate + '" max="' + maxDate + '" value="' + esc(filterDate) + '">'
    + '<button class="btn btn-sm" data-action="clear-team-date"' + (filterDate ? '' : ' disabled') + '>清除筛选</button>'
    + '<span class="hint">' + (filterDate ? '仅显示 ' + fmtDay(filterDate) + ' 当天的组队活动，共 ' + list.length + ' 支队伍' : '默认显示全部组队活动，共 ' + all.length + ' 支队伍') + '</span>'
    + '</div></div>';
  let body;
  if (list.length) {
    body = list.map((t) => teamCard(t, user)).join('');
  } else if (filterDate) {
    body = '<div class="card card-pad empty">' + fmtDay(filterDate) + ' 当天没有组队活动，换个日期试试'
      + '<div class="row" style="justify-content:center;margin-top:12px"><button class="btn btn-sm btn-primary" data-action="clear-team-date">清除筛选</button></div></div>';
  } else {
    body = '<div class="card card-pad empty">暂无组队消息，点击右上角创建第一支队伍吧</div>';
  }
  const content = '<div class="page-head">'
    + '<div><h1 class="page-title">组队模块</h1><p class="sub">人数不足时，可以发布组队消息邀请其他同学加入，队长同意后即可组队预约</p></div>'
    + '<button class="btn btn-primary" data-action="open-team-create">＋ 创建队伍</button>'
    + '</div>'
    + '<div class="banner banner-green">💡 组队流程：发布组队消息 → 同学申请加入 → 队长同意 → 人数满额后提交预约 → 管理员审核</div>'
    + filterBar
    + body;
  return shell(user, 'teams', content);
}

function postCard(post, user) {
  const author = Store.userById(post.userId);
  const liked = post.likes.indexOf(user.id) >= 0;
  const saved = post.favorites.indexOf(user.id) >= 0;
  const isSelf = post.userId === user.id;
  const isFriend = Store.isFriend(user.id, post.userId);
  const canPost = Store.canPost(user);
  const comments = post.comments.map((c) => '<div class="comment">' + avatarHtml(Store.userById(c.userId), 'avatar-sm')
    + '<div><span class="who">' + esc(Store.userById(c.userId) ? Store.userById(c.userId).name : '未知') + '</span>：' + esc(c.content)
    + '<span class="hint"> ' + esc(c.createdAt) + '</span>'
    + '<button class="link-btn" data-action="report-comment" data-post="' + post.id + '" data-comment="' + c.id + '" data-target="' + c.userId + '">举报</button></div></div>').join('');
  return '<div class="card post"><div class="post-head">' + avatarHtml(author, 'avatar-sm')
    + '<div><span class="who">' + esc(author ? author.name : '未知用户') + '</span>'
    + '<p class="hint">' + esc(author && author.major ? author.major : '') + ' ｜ ' + esc(post.createdAt) + '</p></div>'
    + '<div class="row" style="margin-left:auto">'
    + (!isSelf && !isFriend ? '<button class="link-btn" data-action="add-friend" data-id="' + post.userId + '">＋ 加好友</button>' : '')
    + '<button class="link-btn" data-action="report-post" data-post="' + post.id + '" data-target="' + post.userId + '">举报</button>'
    + '</div></div>'
    + '<p class="post-content">' + esc(post.content) + '</p>'
    + '<div class="post-actions">'
    + '<button class="link-btn ' + (liked ? 'on' : '') + '" data-action="like" data-id="' + post.id + '">👍 点赞 ' + post.likes.length + '</button>'
    + '<button class="link-btn ' + (saved ? 'on' : '') + '" data-action="favorite" data-id="' + post.id + '">⭐ 收藏 ' + post.favorites.length + '</button>'
    + '<span class="hint">💬 评论 ' + post.comments.length + '</span>'
    + '</div>'
    + (post.comments.length ? '<div class="comments">' + comments + '</div>' : '')
    + '<div class="comment-form"><input class="input" id="comment-' + post.id + '" placeholder="' + (canPost ? '写下你的评论…' : '当前账号无法评论') + '"' + (canPost ? '' : ' disabled') + '>'
    + '<button class="btn btn-sm btn-primary" data-action="comment" data-id="' + post.id + '"' + (canPost ? '' : ' disabled') + '>评论</button></div></div>';
}

function viewForum() {
  const user = Store.currentUser();
  const notices = Store.notices();
  const posts = Store.posts().slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const canPost = Store.canPost(user);
  const noticeBar = notices.length
    ? '<div class="card notice-bar"><div class="row" style="gap:8px;margin-bottom:4px"><strong>📢 场馆通知</strong><span class="hint">（管理员发布）</span></div>'
      + notices.map((n) => '<div class="notice-item"><span class="notice-tag">通知</span><div><strong>' + esc(n.title) + '</strong><p class="hint">' + esc(n.content) + '</p><p class="hint">' + esc(n.createdAt) + ' · ' + esc(n.by) + '</p></div></div>').join('')
      + '</div>'
    : '<div class="card card-pad empty">暂无管理员通知</div>';
  const composer = '<div class="card card-pad"><div class="row-between" style="margin-bottom:8px"><strong>发布新帖子</strong><span class="hint">' + (canPost ? '可以分享约球、组队、场馆信息' : '当前账号无法发帖') + '</span></div>'
    + '<textarea class="textarea" id="post-content" rows="3" placeholder="' + (canPost ? '说点什么吧，例如：今晚羽毛球馆 3 楼还差 2 人…' : '你的账号已被限制发帖') + '"' + (canPost ? '' : ' disabled') + '></textarea>'
    + '<div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn btn-primary"' + (canPost ? '' : ' disabled') + ' data-action="post-submit">发布</button></div></div>';
  const content = '<div class="page-head"><div><h1 class="page-title">交流中心</h1><p class="sub">约球帖、经验分享、场馆通知都在这里</p></div>'
    + '<span class="hint">公告会置顶显示，帖子支持点赞、评论、收藏、举报</span></div>'
    + noticeBar + composer
    + (posts.length ? posts.map((p) => postCard(p, user)).join('') : '<div class="card card-pad empty">还没有帖子，快来发布第一条吧</div>');
  return shell(user, 'forum', content);
}
function profileField(label, id, value, type) {
  return '<div class="field"><label>' + label + '</label><input id="' + id + '" type="' + (type || 'text') + '" value="' + esc(value) + '"></div>';
}

function viewMe() {
  const user = Store.currentUser();
  const tab = ui.meTab;
  const bookings = Store.bookingsOf(user.id).slice().sort((a, b) => (a.date + a.slot < b.date + b.slot ? 1 : -1));
  const friends = (user.friends || []).map((id) => Store.userById(id)).filter(Boolean);
  const requests = Store.friendRequestsFor(user.id);
  const myPosts = Store.posts().filter((p) => p.userId === user.id);
  const favorites = Store.posts().filter((p) => p.favorites.indexOf(user.id) >= 0);
  const tabs = [['bookings', '我的预约 ' + bookings.length], ['friends', '我的好友 ' + friends.length], ['posts', '我的帖子 ' + myPosts.length], ['favorites', '我的收藏 ' + favorites.length]];
  const profile = '<div class="card card-pad">'
    + '<div class="profile-head">'
    + '<div class="avatar-upload">' + avatarHtml(user, 'avatar-lg')
    + '<label title="上传头像">＋<input type="file" accept="image/*" data-change="avatar-upload"></label></div>'
    + '<div class="grow"><h2 style="font-size:18px">' + esc(user.name) + ' ' + (user.banned ? badge('已封禁', 'red') : (user.muted ? badge('禁止发帖', 'amber') : badge('正常', 'green'))) + '</h2>'
    + '<p class="hint">学号：' + esc(user.studentId) + ' ｜ 注册时间：' + esc(user.createdAt) + '</p>'
    + '<p class="hint">好友 ' + friends.length + ' 位 ｜ 预约 ' + bookings.length + ' 条 ｜ 帖子 ' + myPosts.length + ' 条</p></div>'
    + '<button class="btn btn-primary" data-action="save-profile">保存资料</button></div>'
    + '<div class="field-grid" style="margin-top:16px">'
    + profileField('姓名', 'pf-name', user.name)
    + '<div class="field"><label>性别</label><select id="pf-gender"><option value="男"' + (user.gender === '男' ? ' selected' : '') + '>男</option><option value="女"' + (user.gender === '女' ? ' selected' : '') + '>女</option></select></div>'
    + profileField('年龄', 'pf-age', user.age, 'number')
    + profileField('年级', 'pf-grade', user.grade)
    + profileField('专业', 'pf-major', user.major)
    + profileField('班级', 'pf-class', user.className)
    + profileField('爱好', 'pf-hobbies', user.hobbies)
    + '</div>'
    + '<div class="field"><label>个人介绍</label><textarea class="textarea" id="pf-bio" rows="2">' + esc(user.bio) + '</textarea></div>'
    + '<p class="hint">提示：可上传本地图片作为头像，资料会保存在浏览器本地。</p></div>';

  let body = '';
  if (tab === 'bookings') {
    body = bookings.length
      ? '<div class="card table-scroll"><table class="table"><thead><tr><th>场地</th><th>日期</th><th>时段</th><th>模式</th><th>成员</th><th>状态</th><th>操作</th></tr></thead><tbody>'
        + bookings.map((b) => '<tr><td>' + VENUE_MAP[b.venueTypeId].icon + ' ' + venueLabel(b.venueTypeId, b.venueNo) + '</td><td>' + dayLabel(b.date) + '</td><td>' + slotLabel(b.slot) + '</td><td>' + (MODE_LABEL[b.mode] || '个人预约') + (b.clubName ? '（' + esc(b.clubName) + '）' : '') + '</td>'
          + '<td class="hint">' + esc(b.members.join('、')) + '</td><td>' + bookingBadge(b.status) + '</td>'
          + '<td><button class="btn btn-sm btn-danger" data-action="cancel-booking" data-id="' + b.id + '">取消预约</button></td></tr>').join('')
        + '</tbody></table></div>'
      : '<div class="card card-pad empty">还没有预约记录，去场馆预约看看吧</div>';
  } else if (tab === 'friends') {
    body = '<div class="card card-pad"><strong>好友申请</strong>'
      + (requests.length ? requests.map((r) => {
        const from = Store.userById(r.fromId);
        return '<div class="row-between" style="margin-top:10px"><div class="row">' + avatarHtml(from, 'avatar-sm') + '<span>' + esc(from ? from.name : '未知') + ' 申请加你为好友</span></div>'
          + '<div class="row"><span class="hint">' + esc(r.createdAt) + '</span>'
          + '<button class="btn btn-sm btn-primary" data-action="friend-respond" data-id="' + r.id + '" data-accept="1">同意</button>'
          + '<button class="btn btn-sm" data-action="friend-respond" data-id="' + r.id + '" data-accept="0">拒绝</button></div></div>';
      }).join('') : '<p class="hint" style="margin-top:8px">暂无待处理的好友申请</p>')
      + '</div>'
      + '<div class="card card-pad" style="margin-top:14px"><strong>我的好友（' + friends.length + '）</strong>'
      + (friends.length ? '<div class="row wrap" style="margin-top:10px;gap:14px">' + friends.map((f) => '<div class="row" style="gap:8px">' + avatarHtml(f, 'avatar-sm') + '<div><div>' + esc(f.name) + '</div><span class="hint">' + esc(f.major || '') + '</span></div></div>').join('') + '</div>'
        : '<p class="hint" style="margin-top:8px">还没有好友，去交流中心加好友吧</p>')
      + '</div>';
  } else if (tab === 'posts') {
    body = myPosts.length ? myPosts.map((p) => postCard(p, user)).join('') : '<div class="card card-pad empty">还没有发布过帖子</div>';
  } else {
    body = favorites.length ? favorites.map((p) => postCard(p, user)).join('') : '<div class="card card-pad empty">还没有收藏的帖子</div>';
  }

  const content = '<div class="page-head"><div><h1 class="page-title">个人主页</h1><p class="sub">完善资料，方便同学找到你一起运动</p></div></div>'
    + profile
    + '<div class="tabs-line" style="margin-top:16px">' + tabs.map((t) => '<button class="' + (tab === t[0] ? 'active' : '') + '" data-action="pick-me-tab" data-tab="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>'
    + body;
  return shell(user, 'me', content);
}

function viewAdmin() {
  const user = Store.currentUser();
  const tab = ui.adminTab;
  const stats = Store.stats();
  const tabs = [['review', '预约审核'], ['report', '举报处理'], ['notice', '通知发布'], ['stats', '数据概览']];
  let body = '';
  if (tab === 'review') {
    const pending = Store.pendingBookings();
    const handled = Store.load().bookings.filter((b) => b.status !== 'pending').sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 8);
    body = '<div class="card card-pad" style="margin-bottom:14px"><strong>待审核预约（' + pending.length + '）</strong>'
      + (pending.length ? '<div class="table-scroll"><table class="table"><thead><tr><th>申请人</th><th>场地</th><th>日期 / 时段</th><th>模式</th><th>成员</th><th>操作</th></tr></thead><tbody>'
        + pending.map((b) => '<tr><td>' + userChipById(b.userId) + '</td>'
          + '<td>' + VENUE_MAP[b.venueTypeId].icon + ' ' + venueLabel(b.venueTypeId, b.venueNo) + '</td>'
          + '<td>' + dayLabel(b.date) + '<p class="hint">' + slotLabel(b.slot) + '</p></td>'
          + '<td>' + (MODE_LABEL[b.mode] || '个人预约') + (b.clubName ? '<p class="hint">' + esc(b.clubName) + '</p>' : '') + '</td>'
          + '<td class="hint">' + esc(b.members.join('、')) + '</td>'
          + '<td><div class="row"><button class="btn btn-sm btn-primary" data-action="review-booking" data-id="' + b.id + '" data-status="approved">通过</button>'
          + '<button class="btn btn-sm btn-danger" data-action="review-booking" data-id="' + b.id + '" data-status="rejected">拒绝</button></div></td></tr>').join('')
        + '</tbody></table></div>' : '<p class="hint" style="margin-top:8px">暂无待审核预约 🎉</p>')
      + '</div>'
      + '<div class="card card-pad"><strong>最近处理记录</strong>'
      + (handled.length ? '<div class="table-scroll"><table class="table"><thead><tr><th>申请人</th><th>场地</th><th>日期 / 时段</th><th>结果</th></tr></thead><tbody>'
        + handled.map((b) => '<tr><td>' + userChipById(b.userId) + '</td><td>' + venueLabel(b.venueTypeId, b.venueNo) + '</td><td>' + fmtDay(b.date) + ' ' + slotLabel(b.slot) + '</td><td>' + bookingBadge(b.status) + '</td></tr>').join('')
        + '</tbody></table></div>' : '<p class="hint" style="margin-top:8px">暂无记录</p>')
      + '</div>';
  } else if (tab === 'report') {
    const reports = Store.reports();
    body = '<div class="card card-pad"><strong>用户举报（待处理 ' + stats.openReports + ' 条）</strong>'
      + (reports.length ? reports.map((r) => {
        const target = Store.userById(r.targetUserId);
        const reporter = Store.userById(r.reporterId);
        const post = r.postId ? Store.load().posts.find((p) => p.id === r.postId) : null;
        const typeText = r.targetType === 'post' ? '帖子' : '用户';
        return '<div class="notice-item" style="padding:12px 0"><span class="notice-tag" style="background:' + (r.status === 'open' ? '#b23a2e' : '#146c4a') + ';color:#fff">' + (r.status === 'open' ? '待处理' : '已处理') + '</span>'
          + '<div class="grow"><div class="row wrap"><strong>' + esc(target ? target.name : '未知用户') + '</strong>'
          + (target && target.banned ? badge('已封禁', 'red') : (target && target.muted ? badge('禁止发帖', 'amber') : badge('正常', 'green')))
          + '<span class="hint">被举报内容：' + typeText + '</span></div>'
          + '<p class="hint">举报人：' + esc(reporter ? reporter.name : '未知') + ' ｜ 理由：' + esc(r.reason) + ' ｜ ' + esc(r.createdAt) + '</p>'
          + (post ? '<p class="hint">内容摘要：' + esc(post.content.slice(0, 40)) + (post.content.length > 40 ? '…' : '') + '</p>' : '')
          + '<div class="row wrap" style="margin-top:8px">'
          + '<button class="btn btn-sm" data-action="report-resolve" data-id="' + r.id + '" data-op="dismiss">驳回举报</button>'
          + '<button class="btn btn-sm" data-action="report-resolve" data-id="' + r.id + '" data-op="warn">警告用户</button>'
          + '<button class="btn btn-sm" data-action="report-resolve" data-id="' + r.id + '" data-op="remove-content">删除帖子</button>'
          + '<button class="btn btn-sm btn-danger" data-action="report-resolve" data-id="' + r.id + '" data-op="mute">禁止发帖</button>'
          + '<button class="btn btn-sm btn-danger" data-action="report-resolve" data-id="' + r.id + '" data-op="ban">封禁账号</button>'
          + ((target && (target.banned || target.muted)) ? '<button class="btn btn-sm btn-ghost" data-action="report-resolve" data-id="' + r.id + '" data-op="unmute">解除限制</button>' : '')
          + '</div></div></div>';
      }).join('') : '<p class="hint" style="margin-top:8px">暂无举报记录</p>')
      + '<p class="hint" style="margin-top:10px">说明：封禁账号后用户仍可正常预约场馆，但不能发帖、评论和添加好友。</p></div>';
  } else if (tab === 'notice') {
    const notices = Store.notices();
    body = '<div class="card card-pad"><strong>发布通知</strong>'
      + '<div class="field" style="margin-top:10px"><label>通知标题</label><input id="notice-title" placeholder="例如：国庆假期场馆开放安排"></div>'
      + '<div class="field"><label>通知内容</label><textarea class="textarea" id="notice-content" rows="3" placeholder="请输入通知内容"></textarea></div>'
      + '<p class="form-error" id="notice-error"></p>'
      + '<div class="row" style="justify-content:flex-end"><button class="btn btn-primary" data-action="notice-publish">发布通知</button></div></div>'
      + '<div class="card card-pad" style="margin-top:14px"><strong>已发布通知（' + notices.length + '）</strong>'
      + (notices.length ? notices.map((n) => '<div class="notice-item"><span class="notice-tag">通知</span><div class="grow"><strong>' + esc(n.title) + '</strong><p class="hint">' + esc(n.content) + '</p><p class="hint">' + esc(n.createdAt) + '</p></div>'
        + '<button class="btn btn-sm btn-danger" data-action="notice-delete" data-id="' + n.id + '">删除</button></div>').join('') : '<p class="hint" style="margin-top:8px">暂无通知</p>')
      + '<p class="hint" style="margin-top:8px">通知会显示在交流中心顶部。</p></div>';
  } else {
    const max = Math.max.apply(null, stats.byType.map((t) => t.count).concat([1]));
    body = '<div class="stats">'
      + '<div class="card stat"><b>' + stats.bookings + '</b><span>有效预约总数</span></div>'
      + '<div class="card stat"><b>' + stats.pending + '</b><span>待审核预约</span></div>'
      + '<div class="card stat"><b>' + stats.users + '</b><span>注册学生</span></div>'
      + '<div class="card stat"><b>' + stats.teams + '</b><span>组队消息</span></div>'
      + '<div class="card stat"><b>' + stats.posts + '</b><span>交流中心帖子</span></div>'
      + '<div class="card stat"><b>' + stats.openReports + '</b><span>待处理举报</span></div>'
      + '</div>'
      + '<div class="card card-pad" style="margin-top:14px"><strong>各场馆预约热度</strong><div style="margin-top:12px">'
      + stats.byType.map((t) => '<div class="bar-row"><span>' + t.icon + ' ' + esc(t.name) + '</span><span class="bar"><i style="width:' + Math.round((t.count / max) * 100) + '%"></i></span><span class="hint">' + t.count + '</span></div>').join('')
      + '</div></div>'
      + '<div class="card card-pad" style="margin-top:14px"><strong>系统说明</strong><ul style="margin-top:8px;display:grid;gap:6px">'
      + '<li class="hint">· 开放时间 08:00 - 22:00，每小时一个时段，仅可预约本月内日期。</li>'
      + '<li class="hint">· 超级管理员账号在系统初始化时自动创建（admin / admin123），首次登录需修改密码。</li>'
      + '<li class="hint">· 普通用户使用学号 + 密码登录，管理员使用管理员账号 + 密码登录。</li>'
      + '</ul></div>';
  }
  const content = '<div class="page-head"><div><h1 class="page-title">管理后台</h1><p class="sub">审核预约、处理举报、发布通知</p></div>'
    + '<button class="btn btn-sm" data-action="reset-demo">重置演示数据</button></div>'
    + '<div class="tabs-line">' + tabs.map((t) => '<button class="' + (tab === t[0] ? 'active' : '') + '" data-action="pick-admin-tab" data-tab="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>'
    + body;
  return shell(user, 'admin', content);
}
function modalShell(title, bodyHtml, footHtml) {
  return '<div class="modal-mask"><div class="modal">'
    + '<div class="modal-head"><h3>' + title + '</h3><button class="icon-btn" data-action="close-modal">✕</button></div>'
    + bodyHtml + (footHtml || '') + '</div></div>';
}

function modalBooking(m) {
  const user = Store.currentUser();
  const type = VENUE_MAP[m.typeId];
  const summary = '<div class="modal-summary"><span class="venue-icon">' + type.icon + '</span><div>'
    + '<strong>' + esc(type.name) + ' · ' + type.prefix + m.no + '</strong>'
    + '<p class="hint">📍 ' + esc(type.location) + ' ｜ ' + dayLabel(m.date) + ' ｜ ' + slotLabel(m.slot) + '</p>'
    + '<p class="hint">' + esc(type.capacityNote) + ' ｜ 可选模式：' + type.modes.map((x) => MODE_LABEL[x]).join(' / ') + ' / 组队模式</p>'
    + '</div></div>';
  if (!m.mode) {
    const cards = (type.modes.includes('personal') ? '<button class="mode-card" data-action="pick-mode" data-mode="personal"><strong>👤 个人预约</strong><span>填写全部 ' + type.capacity + ' 位成员姓名后提交预约</span></button>' : '')
      + (type.modes.includes('club') ? '<button class="mode-card" data-action="pick-mode" data-mode="club"><strong>🏛 社团预约</strong><span>以社团名义预约，填写社团名称与全部成员姓名</span></button>' : '')
      + '<button class="mode-card" data-action="pick-mode" data-mode="team"><strong>🤝 组队模式</strong><span>人数不足时发布组队消息，招满后再提交预约</span></button>';
    return modalShell('预约场地', summary + '<div class="modal-body"><p class="section-hint">请选择预约模式</p><div class="mode-cards">' + cards + '</div></div>');
  }
  let body = '<div class="modal-body">';
  if (m.mode === 'team') {
    body += '<div class="field"><label>队伍标题</label><input id="team-title" value="' + esc(type.name + ' 组队招募') + '"></div>'
      + '<div class="field-grid">'
      + '<div class="field"><label>需要人数（场地规定 ' + type.capacity + ' 人）</label><input id="team-need" type="number" min="2" max="' + type.capacity + '" value="' + type.capacity + '"></div>'
      + '<div class="field"><label>联系方式</label><input id="team-contact" placeholder="微信号 / 手机号"></div>'
      + '</div>'
      + '<div class="field"><label>说明</label><textarea class="textarea" id="team-note" rows="2" placeholder="例如：还差 2 人，水平不限"></textarea></div>'
      + '<p class="hint">提交后会生成一条组队消息，其他同学可申请加入；你在「组队」页面同意后，人数满额即可提交预约。</p>';
  } else {
    if (m.mode === 'club') {
      body += '<div class="field"><label>社团名称</label><input id="booking-club" placeholder="例如：园艺学院羽毛球社" value="' + esc(m.clubName || '') + '"></div>';
    }
    body += '<p class="section-hint">请填写场地规定人数内的全部 ' + type.capacity + ' 位成员姓名；人数不足时可返回选择组队模式</p><div class="member-grid">';
    for (let i = 0; i < type.capacity; i += 1) {
      const preset = (m.members && m.members[i]) || (i === 0 ? user.name : '');
      body += '<input class="member-input" placeholder="成员 ' + (i + 1) + ' 姓名" value="' + esc(preset) + '">';
    }
    body += '</div>';
  }
  body += '<p class="form-error">' + esc(m.error || '') + '</p></div>';
  const foot = '<div class="modal-foot"><button class="btn" data-action="booking-back">返回</button>'
    + '<button class="btn btn-primary" data-action="' + (m.mode === 'team' ? 'team-create-submit' : 'booking-submit') + '">'
    + (m.mode === 'team' ? '发布组队消息' : '提交预约') + '</button></div>';
  return modalShell('预约场地', summary + body + foot);
}

function modalBookingDetail(m) {
  const b = Store.load().bookings.find((x) => x.id === m.id);
  if (!b) return modalShell('预约详情', '<div class="modal-body">该预约不存在或已取消</div>');
  const rows = [
    ['场地', venueLabel(b.venueTypeId, b.venueNo)],
    ['日期', dayLabel(b.date)],
    ['时段', slotLabel(b.slot)],
    ['模式', (MODE_LABEL[b.mode] || '个人预约') + (b.clubName ? '（' + b.clubName + '）' : '')],
    ['成员', b.members.join('、')],
    ['状态', b.status === 'approved' ? '管理员已通过' : (b.status === 'rejected' ? '已被拒绝' : '等待管理员审核')],
    ['提交时间', b.createdAt],
  ];
  const body = '<div class="modal-body"><div class="profile-list">'
    + rows.map((r) => '<div class="profile-item"><b>' + r[0] + '</b><span>' + esc(r[1]) + '</span></div>').join('')
    + '</div>'
    + (b.status !== 'rejected' ? '<p class="hint">如需取消预约，可点击下方按钮（管理员审核通过前可随时取消）。</p>' : '')
    + '</div>';
  const foot = '<div class="modal-foot"><button class="btn" data-action="close-modal">关闭</button>'
    + '<button class="btn btn-danger" data-action="cancel-booking" data-id="' + b.id + '">取消预约</button></div>';
  return modalShell('我的预约详情', body + foot);
}

function modalTeamCreate(m) {
  const typeOptions = VENUE_TYPES.map((t) => '<option value="' + t.id + '"' + (t.id === (m.typeId || 'volleyball-new') ? ' selected' : '') + '>' + t.icon + ' ' + esc(t.name) + '（' + esc(t.location) + '）</option>').join('');
  const slotOptions = TIME_SLOTS.map((s) => '<option value="' + s.id + '"' + (s.id === (m.slot || 15) ? ' selected' : '') + '>' + s.label + '</option>').join('');
  const body = '<div class="modal-body">'
    + '<div class="field"><label>场馆</label><select id="tc-type">' + typeOptions + '</select></div>'
    + '<div class="field-grid">'
    + '<div class="field"><label>场号</label><input id="tc-no" placeholder="例如 03" value="' + esc(m.no || '01') + '"></div>'
    + '<div class="field"><label>日期</label><input id="tc-date" type="date" min="' + monthBounds().min + '" max="' + monthBounds().max + '" value="' + (m.date || ui.date) + '"></div>'
    + '<div class="field"><label>时段</label><select id="tc-slot">' + slotOptions + '</select></div>'
    + '<div class="field"><label>需要人数</label><input id="tc-need" type="number" min="2" value="' + (m.need || 4) + '"></div>'
    + '</div>'
    + '<div class="field"><label>队伍标题</label><input id="tc-title" placeholder="例如：排球新场 周末下午缺 3 人" value="' + esc(m.title || '') + '"></div>'
    + '<div class="field"><label>联系方式</label><input id="tc-contact" placeholder="微信号 / 手机号"></div>'
    + '<div class="field"><label>说明</label><textarea class="textarea" id="tc-note" rows="2" placeholder="例如：水平不限，有球"></textarea></div>'
    + '<p class="form-error">' + esc(m.error || '') + '</p></div>';
  const foot = '<div class="modal-foot"><button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" data-action="team-create-submit">发布组队消息</button></div>';
  return modalShell('创建队伍', body + foot);
}

function modalTeamManage(m) {
  const team = Store.load().teams.find((t) => t.id === m.id);
  if (!team) return modalShell('管理队伍', '<div class="modal-body">队伍不存在</div>');
  const joined = team.members.filter((x) => x.status === 'joined');
  const pending = team.members.filter((x) => x.status === 'pending');
  const body = '<div class="modal-body">'
    + '<p class="section-hint">' + esc(team.title) + ' ｜ ' + venueLabel(team.venueTypeId, team.venueNo) + ' ｜ ' + dayLabel(team.date) + ' ' + slotLabel(team.slot) + '</p>'
    + '<div class="team-members">' + joined.map((x) => '<span class="member-pill">' + esc(x.name) + '</span>').join('') + '</div>'
    + '<p class="section-hint" style="margin-top:14px">待同意的入队申请（' + pending.length + '）</p>'
    + (pending.length ? pending.map((x) => '<div class="row-between" style="margin-bottom:8px"><div class="row">' + avatarHtml(Store.userById(x.userId), 'avatar-sm')
      + '<div><div>' + esc(x.name) + '</div><span class="hint">' + esc(x.note || '申请加入队伍') + '</span></div></div>'
      + '<div class="row"><button class="btn btn-sm btn-primary" data-action="team-review" data-id="' + team.id + '" data-user="' + x.userId + '" data-approve="1">同意</button>'
      + '<button class="btn btn-sm" data-action="team-review" data-id="' + team.id + '" data-user="' + x.userId + '" data-approve="0">拒绝</button></div></div>').join('')
      : '<p class="hint">暂无待处理申请</p>')
    + '</div>';
  const foot = '<div class="modal-foot"><button class="btn" data-action="close-modal">关闭</button>'
    + '<button class="btn btn-primary" data-action="team-book" data-id="' + team.id + '"' + (joined.length < team.need || team.status === 'booked' ? ' disabled' : '') + '>提交预约</button></div>';
  return modalShell('管理队伍', body + foot);
}

function modalReport(m) {
  const body = '<div class="modal-body">'
    + '<p class="section-hint">举报对象：' + esc(m.targetName || '该用户') + ' 的' + (m.targetType === 'post' ? '帖子' : '评论') + '</p>'
    + '<div class="field"><label>举报理由</label><textarea class="textarea" id="report-reason" rows="3" placeholder="请说明举报原因，例如：广告推广、人身攻击、不实信息"></textarea></div>'
    + '<p class="hint">管理员核实后，可对违规用户进行警告、禁止发帖或封禁账号处理。</p>'
    + '<p class="form-error">' + esc(m.error || '') + '</p></div>';
  const foot = '<div class="modal-foot"><button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" data-action="report-submit">提交举报</button></div>';
  return modalShell('举报内容', body + foot);
}

function modalPassword(m) {
  const body = '<div class="modal-body">'
    + '<p class="section-hint">超级管理员首次登录必须修改初始密码，修改后才能进入管理后台。</p>'
    + '<div class="field"><label>新密码（至少 6 位）</label><input id="pwd-new" type="password"></div>'
    + '<div class="field"><label>确认新密码</label><input id="pwd-confirm" type="password"></div>'
    + '<p class="form-error">' + esc(m.error || '') + '</p></div>';
  const foot = '<div class="modal-foot"><button class="btn btn-primary" data-action="password-submit">保存并进入后台</button></div>';
  return modalShell('修改管理员密码', body + foot);
}

function renderModal() {
  const root = document.getElementById('modal-root');
  if (!root) return;
  const m = ui.modal;
  if (!m) { root.innerHTML = ''; return; }
  if (m.kind === 'booking') root.innerHTML = modalBooking(m);
  else if (m.kind === 'booking-detail') root.innerHTML = modalBookingDetail(m);
  else if (m.kind === 'team-create') root.innerHTML = modalTeamCreate(m);
  else if (m.kind === 'team-manage') root.innerHTML = modalTeamManage(m);
  else if (m.kind === 'report') root.innerHTML = modalReport(m);
  else if (m.kind === 'password') root.innerHTML = modalPassword(m);
}

const Views = {
  login: viewLogin,
  book: viewBook,
  teams: viewTeams,
  forum: viewForum,
  me: viewMe,
  admin: viewAdmin,
};
