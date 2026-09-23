/* ============================================================
   WE NEED YOUR HELP — Frontend Application Logic
   بدون هیچ فریم‌ورک — Vanilla JavaScript
   ============================================================ */

(function () {
    "use strict";

    // ============================================================
    // 1. Utility Functions — توابع کمکی
    // ============================================================

    function escapeHtml(str) {
        if (str === null || str === undefined) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function formatCurrency(amount) {
        const num = Number(amount) || 0;
        return "$" + num.toFixed(2);
    }

    function formatDate(dateStr) {
        if (!dateStr) return "—";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "—";
        const months = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];
        return months[d.getUTCMonth()] + " " + d.getUTCDate();
    }

    function shortenAddress(addr) {
        if (!addr || addr.length < 12) return addr || "";
        return addr.slice(0, 6) + "..." + addr.slice(-4);
    }

    function logError(label, err) {
        if (window.APP_CONFIG.DEBUG) {
            console.error("[WNYH] " + label + ":", err);
        }
    }

    function $(sel) {
        return document.querySelector(sel);
    }

    // ============================================================
    // 2. Connection Status — مدیریت وضعیت اتصال
    // ============================================================

    var connectionState = {
        failing: false,
        everConnected: false
    };

    function showConnectionBanner() {
        if (connectionState.failing) return;
        connectionState.failing = true;
        var dot = $("#connection-dot");
        if (dot) {
            dot.classList.remove("connected", "checking");
            dot.classList.add("disconnected");
            dot.title = "Cannot reach server — click to retry";
        }
    }

    function hideConnectionBanner() {
        if (!connectionState.failing) return;
        connectionState.failing = false;
        var dot = $("#connection-dot");
        if (dot) {
            dot.classList.remove("disconnected", "checking");
            dot.classList.add("connected");
            dot.title = "Connected to server";
        }
    }

    function reportNetworkSuccess() {
        connectionState.everConnected = true;
        hideConnectionBanner();
    }

    function reportNetworkFailure() {
        showConnectionBanner();
    }

    // ============================================================
    // 3. API Fetch — فراخوانی API با مدیریت خطا
    // ============================================================

    async function apiFetch(path, options) {
        const url = window.APP_CONFIG.API_BASE_URL.replace(/\/$/, "") + path;
        const opts = options || {};
        opts.headers = Object.assign(
            { "Accept": "application/json" },
            opts.headers || {}
        );
        if (opts.body && typeof opts.body === "object") {
            opts.headers["Content-Type"] = "application/json";
            opts.body = JSON.stringify(opts.body);
        }

        let res;
        try {
            res = await fetch(url, opts);
        } catch (netErr) {
            reportNetworkFailure();
            throw netErr;
        }

        reportNetworkSuccess();

        let data = null;
        try {
            data = await res.json();
        } catch (_) {
            data = null;
        }
        if (!res.ok) {
            const msg = (data && data.error) || ("HTTP " + res.status);
            throw new Error(msg);
        }
        return data;
    }

    // ============================================================
    // 4. Stats Section — بخش آمار
    // ============================================================

    async function loadStats() {
        const totalEl = $("#stat-total");
        const donorsEl = $("#stat-donors");
        const daysEl = $("#stat-days");

        try {
            const data = await apiFetch("/api/stats");
            if (totalEl) totalEl.textContent = formatCurrency(data.totalRaised);
            if (donorsEl) donorsEl.textContent = String(data.totalDonors || 0);
            if (daysEl) daysEl.textContent = "Day " + (data.daysSinceLaunch || 0);
        } catch (err) {
            logError("loadStats", err);
            // فقط اگه هنوز هیچ داده‌ای نگرفتیم، جایگزین کن
            if (!connectionState.everConnected) {
                if (totalEl) totalEl.textContent = "—";
                if (donorsEl) donorsEl.textContent = "—";
                if (daysEl) daysEl.textContent = "Day —";
            }
        }
    }

    // ============================================================
    // 5. Milestones Section — نقاط عطف
    // ============================================================

    var DEFAULT_MILESTONES = [10, 100, 1000, 10000, 100000, 1000000];

    function renderMilestoneList(items) {
        const list = $("#milestone-list");
        if (!list) return;

        if (!items || !items.length) {
            list.innerHTML = DEFAULT_MILESTONES.map(function (amt) {
                return '<li class="milestone-item pending">□ ' +
                    formatCurrency(amt) + "</li>";
            }).join("");
            return;
        }

        list.innerHTML = items.map(function (m) {
            const reached = m.reached ? " reached" : " pending";
            const mark = m.reached ? "✓ " : "□ ";
            return (
                '<li class="milestone-item' + reached + '">' +
                mark + formatCurrency(m.amount) +
                "</li>"
            );
        }).join("");
    }

    async function loadMilestones() {
        try {
            const items = await apiFetch("/api/milestones");
            renderMilestoneList(items);
        } catch (err) {
            logError("loadMilestones", err);
            renderMilestoneList(DEFAULT_MILESTONES.map(function (amt) {
                return { amount: amt, reached: false };
            }));
        }
    }

    // ============================================================
    // 6. Leaderboard Section — سه نفر برتر
    // ============================================================

    function renderLeaderboard(items) {
        const list = $("#leaderboard-list");
        if (!list) return;

        if (!items || !items.length) {
            list.innerHTML = '<li class="leaderboard-item"><span class="name">No helpers yet — be the first.</span></li>';
            return;
        }

        list.innerHTML = items.map(function (row) {
            return (
                '<li class="leaderboard-item">' +
                '<span class="name">' + escapeHtml(row.name || "Anonymous") + "</span>" +
                '<span class="amount">' + formatCurrency(row.total) + "</span>" +
                "</li>"
            );
        }).join("");
    }

    async function loadLeaderboard() {
        const list = $("#leaderboard-list");
        try {
            const items = await apiFetch("/api/donations/leaderboard");
            renderLeaderboard(items);
        } catch (err) {
            logError("loadLeaderboard", err);
            if (list && !connectionState.everConnected) {
                list.innerHTML = '<li class="leaderboard-item"><span class="name">Cannot load leaderboard. Please refresh.</span></li>';
            }
        }
    }

    // ============================================================
    // 7. Recent Helpers Table — جدول کمک‌های اخیر
    // ============================================================

    function renderRecentDonations(items) {
        const tbody = $("#recent-list");
        if (!tbody) return;

        if (!items || !items.length) {
            tbody.innerHTML =
                '<tr class="empty-row"><td colspan="5">' +
                "No verified contributions yet. Be the first to help." +
                "</td></tr>";
            return;
        }

        tbody.innerHTML = items.map(function (d) {
            const name = escapeHtml(d.name || "Anonymous");
            const msg = escapeHtml(d.message || "");
            const amount = formatCurrency(d.amount);
            const network = escapeHtml(
                window.APP_CONFIG.NETWORK_DISPLAY_NAMES[d.network] || d.network
            );
            const date = formatDate(d.date);

            return (
                "<tr>" +
                "<td>" + name + "</td>" +
                "<td>" + msg + "</td>" +
                '<td class="amount-col">' + amount + "</td>" +
                "<td>" + network + "</td>" +
                "<td>" + date + "</td>" +
                "</tr>"
            );
        }).join("");
    }

    async function loadRecentDonations() {
        const tbody = $("#recent-list");
        try {
            const items = await apiFetch("/api/donations/recent");
            renderRecentDonations(items);
        } catch (err) {
            logError("loadRecentDonations", err);
            if (tbody && !connectionState.everConnected) {
                tbody.innerHTML =
                    '<tr class="empty-row"><td colspan="5">' +
                    "Cannot load contributions. Check your connection." +
                    "</td></tr>";
            }
        }
    }

    // ============================================================
    // 8. Donation Form — فرم کمک کردن
    // ============================================================

    var currentPayment = {
        requestId: null,
        pollTimer: null,
        pollStartedAt: 0
    };

    function validateForm(form) {
        var name = (form.name.value || "").trim().slice(0, 40);
        var message = (form.message.value || "").trim().slice(0, 120);
        var amountRaw = form.amount.value;
        var amount = parseFloat(amountRaw);
        var network = form.network.value;
        var publicName = $("#public-name").checked;
        var publicLeaderboard = $("#public-leaderboard").checked;

        if (!amountRaw || isNaN(amount)) {
            return { ok: false, error: "Please enter a valid amount." };
        }
        if (amount < window.APP_CONFIG.MIN_AMOUNT) {
            return {
                ok: false,
                error: "Minimum amount is $" + window.APP_CONFIG.MIN_AMOUNT + "."
            };
        }
        if (amount > window.APP_CONFIG.MAX_AMOUNT) {
            return {
                ok: false,
                error: "Maximum amount is $" + window.APP_CONFIG.MAX_AMOUNT + "."
            };
        }
        if (!network) {
            return { ok: false, error: "Please select a network." };
        }

        return {
            ok: true,
            data: {
                name: name,
                message: message,
                amount: amount,
                network: network,
                publicName: publicName,
                publicLeaderboard: publicLeaderboard
            }
        };
    }

    function showFormError(msg) {
        var form = $("#donation-form");
        if (!form) return;
        var old = form.querySelector(".form-error");
        if (old) old.remove();

        var el = document.createElement("div");
        el.className = "form-error";
        el.style.cssText =
            "padding:10px 14px;background:rgba(255,77,77,0.1);" +
            "border:1px solid #ff4d4d;border-radius:6px;color:#ff8a8a;" +
            "font-size:0.9rem;margin-bottom:8px;";
        el.textContent = msg;
        form.insertBefore(el, form.firstChild);

        setTimeout(function () {
            if (el.parentNode) el.remove();
        }, 6000);
    }

    function showPaymentPanel(payment) {
        var panel = $("#payment-panel");
        if (!panel) return;

        $("#pay-amount").textContent = formatCurrency(payment.amount);
        $("#pay-token").textContent = payment.token || "USDT";
        $("#pay-address").textContent = payment.destination;
        $("#pay-network-name").textContent =
            window.APP_CONFIG.NETWORK_DISPLAY_NAMES[payment.network] || payment.network;
        $("#pay-status").textContent = "Waiting for payment...";

        panel.classList.remove("hidden");
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function setupCopyButton() {
        var btn = $("#btn-copy-address");
        if (!btn) return;

        btn.addEventListener("click", async function () {
            var addr = $("#pay-address").textContent;
            try {
                await navigator.clipboard.writeText(addr);
                var original = btn.textContent;
                btn.textContent = "Copied!";
                setTimeout(function () {
                    btn.textContent = original;
                }, 1500);
            } catch (err) {
                var ta = document.createElement("textarea");
                ta.value = addr;
                document.body.appendChild(ta);
                ta.select();
                try {
                    document.execCommand("copy");
                    btn.textContent = "Copied!";
                    setTimeout(function () { btn.textContent = "Copy Address"; }, 1500);
                } catch (_) {
                    logError("copy", _);
                }
                document.body.removeChild(ta);
            }
        });
    }

    function startPaymentPolling(requestId) {
        stopPaymentPolling();

        currentPayment.requestId = requestId;
        currentPayment.pollStartedAt = Date.now();

        var tick = async function () {
            if (Date.now() - currentPayment.pollStartedAt >
                window.APP_CONFIG.PAYMENT_POLL_TIMEOUT_MS) {
                stopPaymentPolling();
                var statusEl = $("#pay-status");
                if (statusEl) {
                    statusEl.textContent =
                        "Still waiting. Refresh the page when you've paid.";
                }
                return;
            }

            try {
                var data = await apiFetch(
                    "/api/payment/status/" + encodeURIComponent(requestId)
                );

                if (data.status === "CONFIRMED" && data.donationId) {
                    stopPaymentPolling();
                    window.location.href =
                        window.APP_CONFIG.THANKYOU_PATH +
                        "?id=" + encodeURIComponent(data.donationId);
                    return;
                }

                if (data.status === "MANUAL_REVIEW") {
                    stopPaymentPolling();
                    var el = $("#pay-status");
                    if (el) {
                        el.textContent =
                            "We received a payment but couldn't match it automatically. " +
                            "It will be reviewed manually.";
                    }
                    return;
                }

                if (data.status === "EXPIRED") {
                    stopPaymentPolling();
                    var el2 = $("#pay-status");
                    if (el2) el2.textContent = "This payment request has expired.";
                    return;
                }
            } catch (err) {
                logError("poll", err);
            }

            currentPayment.pollTimer = setTimeout(
                tick,
                window.APP_CONFIG.PAYMENT_POLL_INTERVAL_MS
            );
        };

        currentPayment.pollTimer = setTimeout(tick, 5000);
    }

    function stopPaymentPolling() {
        if (currentPayment.pollTimer) {
            clearTimeout(currentPayment.pollTimer);
            currentPayment.pollTimer = null;
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();

        var form = e.target;
        var btn = $("#btn-help");
        var validation = validateForm(form);

        if (!validation.ok) {
            showFormError(validation.error);
            return;
        }

        btn.disabled = true;
        btn.textContent = "CREATING REQUEST...";

        try {
            var result = await apiFetch("/api/payment/create", {
                method: "POST",
                body: validation.data
            });

            form.classList.add("hidden");
            showPaymentPanel(result);
            startPaymentPolling(result.requestId);
        } catch (err) {
            logError("submit", err);
            showFormError(
                err.message || "Something went wrong. Please try again."
            );
            btn.disabled = false;
            btn.textContent = "HELP US";
        }
    }

    function setupDonationForm() {
        var form = $("#donation-form");
        if (!form) return;
        form.addEventListener("submit", handleFormSubmit);
        setupCopyButton();
    }

    // ============================================================
    // 9. Retry Logic — تلاش دوباره
    // ============================================================

    function retryAll() {
        loadStats();
        loadMilestones();
        loadLeaderboard();
        loadRecentDonations();
    }

    function setupRetryButton() {
        var dot = $("#connection-dot");
        if (!dot) return;
        dot.addEventListener("click", function () {
            if (!connectionState.failing) return;
            retryAll();
        });
    }

    // ============================================================
    // 10. Init — راه‌اندازی اولیه
    // ============================================================

    function setYear() {
        var el = $("#year");
        if (el) el.textContent = String(new Date().getFullYear());
    }

    function init() {
        setYear();
        setupDonationForm();
        setupRetryButton();

        retryAll();

        // رفرش آمار هر 60 ثانیه
        setInterval(function () {
            loadStats();
            loadRecentDonations();
            loadLeaderboard();
        }, 60000);

        // اگه ارتباط قطع بود، هر 30 ثانیه دوباره تلاش کن
        setInterval(function () {
            if (connectionState.failing) {
                retryAll();
            }
        }, 30000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
