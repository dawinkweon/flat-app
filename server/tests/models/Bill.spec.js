const assert = require("assert");
const { Bill, BillType } = require("../../models/Bill");
const { BillPayment } = require("../../models/BillPayment");
const { User } = require("../../models/User");
const sinon = require("sinon");
const mongoose = require("mongoose");

describe("Bill model", () => {
  const userStub = sinon.stub(User, "findById");
  const User1Id = "5eb74cca2ae20907b147cb21";
  const User2Id = "5eb74cca2ae20907b147cb22";

  beforeEach(function () {
    userStub.restore();
  });

  it("create bill has errors without req fields", () => {
    const bill = Bill();

    bill.validate((err) => {
      assert(err.errors.date);
      assert(err.errors.type);
      assert(err.errors.total_amount);
    });
  });

  it("create bill sets default flags", () => {
    const bill = Bill();

    assert.equal(false, bill.is_admin_confirmed);
    assert.equal(false, bill.is_deleted);
  });

  it("create bill has default empty files and payments", () => {
    const bill = Bill();

    assert(bill.files != null);
    assert(bill.files.length == 0);

    assert(bill.payments != null);
    assert(bill.payments.length == 0);
  });

  it("create bill has errors when negative total amount", () => {
    const bill = Bill({ total_amount: -1 });

    bill.validate((err) => {
      assert(err.errors.total_amount);
      assert.equal(
        "Amount must be a positive number",
        err.errors.total_amount.message
      );
    });
  });

  it("create bill validates date format", () => {
    const testCases = [
      { date: "01/01/20", isValid: false },
      { date: "1 January 2020", isValid: false },
      { date: "1-1-20", isValid: false },
      { date: "--------", isValid: false },
      { date: "01-01-20", isValid: true },
    ];

    testCases.forEach((tc) => {
      const { date, isValid } = tc;
      const bill = Bill({ date: date });
      bill.validate((err) => {
        assert.equal(isValid, err.errors.date == null);
      });
    });
  });

  it("bill create payments creates correct payments", () => {
    const bill = Bill({ total_amount: 100 });
    const paymentInfo1 = { userId: 1, usage_in_days: 1, payable_amount: 0 };
    const paymentInfo2 = { userId: 2, usage_in_days: 1, payable_amount: 0 };
    bill.payments.push(paymentInfo1);
    bill.payments.push(paymentInfo2);

    bill.calculatePayments([paymentInfo1, paymentInfo2]);

    assert(2, bill.payments.length);

    assert(50, bill.payments[0].payable_amount);
    assert(1, bill.payments[0].userId);
    assert(1, bill.payments[0].usage_in_days);

    assert(50, bill.payments[1].payable_amount);
    assert(1, bill.payments[1].userId);
    assert(1, bill.payments[1].usage_in_days);
  });

  it("create bill generates reference", () => {
    const bill = Bill({ type: BillType.Water, date: "01-01-20" });

    bill.generateReference();

    assert.equal("water-01-01-20", bill.reference_name);
  });

  it("update payments does not add payments when user does not exist", () => {
    userStub.returns({
      exec: () => {
        throw Error("user does not exist");
      },
    });
    const expectedError = `Could not fetch user with id: ${User1Id} with error: user does not exist`;

    const bill = Bill();

    const updatedPayments = [
      {
        userId: User1Id,
        status: "unpaid",
      },
    ];

    try {
      bill.updatePayments(updatedPayments);
    } catch (err) {
      assert.equal(expectedError, err.message);
    }
  });

  it("update payments adds new payments when payment does not exist", () => {
    const user1 = User({ _id: User1Id });

    userStub.returns({
      exec: () => {
        return user1;
      },
    });

    const bill = Bill();

    const updatedPayments = [
      {
        userId: User1Id,
        usage_in_days: 10,
      },
    ];

    try {
      bill.updatePayments(updatedPayments);
    } catch (err) {}

    assert.equal(1, bill.payments.length);

    const payment = bill.payments[0];
    assert.equal(User1Id, payment.userId);
    assert.equal(10, payment.usage_in_days);
  });

  it("update payments when payments are existing", () => {
    const user1 = User({ _id: User1Id });
    const user2 = User({ _id: User2Id });

    userStub.callsFake(() => {
      {
        exec: (userId) => {
          if (userId == User1Id) {
            return user1;
          }
          if (userId == User2Id) {
            return user2;
          }
        };
      }
    });

    const bill = Bill();
    const existingPayment1 = BillPayment({ userId: User1Id, usage_in_days: 1 });
    const existingPayment2 = BillPayment({ userId: User2Id, usage_in_days: 2 });
    bill.payments.push(existingPayment1);
    bill.payments.push(existingPayment2);

    const updatedPayments = [
      {
        userId: User1Id,
        usage_in_days: 11,
      },
      {
        userId: User2Id,
        usage_in_days: 12,
      }
    ];

    try {
      bill.updatePayments(updatedPayments);
    } catch (err) {}

    assert.equal(2, bill.payments.length);

    const payment1 = bill.payments.find(payment => payment.userId == User1Id);
    assert(payment1 != null);
    assert.equal(11, payment1.usage_in_days);

    const payment2 = bill.payments.find(payment => payment.userId == User2Id);
    assert(payment2 != null);
    assert.equal(12, payment2.usage_in_days);
  });

  it("update payments removes payments that are missing from the updated payments", () => {
    const user1 = User({ _id: User1Id });

    userStub.callsFake(() => {
      {
        exec: () => user1;
      }
    });

    const bill = Bill();
    const existingPayment1 = BillPayment({ userId: User1Id, usage_in_days: 1 });
    bill.payments.push(existingPayment1);

    const updatedPayments = [];

    try {
      bill.updatePayments(updatedPayments);
    } catch (err) {}

    assert.equal(0, bill.payments.length);
  });
});
