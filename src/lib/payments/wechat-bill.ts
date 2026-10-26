import ExcelJS from "exceljs";

export type BillTransaction = {
  transactionId: string;
  amountCents: number;
  paidAt: Date;
  status: string;
};

export type PendingPayment = {
  id: string;
  suffix: string | null;
  amountCents: number;
  createdAt: Date;
};

function csvRecords(source: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value); value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(value); value = "";
      if (row.some((part) => part.trim())) records.push(row);
      row = [];
    } else value += char;
  }
  if (quoted) throw new Error("账单 CSV 引号未闭合");
  row.push(value);
  if (row.some((part) => part.trim())) records.push(row);
  return records;
}

const clean = (value: string) => value.replace(/^\uFEFF/, "").trim().replace(/^`/, "").trim();

function cents(value: string): number | null {
  const match = clean(value).replace(/[¥￥,]/g, "").match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));
}

function chinaTime(value: string): Date | null {
  const match = clean(value).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const date = new Date(`${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}T${match[4].padStart(2, "0")}:${match[5]}:${match[6] || "00"}+08:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseWeChatBill(source: string, expectedMerchantId?: string): BillTransaction[] {
  const rows = csvRecords(source);
  if (rows.length > 10001) throw new Error("一次最多导入 10000 条账单记录");
  const headerAt = rows.findIndex((row) => row.some((cell) => ["微信订单号", "微信支付订单号"].includes(clean(cell))) && row.some((cell) => ["交易状态", "交易类型"].includes(clean(cell))));
  if (headerAt < 0) throw new Error("未找到微信交易账单表头。请提供包含微信订单号、交易状态、金额和交易时间的 CSV 文件");
  const headers = rows[headerAt].map(clean);
  const column = (...names: string[]) => names.map((name) => headers.indexOf(name)).find((index) => index >= 0) ?? -1;
  const idCol = column("微信订单号", "微信支付订单号");
  const amountCol = column("订单金额", "总金额", "应结订单金额");
  const statusCol = column("交易状态");
  const timeCol = column("交易时间", "付款时间");
  if ([idCol, amountCol, statusCol, timeCol].includes(-1)) throw new Error("账单缺少微信订单号、交易状态、订单金额或交易时间，无法安全自动核对");
  const merchantCol = column("商户号", "特约商户号");
  if (expectedMerchantId && merchantCol < 0) throw new Error("账单缺少商户号，无法核实收款账户");
  const parsed: BillTransaction[] = [];
  for (const row of rows.slice(headerAt + 1)) {
    if (expectedMerchantId && clean(row[merchantCol] || "") !== expectedMerchantId) continue;
    const transactionId = clean(row[idCol] || "");
    if (!/^[A-Za-z0-9]{10,64}$/.test(transactionId)) continue;
    const amountCents = cents(row[amountCol] || "");
    const paidAt = chinaTime(row[timeCol] || "");
    if (amountCents === null || !paidAt) continue;
    parsed.push({ transactionId, amountCents, paidAt, status: clean(row[statusCol] || "").toUpperCase() });
  }
  return parsed;
}

export async function parsePersonalWeChatWorkbook(bytes: ArrayBuffer, expectedNickname: string): Promise<BillTransaction[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(bytes) as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount > 10001) throw new Error("账单为空或超过 10000 条记录");
  const nicknameLine = String(sheet.getCell("A2").value ?? "");
  const nickname = nicknameLine.match(/^微信昵称：\[(.*)\]$/)?.[1];
  if (!nickname || nickname !== expectedNickname) throw new Error("账单所属微信账户与收款码账户不一致，已停止自动核对");
  let headerRow = -1;
  let columns: string[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (headerRow >= 0) return;
    const names = (row.values as ExcelJS.CellValue[]).slice(1).map((value) => clean(String(value ?? "")));
    if (names.includes("交易单号") && names.includes("收/支") && names.includes("金额(元)")) {
      headerRow = rowNumber;
      columns = names;
    }
  });
  if (headerRow < 0) throw new Error("未找到个人微信账单表头，请确认这是收款码所属账户导出的账单");
  const field = (name: string) => columns.indexOf(name) + 1;
  const required = ["交易时间", "交易类型", "商品", "收/支", "金额(元)", "当前状态", "交易单号"];
  if (required.some((name) => !field(name))) throw new Error("账单缺少自动核对所需的交易字段");
  const transactions: BillTransaction[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) return;
    const value = (name: string) => clean(String(row.getCell(field(name)).value ?? ""));
    if (value("收/支") !== "收入") return;
    if (!/二维码收款|扫码收款/.test(`${value("交易类型")} ${value("商品")}`)) return;
    const transactionId = value("交易单号");
    const amountCents = cents(value("金额(元)"));
    const paidAt = chinaTime(value("交易时间"));
    if (!/^[A-Za-z0-9]{10,64}$/.test(transactionId) || amountCents === null || !paidAt) return;
    transactions.push({ transactionId, amountCents, paidAt, status: value("当前状态") });
  });
  if (!transactions.length) throw new Error("这份账单没有二维码收款的收入记录。请从收款码所属微信账户导出账单；付款方的支出账单不能作为到账依据");
  return transactions;
}

export function matchWeChatBill(payments: PendingPayment[], transactions: BillTransaction[], usedIds: Set<string> = new Set()) {
  const successStatuses = ["SUCCESS", "支付成功", "交易成功", "已收款", "收款成功", "已存入零钱"];
  const blocked = new Set(transactions.filter((row) => !successStatuses.includes(row.status)).map((row) => row.transactionId));
  const success = transactions.filter((row) => successStatuses.includes(row.status) && !blocked.has(row.transactionId) && !usedIds.has(row.transactionId));
  const candidates = payments.map((payment) => {
    if (!/^\d{6}$/.test(payment.suffix || "")) return [] as BillTransaction[];
    return success.filter((row) => row.transactionId.endsWith(payment.suffix!) && row.amountCents === payment.amountCents &&
      row.paidAt.getTime() >= payment.createdAt.getTime() - 14 * 86400000 &&
      row.paidAt.getTime() <= payment.createdAt.getTime() + 86400000);
  });
  const matches: Array<{ paymentId: string; transactionId: string }> = [];
  const conflicts: string[] = [];
  const unmatched: string[] = [];
  payments.forEach((payment, index) => {
    const options = candidates[index];
    if (!options.length) { unmatched.push(payment.id); return; }
    if (options.length !== 1 || candidates.some((other, otherIndex) => otherIndex !== index && other.some((row) => row.transactionId === options[0].transactionId))) {
      conflicts.push(payment.id); return;
    }
    matches.push({ paymentId: payment.id, transactionId: options[0].transactionId });
  });
  return { matches, conflicts, unmatched };
}
