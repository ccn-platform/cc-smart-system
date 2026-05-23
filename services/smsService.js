 const AfricasTalking = require("africastalking");

if (
  !process.env.AT_API_KEY ||
  !process.env.AT_USERNAME
) {
  throw new Error(
    "Africa's Talking credentials missing"
  );
}

const africastalking =
  AfricasTalking({
    apiKey:
      process.env.AT_API_KEY,
    username:
      process.env.AT_USERNAME,
  });

const sms =
  africastalking.SMS;

const sendSMS =
  async (
    phone,
    message
  ) => {
    try {
      const formattedPhone =
        phone.startsWith("+")
          ? phone
          : "+" + phone;

      const options = {
        to: [
          formattedPhone
        ],
        message,
        from: "CCN"
      };

      const response =
        await sms.send(
          options
        );

      console.log(
        "SMS sent:",
        response
      );

      return {
        success: true,
        data: response
      };

    } catch (error) {
      console.error(
        "SMS failed:",
        error
      );

      return {
        success: false,
        error:
          error.message
      };
    }
  };

const sendOTP =
  async (
    phone,
    otp
  ) => {
    const message =
      `CCN: Code yako ya kurekebisha PIN ni ${otp}. Itatumika kwa dakika 5.`;

    return await sendSMS(
      phone,
      message
    );
  };

module.exports = {
  sendSMS,
  sendOTP
};
