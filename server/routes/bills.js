const express = require("express");
const router = express.Router();
const { Bill } = require("../models/Bill");
const { User } = require("../models/User");
const { BillPayment } = require("../models/BillPayment");

/**
 * @route GET /bills
 * @group Bills
 * @returns {Array.<Bill>} 200 - An array of bills
 * @returns {object} 500 - Error
 */
router.get("/", async (req, res) => {
  try {
    const bills = await Bill.find().exec();
    res.send(bills);
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});

/**
 * @route GET /bills/billId
 * @group Bills
 * @returns {Bill.model} 200 - A bill
 * @returns {object} 500 - Error
 */
router.get("/:billId/", async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.billId).exec();
    res.send(bill);
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});

/**
 * @route POST /bills/add
 * @group Bills
 * @param {string} date.required - The date of the issued bill in the format `dd-mm-yy`
 * @param {string} type.required - The type of the bill: `water` or `power` or `internet` or `misc`
 * @param {Number} total_amount.required - The total dollar amount of the bill
 * @param {string} reference_name - The  reference name to use for the payment of this bill
 * @returns {Bill.model} 200 - A bill
 * @returns {object} 500 - Error
 */
router.post("/add", async (req, res) => {
  try {
    const activeUsers = await User.getActiveUsers();

    if (activeUsers.length <= 0) {
      throw Error("No users exist to create the bill");
    }

    const newEntry = req.body;
    const bill = Bill(newEntry);

    // Add bill payments for each active user
    activeUsers.forEach((user) => {
      const payment = BillPayment({
        userId: user._id,
        usage_in_days: 31,
        payable_amount: 0,
      });

      bill.payments.push(payment);
    });

    await bill.save();
    res.send(bill);
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});

/**
 * @route POST /bills/billId/userId/update
 * @group Bills
 * @param {String} status.required - The status of the payment: `unpaid` or `marked` or `paid`
 * @param {Number} usage_in_days - The bill usage in days between `0` and `31` inclusive
 * @returns {Bill.model} 200 - A bill
 * @returns {object} 500 - Error
 */
router.post("/:billId/:userId/update", async (req, res) => {
  const { billId, userId } = req.params;
  const { status, usage_in_days } = req.body;

  try {
    const bill = await Bill.findById(billId).exec();

    const payment = bill.payments.find((p) => p.userId == userId);

    if (payment == null) {
      res.status(500).send(`User id: ${userId} was not found from bill`);
      return;
    }

    if (usage_in_days != null) {
      payment.usage_in_days = usage_in_days;
    }

    if (status != null) {
      payment.status = status;
    }

    await bill.save();
    res.send(bill);
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});

/**
 * @route POST /bills/billsId/delete
 * @group Bills
 * @returns {object} 200 - Success
 * @returns {object} 500 - Error
 */
router.post("/:billId/delete", async (req, res) => {
  console.log(req.params.billId);
  await Bill.deleteOne({ _id: req.params.billId }, (err) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.sendStatus(200);
    }
  });
});

module.exports = router;
