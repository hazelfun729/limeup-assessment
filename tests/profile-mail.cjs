// Transport is mocked: exercises real content and send-state logic without contacting recipients.
const fs = require("fs"),
  path = require("path"),
  ts = require("typescript"),
  vm = require("vm"),
  assert = require("node:assert/strict");
const copies = JSON.parse(
  fs.readFileSync("docs/copy/27种成长画像文案-正稿.json"),
).items;
const configs = new Map(
  copies.map((c) => [
    `profile-copy:2026-09-16:${c.combination}`,
    JSON.stringify(c),
  ]),
);
configs.set("profile-copy:active", "2026-09-16");
const rows = new Map();
let assessment,
  sends = 0,
  fail = null,
  dbFail = false;
const prisma = {
  siteConfig: {
    findUnique: async ({ where }) =>
      configs.has(where.key) ? { value: configs.get(where.key) } : null,
  },
  assessment: { findUnique: async () => assessment },
  delivery: {
    createMany: async ({ data }) => {
      for (const d of data)
        if (!rows.has(d.id))
          rows.set(d.id, { status: "PENDING", attempts: 0, ...d });
      return { count: data.length };
    },
    findUnique: async ({ where }) => rows.get(where.id) || null,
    findUniqueOrThrow: async ({ where }) => {
      if (!rows.has(where.id)) throw Error("missing");
      return { ...rows.get(where.id) };
    },
    updateMany: async ({ where, data }) => {
      const row = rows.get(where.id);
      if (!row || !where.status.in.includes(row.status)) return { count: 0 };
      Object.assign(row, {
        status: data.status,
        attempts: row.attempts + 1,
        error: data.error,
      });
      return { count: 1 };
    },
    update: async ({ where, data }) => {
      if (dbFail && data.status === "SENT") throw Error("DB unavailable");
      Object.assign(rows.get(where.id), data);
      return { ...rows.get(where.id) };
    },
    upsert: async ({ where, create }) => {
      if (!rows.has(where.id))
        rows.set(where.id, { status: "PENDING", attempts: 0, ...create });
      return rows.get(where.id);
    },
  },
};
const cache = {};
function load(file) {
  file = path.resolve(file);
  if (cache[file]) return cache[file].exports;
  const m = { exports: {} };
  cache[file] = m;
  const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2021,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInThisContext("(function(require,module,exports){" + js + "\n})", {
    filename: file,
  })(
    (n) =>
      n === "@/lib/prisma"
        ? { prisma }
        : n === "nodemailer"
          ? {
              createTransport: () => ({
                sendMail: async () => {
                  sends++;
                  if (fail) throw fail;
                  return { accepted: ["test"] };
                },
              }),
            }
          : n.startsWith("@/")
            ? load("src/" + n.slice(2) + ".ts")
            : n.startsWith(".")
              ? load(path.resolve(path.dirname(file), n) + ".ts")
              : require(n),
    m,
    m.exports,
  );
  return m.exports;
}
let count = 0;
function check(name, ok) {
  assert.ok(ok, name);
  count++;
}
(async () => {
  const {normalizeLetterAnswers} = load("src/lib/profile/content.ts");
  const { scorePresentation } = load("src/lib/profile/content.ts");
  for (const [score, level, color] of [[0,"弱","#dc6267"],[50,"弱","#dc6267"],[50.1,"中","#edaa36"],[72,"中","#edaa36"],[72.1,"强","#8ca128"],[100,"强","#8ca128"],[null,"信息不足","#d5d5cf"]]) {
    const tone = scorePresentation(score);
    check("score presentation boundary " + score, tone.level === level && tone.bar === color);
  }
  check("fifth answer optional",normalizeLetterAnswers(['a','b','c','d','']).length===5);
  check("legacy four answers accepted",normalizeLetterAnswers(['a','b','c','d'])[4]==='');
  check("fifth answer preserved",normalizeLetterAnswers(['a','b','c','d',' 补充 '])[4]==='补充');
  check("required answer cannot be empty",normalizeLetterAnswers(['','b','c','d','补充'])===null);
  check("fifth answer size limited",normalizeLetterAnswers(['a','b','c','d','x'.repeat(4001)])===null);
  check("non-text fifth rejected",normalizeLetterAnswers(['a','b','c','d',4])===null);
  const service = load("src/lib/profile/service.ts"),
    mail = load("src/lib/profile/email.ts"),
    delivery = load("src/lib/mail/delivery.ts");
  for (const c of copies) {
    const [d, a, p] = c.combination
      .split("_")
      .map((x) => (x === "强" ? 90 : x === "中" ? 60 : 20));
    assessment = {
      status: "COMPLETED",
      userId: "test",
      growthProfile: {
        id: "p",
        learningModeEmoji: "🌱",
        systemScores: {
          motivation: { score: d },
          ability: { score: a },
          perseverance: { score: p },
        },
        dimensionScores: { DR_INNER: { score: 0 } },
      },
      payment: null,
      handbook: null,
    };
    const view = await service.getProfileView("a");
    check("exact copy " + c.combination, view.copy.number === c.number);
    check("unused questions absent " + c.combination, !("questions" in view));
    check(
      "nine dimensions " + c.combination,
      view.systems.flatMap((s) => s.dimensions).length === 9,
    );
    check(
      "missing != zero " + c.combination,
      view.systems[0].dimensions.some((d) => d.score === null) &&
        view.systems[0].dimensions.some((d) => d.score === 0),
    );
    check("27 module names without scores " + c.combination,view.systems.flatMap(s=>s.dimensions).every(d=>d.modules.length===3&&d.modules.every(m=>typeof m==='string')));
    const html = mail.renderProfileEmail(view, "https://example.test");
    check(
      "email content " + c.combination,
      html.includes(c.title) &&
        html.includes(c.action) &&
        html.includes("写咨询信") &&
        html.includes("39.9") && html.includes("其他还想说的") && view.systems.flatMap(s=>s.dimensions).every(d=>html.includes("（"+d.modules.join("、")+"）")),
    );
  }
  assessment.payment = { status: "CONFIRMED" };
  assessment.handbook = { id: "h", status: "SENT" };
  let p = await service.getProfileView("a");
  check("purchased report link", p.purchase.href === "/report/h");
  assessment.payment.status = "REFUNDED";
  p = await service.getProfileView("a");
  check("refund goes to order", p.purchase.href === "/status/a");
  p.copy = { ...p.copy, title: "<script>alert(1)</script>" };
  check(
    "escape HTML",
    !mail.renderProfileEmail(p, "https://example.test").includes("<script>"),
  );
  for (const u of [
    "http://example.com",
    "https://127.0.0.1",
    "https://localhost",
    "https://192.168.1.2",
    "https://[::1]",
    "https://user:pass@example.com",
  ]) {
    process.env.PUBLIC_SITE_URL = u;
    check("block local/unsafe origin " + u, delivery.publicSiteUrl() === null);
  }
  delete process.env.PUBLIC_SITE_URL;
  check(
    "local skips delivery",
    (await mail.sendProfileEmail("a")).status === "LOCAL_PREVIEW" &&
      sends === 0,
  );
  process.env.SMTP_HOST = "mock";
  process.env.SMTP_USER = "test@example.invalid";
  rows.set("one", { id: "one", status: "PENDING", attempts: 0 });
  await Promise.all([
    delivery.deliver("one"),
    delivery.deliver("one"),
    delivery.deliver("one"),
  ]);
  check(
    "concurrent claim sends once",
    sends === 1 && rows.get("one").status === "SENT",
  );
  await delivery.deliver("one");
  check("sent not resent", sends === 1);
  rows.set("two", { id: "two", status: "PENDING", attempts: 0 });
  fail = new Error("rejected");
  await delivery.deliver("two");
  check("failed remains retryable", rows.get("two").status === "FAILED");
  fail = null;
  await delivery.deliver("two");
  check("retry succeeds", rows.get("two").status === "SENT");
  rows.set("three", { id: "three", status: "PENDING", attempts: 0 });
  fail = Object.assign(new Error("timeout"), { code: "ETIMEDOUT" });
  await delivery.deliver("three");
  const before = sends;
  await delivery.deliver("three");
  check(
    "ambiguous not auto resent",
    rows.get("three").status === "UNKNOWN" && sends === before,
  );
  fail = null;
  rows.set("four", { id: "four", status: "PENDING", attempts: 0 });
  dbFail = true;
  await assert.rejects(() => delivery.deliver("four"));
  const after = sends;
  await delivery.deliver("four");
  check(
    "DB failure after SMTP no resend",
    rows.get("four").status === "SENDING" && sends === after,
  );
  dbFail = false;
  assessment.user = {
    id: "test",
    emailVerified: true,
    email: "test@example.invalid",
  };
  assessment.payment = null;
  process.env.PUBLIC_SITE_URL = "https://example.test";
  const countBefore = sends;
  await Promise.all([
    mail.sendProfileEmail("profile-concurrent"),
    mail.sendProfileEmail("profile-concurrent"),
  ]);
  check("profile simultaneous sends once", sends === countBefore + 1);
  await mail.sendProfileEmail("profile-concurrent", true);
  check("profile revisit no resend", sends === countBefore + 1);
  console.log(
    "PASS",
    count,
    "profile/email checks (mocked transport; no real email)",
  );
  fs.writeFileSync(
    "docs/profile-mail-test-results.json",
    JSON.stringify(
      { passed: count, testedAt: new Date().toISOString(), realEmail: false },
      null,
      2,
    ),
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
