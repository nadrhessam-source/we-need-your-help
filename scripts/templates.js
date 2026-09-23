/* ============================================================
   WE NEED YOUR HELP — Content Templates
   قالب‌های متنی برای تولید پست‌های روزانه
   بدون AI، بدون API — فقط template + آمار واقعی
   ============================================================ */

function formatMoney(n) {
    return "$" + (Math.round(n * 100) / 100).toFixed(2);
}

/**
 * هر template یک تابع هست که report رو می‌گیره و string برمی‌گردونه.
 * اگه شرطش برقرار نباشه، null برمی‌گردونه.
 */

const TEMPLATES = [

    // ---------- Milestone ----------
    {
        name: "milestone",
        event: "milestone",
        generate: function (r) {
            if (!r.newMilestone) return null;
            const amount = formatMoney(r.newMilestone.amount);
            return [
                "WE DID IT.",
                "",
                "The internet just gave us " + amount + ".",
                "",
                "We asked for absolutely no reason.",
                "",
                "Somehow, you said yes.",
                "",
                "Total: " + formatMoney(r.allTime.totalRaised),
                "",
                "[WEBSITE]"
            ].join("\n");
        }
    },

    // ---------- Huge donation ----------
    {
        name: "huge_donation",
        event: "huge_donation",
        generate: function (r) {
            if (r.events.indexOf("huge_donation") === -1) return null;
            const top = r.yesterday.donations[0];
            const amount = formatMoney(top ? top.amount : r.yesterday.largest);
            return [
                "DAY " + r.allTime.daysSinceLaunch,
                "",
                "Someone just gave us " + amount + ".",
                "",
                "We genuinely don't know what to say.",
                "",
                "Total raised: " + formatMoney(r.allTime.totalRaised),
                "",
                "This experiment is getting weird.",
                "",
                "[WEBSITE]"
            ].join("\n");
        }
    },

    // ---------- Big donation (100-999) ----------
    {
        name: "big_donation",
        event: "big_donation",
        generate: function (r) {
            if (r.events.indexOf("big_donation") === -1) return null;
            const top = r.yesterday.donations[0];
            const amount = formatMoney(top ? top.amount : r.yesterday.largest);
            return [
                "DAY " + r.allTime.daysSinceLaunch,
                "",
                "Someone gave us " + amount + " yesterday.",
                "",
                "We have questions.",
                "",
                "Total: " + formatMoney(r.allTime.totalRaised),
                "",
                "[WEBSITE]"
            ].join("\n");
        }
    },

    // ---------- Record day ----------
    {
        name: "record_day",
        event: "record_day",
        generate: function (r) {
            if (r.events.indexOf("record_day") === -1) return null;
            return [
                "DAY " + r.allTime.daysSinceLaunch,
                "",
                "Yesterday was our best day ever.",
                "",
                r.yesterday.count + " strangers gave us " +
                    formatMoney(r.yesterday.total) + ".",
                "",
                "That's a new record.",
                "",
                "Total: " + formatMoney(r.allTime.totalRaised),
                "",
                "[WEBSITE]"
            ].join("\n");
        }
    },

    // ---------- Zero day (nobody helped) ----------
    {
        name: "zero_day",
        event: "zero_day",
        generate: function (r) {
            if (r.events.indexOf("zero_day") === -1) return null;
            const variants = [
                "This is getting embarrassing.",
                "We're not mad. Just disappointed.",
                "Maybe tomorrow.",
                "Hello? Anyone?",
                "We're still here."
            ];
            const closing = variants[r.allTime.daysSinceLaunch % variants.length];
            return [
                "DAY " + r.allTime.daysSinceLaunch,
                "",
                "Nobody helped us yesterday.",
                "",
                "$0 raised.",
                "",
                "Total: " + formatMoney(r.allTime.totalRaised),
                "",
                closing,
                "",
                "Please help us.",
                "",
                "[WEBSITE]"
            ].join("\n");
        }
    },

    // ---------- Small day (less than $10) ----------
    {
        name: "small_day",
        event: "small_day",
        generate: function (r) {
            if (r.events.indexOf("small_day") === -1) return null;
            return [
                "DAY " + r.allTime.daysSinceLaunch,
                "",
                r.yesterday.count + " " +
                    (r.yesterday.count === 1 ? "person" : "people") +
                    " helped us yesterday.",
                "",
                "They gave us " + formatMoney(r.yesterday.total) + ".",
                "",
                "Retirement is getting closer.",
                "",
                "Total: " + formatMoney(r.allTime.totalRaised),
                "",
                "[WEBSITE]"
            ].join("\n");
        }
    },

    // ---------- Normal day (10-99) ----------
    {
        name: "normal_day",
        event: "normal_day",
        generate: function (r) {
            if (r.events.indexOf("normal_day") === -1) return null;
            return [
                "DAY " + r.allTime.daysSinceLaunch,
                "",
                r.yesterday.count + " strangers helped us yesterday.",
                "",
                "They gave us " + formatMoney(r.yesterday.total) + ".",
                "",
                "Total: " + formatMoney(r.allTime.totalRaised),
                "",
                "We still don't understand why.",
                "",
                "Please help us.",
                "",
                "[WEBSITE]"
            ].join("\n");
        }
    },

    // ---------- First donation ----------
    {
        name: "first_donation",
        event: "first_donation",
        generate: function (r) {
            if (r.events.indexOf("first_donation") === -1) return null;
            return [
                "DAY " + r.allTime.daysSinceLaunch,
                "",
                "Someone actually helped us.",
                "",
                "We asked for no reason.",
                "",
                "They gave us " + formatMoney(r.allTime.totalRaised) + ".",
                "",
                "This is happening.",
                "",
                "[WEBSITE]"
            ].join("\n");
        }
    },

    // ---------- Fallback: daily update ----------
    {
        name: "fallback",
        event: null,
        generate: function (r) {
            return [
                "DAY " + r.allTime.daysSinceLaunch,
                "",
                "Total raised: " + formatMoney(r.allTime.totalRaised),
                "",
                "People who helped: " + r.allTime.totalDonors,
                "",
                "We still don't know why anyone does this.",
                "",
                "Please help us.",
                "",
                "[WEBSITE]"
            ].join("\n");
        }
    }
];

/**
 * انتخاب template بر اساس event های موجود در report
 * ترتیب اهمیت: milestone > huge > big > record > first > zero > small > normal > fallback
 */
function selectTemplate(report) {
    const priority = [
        "milestone",
        "huge_donation",
        "big_donation",
        "record_day",
        "first_donation",
        "zero_day",
        "small_day",
        "normal_day",
        "fallback"
    ];

    for (const name of priority) {
        const tpl = TEMPLATES.find((t) => t.name === name);
        if (!tpl) continue;
        const out = tpl.generate(report);
        if (out) return { name: tpl.name, text: out };
    }
    return null;
}

module.exports = {
    TEMPLATES,
    selectTemplate,
    formatMoney
};
