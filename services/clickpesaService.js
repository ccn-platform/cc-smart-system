 
 require("dns").setDefaultResultOrder("ipv4first");

const axios = require("axios");
const https = require("https");
const clickpesaAuth = require("./clickpesaAuthService");

const axiosClient = axios.create({
 httpsAgent: new https.Agent({
  keepAlive: true,
  maxSockets: 50
 }),
 timeout: 10000
});
class ClickPesaService {

 async mobilePush(phone, amount, reference) {

  if (!amount || amount <= 0) {
   throw new Error("Invalid payment amount");
  }

  phone = phone.replace(/\D/g, "");

  if (phone.startsWith("0")) {
   phone = "255" + phone.slice(1);
  }

  if (!phone.startsWith("255") || phone.length !== 12) {
   throw new Error("Invalid Tanzania phone number");
  }

  try {

   const token = await clickpesaAuth.getToken();

   const url =
   `${process.env.CLICKPESA_BASE_URL}/third-parties/payments/initiate-ussd-push-request`;

   const amountStr = String(amount);

    const response = await axiosClient.post(
    url,
    {
     amount: amountStr,
     currency: "TZS",
     orderReference: reference,
     phoneNumber: phone
    },
    {
     headers: {
      Authorization: token,
      "Content-Type": "application/json"
     },
    }
   );

   console.log("ClickPesa response:", response.data);

   return response.data;

  } catch (error) {

   console.error("ClickPesa payment error", {
    reference,
    phone,
    amount,
    error: error.response?.data || error.message
   });

   throw new Error("Mobile push request failed");
  }
 }

}

module.exports = new ClickPesaService();
