/* ============================================================
   WE NEED YOUR HELP — Content Templates
   قالب‌های متنی برای تولید پست‌های روزانه
   بدون AI، بدون API — فقط template + آمار واقعی
   ============================================================ */

function formatMoney(n) {
    return "$" + (Math.round(n * 100) / 100).toFixed(2);
}

function networkName(key) {
    var map = {
        polygon: "Polygon",
        base: "Base",
        ethereum: "Ethereum",
        tron: "TRON"
    };
    return map[key] || key;
}

/**
 * هر template یک تابع هست که report رو می‌گیره و string برمی‌گردونه.
 * اگه شرطش برقرار نباشه، null برمی‌گردونه.
 */

var TEMPLATES = [

    // ============================================================
    // Special: هفته‌ی پروژه
    // ============================================================
    {
        name: "week_anniversary",
        event: "week_anniversary",
        generate: function (r) {
            if (r.events.indexOf("week_anniversary") === -1) return null;
            var week = Math.floor(r.allTime.daysSinceLaunch / 7);
            var variants = [
                "WEEK " + week + ".",
                "We've been doing this for " + week + " weeks.",
                "WEEK " + week + " OF THE EXPERIMENT."
            ];
            var opener = variants[week % variants.length];
            return [
                opener,
                "",
                "Total: " + formatMoney(r.allTime.totalRaised),
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
    },

    // ============================================================
    // Milestone: رسیدن به یه عدد
    // ============================================================
    {
        name: "milestone",
        event: "milestone",
        generate: function (r) {
            if (!r.newMilestone) return null;
            var amount = formatMoney(r.newMilestone.amount);
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

    // ============================================================
    // Donor milestone: تعداد کمک‌کننده‌ها
    // ============================================================
    {
        name: "donor_milestone",
        event: "donor_milestone",
        generate: function (r) {
            if (r.events.indexOf("donor_milestone") === -1) return null;

            // پیدا کردن کدوم threshold
            var thresholds = [10, 50, 100, 500, 1000, 5000];
            var reached = 0;
            for (var i = 0; i < thresholds.length; i++) {
                if (r.events.indexOf("donor_milestone_" + thresholds[i]) !== -1) {
                    reached = thresholds[i];
                    break;
                }
            }
            if (!reached) return null;

            var donorCount = r.allTime.totalDonors;

            if (reached === 10) {
                return [
                    "10 PEOPLE.",
                    "",
                    "Ten strangers have given us money.",
                    "",
                    "For no reason.",
                    "",
                    "Total: " + formatMoney(r.allTime.totalRaised),
                    "",
                    "[WEBSITE]"
                ].join("\n");
            }

            if (reached === 50) {
                return [
                    "50 HELPERS.",
                    "",
                    "Fifty people.",
                    "",
                    "We still don't know why.",
                    "",
                    "Total: " + formatMoney(r.allTime.totalRaised),
                    "",
                    "Please help us.",
                    "",
                    "[WEBSITE]"
                ].join("\n");
            }

            if (reached === 100) {
                return [
                    "100 PEOPLE.",
                    "",
                    "One hundred strangers gave us money.",
                    "",
                    "The internet is weird.",
                    "",
                    "Total: " + formatMoney(r.allTime.totalRaised),
                    "",
                    "[WEBSITE]"
                ].join("\n");
            }

            // برای بقیه
            return [
                donorCount + " PEOPLE.",
                "",
                "The internet keeps surprising us.",
                "",
                "Total: " + formatMoney(r.allTime.totalRaised),
                "",
                "[WEBSITE]"
            ].join("\n");
        }
    },

    // ============================================================
    // Network first: اولین donation در یه شبکه
    // ============================================================
    {
        name: "network_first",
        event: "network_first",
        generate: function (r) {
            if (r.events.indexOf("network_first") === -1) return null;

            var networks = ["polygon", "base", "ethereum", "tron"];
            var found = null;
            for (var i = 0; i < networks.length; i++) {
                if (r.events.indexOf("network_first_" + networks[i]) !== -1) {
                    found = networks[i];
                    break;
                }
            }
            if (!found) return null;

            var display = networkName(found);
            return [
                "First donation on " + display + ".",
                "",
                "Nice.",
                "",
                "Total: " + formatMoney(r.allTime.totalRaised),
                "",
                "We still don't understand any of this.",
                "",
                "[WEBSITE]"
            ].join("\n");
        }
    },

    // ============================================================
    // Huge donation: یه donation بزرگ ($1000+)
    // ============================================================
    {
        name: "huge_donation",
        event: "huge_donation",
        generate: function (r) {
            if (r.events.indexOf("huge_donation") === -1) return null;
            var top = r.yesterday.donations[0];
            var amount = formatMoney(top ? top.amount : r.yesterday.largest);
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

    // ============================================================
    // Big donation: $100-$999
    // ============================================================
    {
        name: "big_donation",
        event: "big_donation",
        generate: function (r) {
            if (r.events.indexOf("big_donation") === -1) return null;
            var top = r.yesterday.donations[0];
            var amount = formatMoney(top ? top.amount : r.yesterday.largest);
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

    // ============================================================
    // Huge day: دیروز $1000+
    // ============================================================
    {
        name: "huge_day",
        event: "huge_day",
        generate: function (r) {
            if (r.events.indexOf("huge_day") === -1) return null;
            return [
                "DAY " + r.allTime.daysSinceLaunch,
                "",
                "Yesterday was insane.",
                "",
                r.yesterday.count + " people gave us " +
                    formatMoney(r.yesterday.total) + " in one day.",
                "",
                "Total: " + formatMoney(r.allTime.totalRaised),
                "",
                "We are confused and grateful.",
                "",
                "[WEBSITE]"
            ].join("\n");
        }
    },

    // ============================================================
    // Big day: دیروز $100-$999
    // ============================================================
    {
        name: "big_day",
        event: "big_day",
        generate: function (r) {
            if (r.events.indexOf("big_day") === -1) return null;
            return [
                "DAY " + r.allTime.daysSinceLaunch,
                "",
                "Yesterday was actually decent.",
                "",
                r.yesterday.count + " people gave us " +
                    formatMoney(r.yesterday.total) + ".",
                "",
                "Total: " + formatMoney(r.allTime.totalRaised),
                "",
                "Keep going.",
                "",
                "[WEBSITE]"
            ].join("\n");
        }
    },

    // ============================================================
    // Record day: بهترین روز
    // ============================================================
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

    // ============================================================
    // First donation: اولین کمک
    // ============================================================
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

    // ============================================================
    // Repeat donor: کسی برگشت
    // ============================================================
    {
        name: "repeat_donor",
        event: "repeat_donor",
        generate: function (r) {
            if (r.events.indexOf("repeat_donor") === -1) return null;
            return [
                "DAY " + r.allTime.daysSinceLaunch,
                "",
                "Someone came back.",
                "",
                "They helped us twice.",
                "",
                "Why?",
                "",
                "Total: " + formatMoney(r.allTime.totalRaised),
                "",
                "[WEBSITE]"
            ].join("\n");
        }
    },

    // ============================================================
    // Lucky amount: مبلغ طنز
    // ============================================================
    {
        name: "lucky_amount",
        event: "lucky_amount",
        generate: function (r) {
            if (r.events.indexOf("lucky_amount") === -1) return null;

            var luckyCodes = ["7_77", "13_37", "42", "69", "420", "666", "777", "1337"];
            var luckyDisplay = {
                "7_77": "$7.77",
                "13_37": "$13.37",
                "42": "$42",
                "69": "$69",
                "420": "$420",
                "666": "$666",
                "777": "$777",
                "1337": "$1337"
            };

            var found = null;
            for (var i = 0; i < luckyCodes.length; i++) {
                if (r.events.indexOf("lucky_" + luckyCodes[i]) !== -1) {
                    found = luckyDisplay[luckyCodes[i]];
                    break;
                }
            }
            if (!found) return null;

            var jokes = [
                "Someone gave us " + found + ". Nice.",
                "We received " + found + ". Meme appreciated.",
                found + "? Someone's got a sense of humor."
            ];
            var joke = jokes[r.allTime.daysSinceLaunch % jokes.length];

            return [
                "DAY " + r.allTime.daysSinceLaunch,
                "",
                joke,
                "",
                "Total: " + formatMoney(r.allTime.totalRaised),
                "",
                "Please help us.",
                "",
                "[WEBSITE]"
            ].join("\n");
        }
    },

    // ============================================================
    // Zero day: هیچ‌کس کمک نکرد
    // ============================================================
    {
        name: "zero_day",
        event: "zero_day",
        generate: function (r) {
            if (r.events.indexOf("zero_day") === -1) return null;
            var variants = [
                "This is getting embarrassing.",
                "We're not mad. Just disappointed.",
                "Maybe tomorrow.",
                "Hello? Anyone?",
                "We're still here.",
                "Tough crowd.",
                "We'll wait."
            ];
            var closing = variants[r.allTime.daysSinceLaunch % variants.length];
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

    // ============================================================
    // Small day: کمتر از $10
    // ============================================================
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

    // ============================================================
    // Normal day: $10-$99
    // ============================================================
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

    // ============================================================
    // Fallback
    // ============================================================
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
 * ترتیب اهمیت (بالا به پایین):
 *   week_anniversary > milestone > donor_milestone > network_first
 *   > huge_donation > big_donation > lucky_amount > huge_day
 *   > big_day > record_day > first_donation > repeat_donor
 *   > zero_day > small_day > normal_day > fallback
 */
function selectTemplate(report) {
    var priority = [
        "week_anniversary",
        "milestone",
        "donor_milestone",
        "network_first",
        "huge_donation",
        "big_donation",
        "lucky_amount",
        "huge_day",
        "big_day",
        "record_day",
        "first_donation",
        "repeat_donor",
        "zero_day",
        "small_day",
        "normal_day",
        "fallback"
    ];

    for (var i = 0; i < priority.length; i++) {
        var name = priority[i];
        var tpl = null;
        for (var j = 0; j < TEMPLATES.length; j++) {
            if (TEMPLATES[j].name === name) {
                tpl = TEMPLATES[j];
                break;
            }
        }
        if (!tpl) continue;
        var out = tpl.generate(report);
        if (out) return { name: tpl.name, text: out };
    }
    return null;
}

module.exports = {
    TEMPLATES: TEMPLATES,
    selectTemplate: selectTemplate,
    formatMoney: formatMoney
};
