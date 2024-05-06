
const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const razorpay = require("razorpay");
const crypto = require("crypto");
const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');
dotenv.config();

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGODB)
    .then(() => {
        console.log("Connection successful.....");
    })
    .catch((error) => {
        console.error("MongoDB connection error:", error);
    });

const instance = new razorpay({
    key_id: process.env.KEY,
    key_secret: process.env.SECRET,
});

const paymentschema = new mongoose.Schema({
    razorpay_order_id: {
        type: String,
        required: true,
    },
    razorpay_payment_id: {
        type: String,
        required: true,
    },
    razorpay_signature: {
        type: String,
        required: true,
    },
});

const Payment = mongoose.model("Payment", paymentschema);

app.post("/checkout", async (req, res) => {
    try {
        const options = {
            amount: Number(req.body.amount * 100),
            currency: "INR",
        };
        const order = await instance.orders.create(options);
        console.log(order);
        res.status(200).json({
            success: true,
            order,
        });
    } catch (error) {
        console.error("Error in /checkout:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post("/paymentverification", async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto.createHmac('sha256', process.env.SECRET).update(body).digest('hex');
        const isAuth = expectedSignature === razorpay_signature;
        if (isAuth) {
            await Payment.create({
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature
            });

            res.redirect(`http://localhost:5173/paymentsuccess?reference=${razorpay_payment_id}`);
        } else {
            res.status(400).json({ success: false, message: "Invalid signature" });
        }
    } catch (error) {
        console.error("Error in /paymentverification:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post("/sendotp", async (req, res) => {
    try {
        const { phoneNumber, email } = req.body;

        // Sending OTP via SMS using Twilio
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const otp = Math.floor(100000 + Math.random() * 900000);
        await client.messages.create({
            body: `Your OTP is ${otp}`,
            to: phoneNumber,
            from: process.env.TWILIO_PHONE_NUMBER
        });

        // Sending OTP to email 
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        const msg = {
            to: email,
            from: 'cnr9440@gmail.com',
            subject: 'OTP for Payment Confirmation',
            text: `Your OTP is ${otp}`,
            html: `<strong>Your OTP is ${otp}</strong>`,
        };
        await sgMail.send(msg);

        res.status(200).json({ success: true, otp });
    } catch (error) {
        console.error("Error in /sendotp:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get("/api/getkey", (req, res) => {
    return res.status(200).json({ key: process.env.KEY });
});

app.listen(8000, () => {
    console.log(`Server listening on port 8000`);
});
