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
// SAFISHA NAMBA
//
// Mfano wa format zinazokubalika:
//
// 0712345678
// +255712345678
// 255712345678
// 712345678
//
// Tunaondoa spaces, +, -, (), na alama nyingine
// ==========================================

phone = String(phone)
  .trim()
  .replace(/\D/g, "");

// ==========================================
// FORMAT:
//
// 0712345678
// kwenda
// 255712345678
// ==========================================

if (
  phone.length === 10 &&
  phone.startsWith("0")
) {
  phone = "255" + phone.slice(1);
}

// ==========================================
// FORMAT:
//
// 712345678
// kwenda
// 255712345678
// ==========================================

if (
  phone.length === 9 &&
  phone.startsWith("7")
) {
  phone = "255" + phone;
}

// ==========================================
// HAKIKISHA FORMAT YA MWISHO
//
// Tanzania:
// 255 + digits 9
//
// Mfano:
// 255712345678
// ==========================================

if (
  !phone.startsWith("255") ||
  phone.length !== 12
) {
  throw new Error(
    "Namba ya simu si sahihi. Tafadhali tumia namba halali ya Tanzania, mfano 0712345678."
  );
}

// ==========================================
// RUDISHA NAMBA KATIKA FORMAT YA NDANI
//
// 255712345678
// ->
// 0712345678
// ==========================================

const localPhone =
  "0" + phone.slice(3);

// ==========================================
// CHUKUA PREFIX
//
// Mfano:
//
// 0712345678 -> 071
// 0682345678 -> 068
// ==========================================

const prefix =
  localPhone.slice(0, 3);

// ==========================================
// PREFIX HALALI ZA SIMU ZA TANZANIA
//
// 061 - Mobile range
// 062 - Mobile range
// 064 - Mobile range
// 065 - Mobile range
// 066 - Mobile range
// 067 - Mobile range
//
// 068 - Airtel
// 069 - Airtel
//
// 071 - Yas / mobile range
// 072 - Mobile range
// 073 - Mobile range
// 074 - Vodacom
// 075 - Vodacom
// 076 - Vodacom
// 077 - Mobile range
//
// 078 - Airtel
// 079 - Vodacom
//
// Prefix ambazo hazipo hapa
// zitakataliwa kabla ya kwenda ClickPesa.
// ==========================================

const validPrefixes = [
  "061",
  "062",
  "064",
  "065",
  "066",
  "067",
  "068",
  "069",
  "071",
  "072",
  "073",
  "074",
  "075",
  "076",
  "077",
  "078",
  "079"
];

// ==========================================
// KATAA PREFIX ISIYO HALALI
// ==========================================

if (
  !validPrefixes.includes(prefix)
) {
  throw new Error(
    "Namba ya simu si sahihi. Tafadhali tumia namba halali ya simu ya Tanzania."
  );
}

// ==========================================
// TAMBULISHA MTANDAO KWA AJILI YA LOG TU
//
// HII HAIATHIRI MALIPO.
// ==========================================

let network = "Mtandao wa simu";

if (
  [
    "068",
    "069",
    "078"
  ].includes(prefix)
) {
  network = "Airtel";
}

else if (
  [
    "074",
    "075",
    "076",
    "079"
  ].includes(prefix)
) {
  network = "Vodacom";
}

else if (
  [
    "071",
    "077"
  ].includes(prefix)
) {
  network = "Yas / Mtandao wa simu";
}

try {

  const token =
    await clickpesaAuth.getToken();

  const url =
    `${process.env.CLICKPESA_BASE_URL}/third-parties/payments/initiate-ussd-push-request`;

  const amountStr =
    String(amount);

  // ==========================================
  // LOG YA PAYMENT REQUEST
  //
  // HII NI KWA SERVER TU
  // HAIATHIRI MALIPO
  // ==========================================

  console.log(
    "========== CLICKPESA PAYMENT REQUEST =========="
  );

  console.log({
    reference,
    phone,
    localPhone,
    prefix,
    network,
    amount: amountStr
  });

  console.log(
    "==============================================="
  );

  const response =
    await axiosClient.post(
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
      localPhone,
      prefix,
      network,
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
  // CHUKUA UJUMBE WA KOSA
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
      "Namba ya simu si sahihi au haiwezi kupokea ombi la malipo. Tafadhali hakikisha namba ya simu ni sahihi kisha ujaribu tena."
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
