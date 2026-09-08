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

    // ==========================================
    // HAKIKISHA KIASI CHA MALIPO NI SAHIHI
    // ==========================================

    if (!amount || Number(amount) <= 0) {
      throw new Error("Kiasi cha malipo si sahihi.");
    }

    // ==========================================
    // HAKIKISHA NAMBA YA SIMU IPO
    // ==========================================

    if (
      phone === undefined ||
      phone === null ||
      String(phone).trim() === ""
    ) {
      throw new Error(
        "Namba ya simu ya malipo haijawekwa. Tafadhali weka namba sahihi ya simu kisha ujaribu tena."
      );
    }

    // ==========================================
    // BADILISHA KUWA STRING NA ONDOA HERUFI
    //
    // Mfano:
    // 0758078629      -> 0758078629
    // +255758078629   -> 255758078629
    // 255 758 078 629 -> 255758078629
    // ==========================================

    phone = String(phone).trim().replace(/\D/g, "");

    // ==========================================
    // FORMAT:
    // 0758078629 -> 255758078629
    // ==========================================

    if (phone.startsWith("0")) {
      phone = "255" + phone.slice(1);
    }

    // ==========================================
    // FORMAT:
    // 758078629 -> 255758078629
    // ==========================================

    if (
      phone.length === 9 &&
      phone.startsWith("7")
    ) {
      phone = "255" + phone;
    }

    // ==========================================
    // VALIDATION YA NAMBA YA TANZANIA
    //
    // Format inayotarajiwa:
    // 255XXXXXXXXX
    //
    // Jumla digits 12
    // ==========================================

    if (
      !phone.startsWith("255") ||
      phone.length !== 12
    ) {
      throw new Error(
        "Namba ya simu si sahihi. Tafadhali tumia namba ya Tanzania, mfano 0758078629."
      );
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
          }
        }
      );

      console.log(
        "ClickPesa response:",
        response.data
      );

      return response.data;

    } catch (error) {

      // ==========================================
      // LOG ZA SERVER
      // ==========================================

      console.error(
        "ClickPesa payment error",
        {
          reference,
          phone,
          amount,
          error:
            error.response?.data ||
            error.message
        }
      );

      console.log(
        "========== CLICKPESA ERROR =========="
      );

      console.log("Full response:");

      console.log(
        JSON.stringify(
          error.response?.data,
          null,
          2
        )
      );

      console.log(
        "Message:",
        error.response?.data?.message
      );

      console.log(
        "Error:",
        error.response?.data?.error
      );

      console.log(
        "Details:",
        error.response?.data?.error?.details
      );

      console.log(
        "Code:",
        error.code
      );

      console.log(
        "===================================="
      );

      // ==========================================
      // CHUKUA UJUMBE WA KOSA KUTOKA CLICKPESA
      // ==========================================

      const message = String(
        error.response?.data?.message ||
        error.response?.data?.error?.message ||
        error.response?.data?.error?.details ||
        error.message ||
        ""
      );

      // ==========================================
      // INVALID PHONE NUMBER
      // ==========================================

      if (
        /invalid.*phone/i.test(message) ||
        /phone.*invalid/i.test(message) ||
        /invalid.*number/i.test(message) ||
        /phone.*number/i.test(message) ||
        /invalid.*msisdn/i.test(message)
      ) {
        throw new Error(
          "Namba ya simu ya malipo si sahihi. Tafadhali hakikisha umeweka namba sahihi ya Tanzania, mfano 0758078629, kisha ujaribu tena."
        );
      }

      // ==========================================
      // SALIO HALITOSHI
      // ==========================================

      if (
        /insufficient\s+funds/i.test(message)
      ) {
        throw new Error(
          "Salio kwenye akaunti yako ya malipo halitoshi. Tafadhali weka fedha kisha ujaribu tena. Ukihitaji msaada wasiliana nasi kwa 0758078629."
        );
      }

      // ==========================================
      // NETWORK / CONNECTION ERROR
      // ==========================================

      if (
        error.code === "ECONNABORTED" ||
        error.code === "ECONNREFUSED" ||
        error.code === "ENOTFOUND" ||
        error.code === "ETIMEDOUT"
      ) {
        throw new Error(
          "Huduma ya malipo haipatikani kwa sasa. Tafadhali jaribu tena baada ya muda. Tatizo likiendelea wasiliana nasi kwa 0758078629."
        );
      }

      // ==========================================
      // ERROR NYINGINE
      // ==========================================

      throw new Error(
        message ||
        "Malipo yameshindwa. Tafadhali jaribu tena. Kwa msaada zaidi wasiliana nasi kwa namba 0758078629."
      );
    }
  }

}

module.exports = new ClickPesaService();
