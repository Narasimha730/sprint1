
import React from 'react';
import { Box, Stack } from "@chakra-ui/react";
import Card from './Card';
import axios from "axios";

const Home = () => {

  const checkouthandler = async (amount) => {
    try {
      const { data: { key } } = await axios.get("http://localhost:8000/api/getkey");
      const { data: { order } } = await axios.post("http://localhost:8000/checkout", { amount });

      const options = {
        key,
        amount: order.amount,
        currency: "INR",
        name: "cnr_lifehacks",
        description: "Razorpay tutorial",
        order_id: order.id,
        callback_url: "http://localhost:8000/paymentverification",
        prefill: {
          name: "NarasimhaReddy",
          email: "cnr9440@gmail.com",
          contact: "6281594763"
        },
        notes: {
          "address": "razorpay official"
        },
        theme: {
          "color": "#339966"
        }
      };

      const razor = new window.Razorpay(options);
      razor.on('payment.success', async function (response) {
        const { data: { otp } } = await axios.post("http://localhost:8000/sendotp",
          {
            phoneNumber: options.prefill.contact,
            email: options.prefill.email
          });
        console.log('Payment successful. OTP sent:', otp);
      });

      razor.open();
    } catch (error) {
      console.error("Error during checkout:", error);
    }
  }

  return (
    <Box>
      <Stack h={"100vh"} justifyContent={"center"} alignItems={"center"} direction={["column", "row"]}>
        <Card amount={45000} img={"https://cdn.shopify.com/s/files/1/1684/4603/products/MacBookPro13_Mid2012_NonRetina_Silver.png"} checkouthandler={checkouthandler} />
        <Card amount={20000} img={"http://i1.adis.ws/i/canon/eos-r5_front_rf24-105mmf4lisusm_32c26ad194234d42b3cd9e582a21c99b"} checkouthandler={checkouthandler} />
      </Stack>
    </Box>
  )
}

export default Home;
