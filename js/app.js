/* ===== 粉粉提醒 - 应用核心逻辑 ===== */
/* 提醒事项管理、本地存储、通知提醒 */

const App = {
    // 数据存储
    reminders: [],
    settings: {
        sound: true,
        vibrate: true,
    },
    currentPage: 'home',
    currentFilter: 'all',
    selectedIcon: '💧',
    selectedRepeat: 'daily',
    selectedWeekdays: [],
    countdownTimer: null,
    checkTimer: null,
    modalCallback: null,
    notifiedToday: {}, // 记录今天已通知的事项 {id_date: true}

    // ===== 初始化 =====
    init() {
        this.loadData();
        this.bindEvents();
        this.updateDate();
        this.updateGreeting();
        this.checkNotificationPermission();
        this.renderAll();
        this.startCountdown();
        this.startCheckLoop();
    },

    // ===== 数据存储 =====
    loadData() {
        try {
            const data = localStorage.getItem('pinkyReminders');
            if (data) this.reminders = JSON.parse(data);
            const settings = localStorage.getItem('pinkySettings');
            if (settings) this.settings = { ...this.settings, ...JSON.parse(settings) };
        } catch (e) {
            console.error('加载数据失败', e);
            this.reminders = [];
        }
    },

    saveData() {
        localStorage.setItem('pinkyReminders', JSON.stringify(this.reminders));
        localStorage.setItem('pinkySettings', JSON.stringify(this.settings));
    },

    // ===== 事件绑定 =====
    bindEvents() {
        // 表单提交
        document.getElementById('reminderForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveReminder();
        });

        // 图标选择
        document.getElementById('iconPicker').addEventListener('click', (e) => {
            const btn = e.target.closest('.icon-option');
            if (!btn) return;
            document.querySelectorAll('.icon-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.selectedIcon = btn.dataset.icon;
        });

        // 重复频率选择
        document.querySelector('.repeat-options').addEventListener('click', (e) => {
            const btn = e.target.closest('.repeat-option');
            if (!btn) return;
            document.querySelectorAll('.repeat-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.selectedRepeat = btn.dataset.repeat;
            // 显示星期选择（仅自定义时）
            const weekdayGroup = document.getElementById('weekdayGroup');
            weekdayGroup.classList.toggle('hidden', this.selectedRepeat !== 'weekday');
        });

        // 星期选择
        document.querySelector('.weekday-picker').addEventListener('click', (e) => {
            const btn = e.target.closest('.weekday-option');
            if (!btn) return;
            btn.classList.toggle('active');
            const day = parseInt(btn.dataset.day);
            if (btn.classList.contains('active')) {
                if (!this.selectedWeekdays.includes(day)) this.selectedWeekdays.push(day);
            } else {
                this.selectedWeekdays = this.selectedWeekdays.filter(d => d !== day);
            }
        });

        // 筛选标签
        document.querySelector('.filter-tabs').addEventListener('click', (e) => {
            const tab = e.target.closest('.filter-tab');
            if (!tab) return;
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            this.currentFilter = tab.dataset.filter;
            this.renderAllList();
        });

        // 设置开关
        document.getElementById('soundToggle').addEventListener('change', (e) => {
            this.settings.sound = e.target.checked;
            this.saveData();
        });
        document.getElementById('vibrateToggle').addEventListener('change', (e) => {
            this.settings.vibrate = e.target.checked;
            this.saveData();
        });

        // 底部导航高亮
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });
    },

    // ===== 页面导航 =====
    goTo(page) {
        // 隐藏所有页面
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        // 显示目标页面
        document.getElementById('page-' + page).classList.add('active');

        this.currentPage = page;
        this.scrollTop();

        // 更新导航高亮
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        const navMap = { home: 'home', list: 'list', settings: 'settings' };
        if (navMap[page]) {
            const navItem = document.querySelector(`.nav-item[data-page="${navMap[page]}"]`);
            if (navItem) navItem.classList.add('active');
        }

        // 页面特定渲染
        if (page === 'home') this.renderHome();
        if (page === 'list') this.renderAllList();
        if (page === 'add') this.resetForm();
    },

    scrollTop() {
        document.getElementById('mainContent').scrollTop = 0;
    },

    // ===== 表单处理 =====
    resetForm() {
        document.getElementById('reminderForm').reset();
        document.getElementById('editId').value = '';
        document.getElementById('addPageTitle').textContent = '添加提醒';
        document.getElementById('submitBtn').innerHTML = '<span>💾 保存提醒</span>';
        this.selectedIcon = '💧';
        this.selectedRepeat = 'daily';
        this.selectedWeekdays = [];
        document.querySelectorAll('.icon-option').forEach((b, i) => {
            b.classList.toggle('active', i === 0);
        });
        document.querySelectorAll('.repeat-option').forEach(b => {
            b.classList.toggle('active', b.dataset.repeat === 'daily');
        });
        document.querySelectorAll('.weekday-option').forEach(b => b.classList.remove('active'));
        document.getElementById('weekdayGroup').classList.add('hidden');
        // 设置默认时间为当前时间+1小时
        const now = new Date();
        now.setHours(now.getHours() + 1, 0, 0, 0);
        document.getElementById('reminderTime').value =
            String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    },

    editReminder(id) {
        const r = this.reminders.find(x => x.id === id);
        if (!r) return;
        this.goTo('add');
        document.getElementById('addPageTitle').textContent = '编辑提醒';
        document.getElementById('submitBtn').innerHTML = '<span>💾 保存修改</span>';
        document.getElementById('editId').value = r.id;
        document.getElementById('reminderName').value = r.name;
        document.getElementById('reminderTime').value = r.time;
        document.getElementById('reminderAdvance').value = r.advance || 0;
        document.getElementById('reminderNote').value = r.note || '';

        this.selectedIcon = r.icon;
        this.selectedRepeat = r.repeat;
        this.selectedWeekdays = r.weekdays || [];

        document.querySelectorAll('.icon-option').forEach(b => {
            b.classList.toggle('active', b.dataset.icon === r.icon);
        });
        document.querySelectorAll('.repeat-option').forEach(b => {
            b.classList.toggle('active', b.dataset.repeat === r.repeat);
        });
        document.querySelectorAll('.weekday-option').forEach(b => {
            b.classList.toggle('active', this.selectedWeekdays.includes(parseInt(b.dataset.day)));
        });
        document.getElementById('weekdayGroup').classList.toggle('hidden', r.repeat !== 'weekday');
    },

    saveReminder() {
        const id = document.getElementById('editId').value;
        const name = document.getElementById('reminderName').value.trim();
        const time = document.getElementById('reminderTime').value;
        const advance = parseInt(document.getElementById('reminderAdvance').value);
        const note = document.getElementById('reminderNote').value.trim();

        if (!name || !time) {
            this.showToast('请填写事项名称和时间');
            return;
        }

        if (this.selectedRepeat === 'weekday' && this.selectedWeekdays.length === 0) {
            this.showToast('请至少选择一个星期');
            return;
        }

        if (id) {
            // 编辑
            const r = this.reminders.find(x => x.id == id);
            if (r) {
                r.name = name;
                r.icon = this.selectedIcon;
                r.time = time;
                r.repeat = this.selectedRepeat;
                r.weekdays = [...this.selectedWeekdays];
                r.advance = advance;
                r.note = note;
            }
            this.showToast('修改成功 ✨');
        } else {
            // 新增
            const newReminder = {
                id: Date.now(),
                name,
                icon: this.selectedIcon,
                time,
                repeat: this.selectedRepeat,
                weekdays: [...this.selectedWeekdays],
                advance,
                note,
                enabled: true,
                createdAt: Date.now(),
            };
            this.reminders.push(newReminder);
            this.showToast('添加成功 🌸');
        }

        this.saveData();
        this.renderAll();
        setTimeout(() => this.goTo('home'), 600);
    },

    // ===== 删除/切换 =====
    async deleteReminder(id) {
        const r = this.reminders.find(x => x.id === id);
        if (!r) return;
        const ok = await this.showConfirm('删除提醒', `确定要删除「${r.name}」吗？此操作不可撤销。`);
        if (ok) {
            this.reminders = this.reminders.filter(x => x.id !== id);
            this.saveData();
            this.renderAll();
            this.showToast('已删除');
        }
    },

    toggleReminder(id) {
        const r = this.reminders.find(x => x.id === id);
        if (!r) return;
        r.enabled = !r.enabled;
        this.saveData();
        this.renderAll();
    },

    toggleDone(id) {
        const r = this.reminders.find(x => x.id === id);
        if (!r) return;
        const todayKey = this.getTodayKey();
        if (!r.doneDates) r.doneDates = [];
        const idx = r.doneDates.indexOf(todayKey);
        if (idx > -1) {
            r.doneDates.splice(idx, 1);
        } else {
            r.doneDates.push(todayKey);
        }
        this.saveData();
        this.renderHome();
    },

    // ===== 渲染 =====
    renderAll() {
        this.renderHome();
        this.renderAllList();
    },

    renderHome() {
        const todayList = document.getElementById('todayList');
        const todayReminders = this.getTodayReminders();
        const activeToday = todayReminders.filter(r => r.enabled);

        // 倒计时卡片
        this.updateCountdown();

        // 统计
        document.getElementById('todayTotal').textContent = activeToday.length;
        document.getElementById('todayDone').textContent = activeToday.filter(r => this.isDoneToday(r)).length;
        document.getElementById('totalReminders').textContent = this.reminders.length;

        // 今日列表
        if (todayReminders.length === 0) {
            todayList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🌸</div>
                    <p>今天还没有提醒事项</p>
                    <button class="btn-primary" onclick="App.goTo('add')">添加第一个提醒</button>
                </div>`;
            return;
        }

        // 按时间排序
        todayReminders.sort((a, b) => a.time.localeCompare(b.time));

        todayList.innerHTML = todayReminders.map(r => this.reminderItemHTML(r, true)).join('');
    },

    renderAllList() {
        const allList = document.getElementById('allList');
        let list = [...this.reminders];

        // 筛选
        if (this.currentFilter === 'active') {
            list = list.filter(r => r.enabled);
        } else if (this.currentFilter === 'disabled') {
            list = list.filter(r => !r.enabled);
        }

        // 按时间排序
        list.sort((a, b) => a.time.localeCompare(b.time));

        if (list.length === 0) {
            allList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <p>${this.currentFilter === 'all' ? '还没有任何提醒事项' : '没有相关事项'}</p>
                </div>`;
            return;
        }

        allList.innerHTML = list.map(r => this.reminderItemHTML(r, false)).join('');
    },

    reminderItemHTML(r, isToday) {
        const done = this.isDoneToday(r);
        const repeatText = this.getRepeatText(r);
        const advanceText = r.advance > 0 ? ` · 提前${r.advance}分` : '';
        return `
            <div class="reminder-item ${!r.enabled ? 'disabled' : ''} ${done ? 'done' : ''}">
                <div class="reminder-icon">${r.icon}</div>
                <div class="reminder-info" onclick="App.editReminder(${r.id})">
                    <div class="reminder-name">${this.escape(r.name)}</div>
                    <div class="reminder-time">⏰ ${r.time}</div>
                    <div class="reminder-meta">${repeatText}${advanceText}${r.note ? ' · ' + this.escape(r.note) : ''}</div>
                </div>
                <div class="reminder-actions">
                    ${isToday ? `<button class="reminder-check ${done ? 'done' : ''}" onclick="App.toggleDone(${r.id})">${done ? '✓' : ''}</button>` : ''}
                    <button class="reminder-toggle ${r.enabled ? 'on' : ''}" onclick="App.toggleReminder(${r.id})"></button>
                    <button class="reminder-check" style="border-color:var(--danger);color:var(--danger)" onclick="App.deleteReminder(${r.id})">🗑</button>
                </div>
            </div>`;
    },

    // ===== 倒计时 =====
    updateCountdown() {
        const next = this.getNextReminder();
        const card = document.getElementById('nextReminderCard');
        const timeEl = document.getElementById('countdownTime');
        const titleEl = document.getElementById('countdownTitle');
        const progressEl = document.getElementById('countdownProgress');

        if (!next) {
            timeEl.textContent = '--:--:--';
            titleEl.textContent = '今天没有更多提醒了~';
            progressEl.style.width = '0%';
            return;
        }

        const now = new Date();
        const target = new Date();
        const [h, m] = next.time.split(':');
        target.setHours(parseInt(h), parseInt(m), 0, 0);

        const diff = target - now;
        if (diff <= 0) {
            timeEl.textContent = '该做啦！';
            titleEl.textContent = `${next.icon} ${next.name}`;
            progressEl.style.width = '100%';
            return;
        }

        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        timeEl.textContent =
            String(hours).padStart(2, '0') + ':' +
            String(minutes).padStart(2, '0') + ':' +
            String(seconds).padStart(2, '0');
        titleEl.textContent = `${next.icon} ${next.name} · ${next.time}`;

        // 进度条（基于一天的比例，简化处理）
        const totalSec = hours * 3600 + minutes * 60 + seconds;
        const maxSec = 86400; // 24小时
        progressEl.style.width = Math.max(5, (1 - totalSec / maxSec) * 100) + '%';
    },

    startCountdown() {
        if (this.countdownTimer) clearInterval(this.countdownTimer);
        this.updateCountdown();
        this.countdownTimer = setInterval(() => this.updateCountdown(), 1000);
    },

    // ===== 提醒检查循环 =====
    startCheckLoop() {
        if (this.checkTimer) clearInterval(this.checkTimer);
        this.checkReminders();
        this.checkTimer = setInterval(() => this.checkReminders(), 10000); // 每10秒检查
    },

    checkReminders() {
        const now = new Date();
        const currentTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        const todayKey = this.getTodayKey();
        const weekday = now.getDay();

        this.reminders.forEach(r => {
            if (!r.enabled) return;
            if (!this.shouldRemindToday(r, weekday)) return;

            // 检查提醒时间（含提前量）
            const remindTime = this.getRemindTime(r);
            if (remindTime === currentTime) {
                const notifyKey = r.id + '_' + todayKey + '_' + remindTime;
                if (!this.notifiedToday[notifyKey]) {
                    this.notifiedToday[notifyKey] = true;
                    this.fireNotification(r);
                }
            }
        });
    },

    fireNotification(r) {
        const title = `${r.icon} ${r.name}`;
        const body = r.note ? r.note : `该${r.name}啦~`;

        // 浏览器通知
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                const notif = new Notification(title, {
                    body,
                    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">' + r.icon + '</text></svg>',
                    tag: String(r.id),
                    requireInteraction: true,
                });
                notif.onclick = () => {
                    window.focus();
                    this.goTo('home');
                    notif.close();
                };
            } catch (e) {
                console.error('通知发送失败', e);
            }
        }

        // 页内Toast提醒（即使没开通知也能看到）
        this.showToast(`🔔 ${r.name} - ${body}`, 5000);

        // 声音提醒
        if (this.settings.sound) this.playSound();

        // 震动
        if (this.settings.vibrate && 'vibrate' in navigator) {
            navigator.vibrate([200, 100, 200, 100, 400]);
        }
    },

    playSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = freq;
                osc.type = 'sine';
                const t = ctx.currentTime + i * 0.2;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
                osc.start(t);
                osc.stop(t + 0.3);
            });
        } catch (e) {
            console.error('声音播放失败', e);
        }
    },

    // ===== 通知权限 =====
    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            this.showToast('您的设备不支持通知功能');
            return;
        }
        if (Notification.permission === 'granted') {
            this.showToast('通知已开启 ✓');
            this.updateNotifStatus();
            return;
        }
        const result = await Notification.requestPermission();
        if (result === 'granted') {
            this.showToast('通知开启成功 🎉');
        } else {
            this.showToast('未开启通知，仅页内提醒');
        }
        this.updateNotifStatus();
    },

    checkNotificationPermission() {
        this.updateNotifStatus();
        if ('Notification' in window && Notification.permission === 'default') {
            // 不自动请求，等用户点击
        }
    },

    updateNotifStatus() {
        const el = document.getElementById('notifStatus');
        if (!el) return;
        if (!('Notification' in window)) {
            el.textContent = '设备不支持通知';
        } else if (Notification.permission === 'granted') {
            el.textContent = '已开启 ✓';
        } else if (Notification.permission === 'denied') {
            el.textContent = '已被拒绝，请在浏览器设置中开启';
        } else {
            el.textContent = '点击开启通知提醒';
        }
    },

    testNotification() {
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification('🍑 粉粉提醒', {
                    body: '这是一条测试提醒~ 通知功能正常工作！',
                    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🍑</text></svg>',
                });
            } catch (e) {
                this.showToast('测试通知发送失败');
            }
        } else {
            this.showToast('请先开启通知权限');
            this.requestNotificationPermission();
            return;
        }
        this.showToast('已发送测试通知 📩');
        if (this.settings.vibrate && 'vibrate' in navigator) navigator.vibrate(200);
    },

    // ===== 数据导入导出 =====
    exportData() {
        const data = {
            reminders: this.reminders,
            settings: this.settings,
            exportDate: new Date().toISOString(),
            version: '1.0',
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pinky-backup-${this.getTodayKey()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('数据已导出 📤');
    },

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (data.reminders) {
                        this.reminders = data.reminders;
                    }
                    if (data.settings) {
                        this.settings = { ...this.settings, ...data.settings };
                    }
                    this.saveData();
                    this.renderAll();
                    this.showToast('导入成功 📥');
                } catch (err) {
                    this.showToast('文件格式错误');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    },

    // ===== 辅助方法 =====
    getTodayKey() {
        const d = new Date();
        return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    },

    isDoneToday(r) {
        return r.doneDates && r.doneDates.includes(this.getTodayKey());
    },

    getTodayReminders() {
        const weekday = new Date().getDay();
        return this.reminders.filter(r => this.shouldRemindToday(r, weekday));
    },

    shouldRemindToday(r, weekday) {
        if (r.repeat === 'daily') return true;
        if (r.repeat === 'once') {
            // 仅一次：检查是否是创建当天（简化处理，实际应记录日期）
            const created = new Date(r.createdAt);
            const today = new Date();
            return created.toDateString() === today.toDateString();
        }
        if (r.repeat === 'weekday') {
            return r.weekdays && r.weekdays.includes(weekday);
        }
        if (r.repeat === 'weekend') {
            return weekday === 0 || weekday === 6;
        }
        return true;
    },

    getNextReminder() {
        const now = new Date();
        const currentTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        const weekday = now.getDay();
        const todayList = this.getTodayReminders().filter(r => r.enabled && r.time > currentTime && !this.isDoneToday(r));
        todayList.sort((a, b) => a.time.localeCompare(b.time));
        return todayList[0] || null;
    },

    getRemindTime(r) {
        if (!r.advance || r.advance === 0) return r.time;
        const [h, m] = r.time.split(':').map(Number);
        let totalMin = h * 60 + m - r.advance;
        if (totalMin < 0) totalMin += 1440;
        const nh = Math.floor(totalMin / 60);
        const nm = totalMin % 60;
        return String(nh).padStart(2, '0') + ':' + String(nm).padStart(2, '0');
    },

    getRepeatText(r) {
        const map = { daily: '每天', weekday: '指定星期', weekend: '周末', once: '仅一次' };
        let text = map[r.repeat] || '每天';
        if (r.repeat === 'weekday' && r.weekdays && r.weekdays.length > 0) {
            const names = ['日', '一', '二', '三', '四', '五', '六'];
            text = '每周' + r.weekdays.sort().map(d => names[d]).join('、');
        }
        return text;
    },

    updateDate() {
        const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const d = new Date();
        const dateStr = `${d.getMonth() + 1}月${d.getDate()}日 ${days[d.getDay()]}`;
        document.getElementById('todayDate').textContent = dateStr;
    },

    updateGreeting() {
        const h = new Date().getHours();
        let greeting;
        if (h < 6) greeting = '夜深了，早点休息~';
        else if (h < 9) greeting = '早安！新的一天开始啦~';
        else if (h < 12) greeting = '上午好，记得喝水哦~';
        else if (h < 14) greeting = '中午好，好好吃饭~';
        else if (h < 18) greeting = '下午好，继续加油~';
        else if (h < 22) greeting = '晚上好，放松一下~';
        else greeting = '今天辛苦啦，晚安~';
        document.getElementById('greetingText').textContent = greeting;
    },

    // ===== Toast =====
    showToast(msg, duration = 2500) {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
    },

    // ===== 模态框 =====
    showConfirm(title, content) {
        return new Promise(resolve => {
            document.getElementById('modalTitle').textContent = title;
            document.getElementById('modalContent').textContent = content;
            document.getElementById('modalOverlay').classList.add('show');
            this.modalCallback = resolve;
        });
    },

    closeModal(result) {
        document.getElementById('modalOverlay').classList.remove('show');
        if (this.modalCallback) {
            this.modalCallback(result);
            this.modalCallback = null;
        }
    },

    escape(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
};

// 启动应用
document.addEventListener('DOMContentLoaded', () => App.init());

// Service Worker 注册
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.log('SW注册失败:', err));
    });
}
