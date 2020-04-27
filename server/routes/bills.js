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
  await Bill.find({}, (err, bills) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.send(JSON.stringify(bills));
    }
  });
});

/**
 * @route GET /bills/billId
 * @group Bills
 * @returns {Bill.model} 200 - A bill
 * @returns {object} 500 - Error
 */
router.get("/:billId/", async (req, res) => {
  await Bill.findById(req.params.billId, (err, bill) => {
    if (err) {
      res.send();
    } else {
      return JSON.stringify(bill);
    }
  });
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
    await User.getActiveUsers()
      .then((users) => {
        if (users.length <= 0) {
          throw Error("No users exist to create the bill");
        } else {
          return users;
        }
      })
      .then((users) => {
        const newEntry = req.body;

        const bill = Bill(newEntry);
        const numUsers = users.length;
        const amountPerUser = newEntry.total_amount / numUsers;

        // Add bill payments for each active user
        users.forEach((user) => {
          const payment = BillPayment({
            userId: user._id,
            usage_in_days: 31,
            payable_amount: amountPerUser,
          });

          bill.payments.push(payment);
        });

        bill.save((err, bill) => {
          if (err) {
            res.status(500).send(err);
          } else {
            res.send(bill);
          }
        });
      })
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
