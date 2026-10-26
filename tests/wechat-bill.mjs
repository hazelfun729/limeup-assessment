import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { matchWeChatBill, parsePersonalWeChatWorkbook, parseWeChatBill } from "../src/lib/payments/wechat-bill.ts";

const csv = [
  "交易时间,微信订单号,交易状态,订单金额",
  "`2026-10-07 14:00:00,`4200000000000000000000123456,`SUCCESS,`9.90",
  "`2026-10-07 14:01:00,`4200000000000000000000654321,`SUCCESS,`9.90",
].join("\n");
const transactions = parseWeChatBill(csv);
assert.equal(transactions.length, 2);
const createdAt = new Date("2026-10-07T06:05:00Z");
const first = { id: "one", suffix: "123456", amountCents: 990, createdAt };
assert.deepEqual(matchWeChatBill([first], transactions).matches, [{ paymentId: "one", transactionId: transactions[0].transactionId }]);
assert.deepEqual(matchWeChatBill([first, { ...first, id: "duplicate" }], transactions).conflicts.sort(), ["duplicate", "one"]);
assert.equal(matchWeChatBill([first], transactions, new Set([transactions[0].transactionId])).matches.length, 0);
assert.equal(matchWeChatBill([{ ...first, amountCents: 3990 }], transactions).matches.length, 0);
const refunded = parseWeChatBill(csv + `\n\`2026-10-07 15:00:00,\`${transactions[0].transactionId},\`REFUND,\`9.90`);
assert.equal(matchWeChatBill([first], refunded).matches.length, 0);
const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet("Sheet1");
sheet.addRow(["微信支付账单明细"]);
sheet.addRow(["微信昵称：[青柠收款测试]"]);
sheet.addRow(["交易时间", "交易类型", "交易对方", "商品", "收/支", "金额(元)", "支付方式", "当前状态", "交易单号", "商户单号", "备注"]);
sheet.addRow(["2026-10-07 14:00:00", "二维码收款", "付款人", "二维码收款", "收入", 9.9, "零钱", "已收款", "4200000000000000000000123456", "", ""]);
sheet.addRow(["2026-10-07 14:00:00", "扫二维码付款", "收款人", "二维码收款", "支出", 9.9, "零钱", "已转账", "4200000000000000000000654321", "", ""]);
const buffer = await workbook.xlsx.writeBuffer();
const personal = await parsePersonalWeChatWorkbook(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), "青柠收款测试");
assert.equal(personal.length, 1);
assert.equal(personal[0].transactionId, transactions[0].transactionId);
console.log("微信账单匹配测试通过");
