const mailer = require("nodemailer");

function generateSixRandomNumbers() {
    let numbers = "";
    for (let i = 0; i < 6; i++) {
        const randomNumber = Math.floor(Math.random() * 9) + 1;
        numbers += randomNumber;
    }
    return numbers;
}
const expiryDate = () => {
    const today = new Date();
    const date = today.getDate();
    const codeDate = new Date(today.setDate(date + 1));
    return codeDate;
};

function verifyMessage(code) {
    return (content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You and I verification code</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        h3 {
            font-size: 2rem;
            font-weight: lighter;
        }
        p {
            font-size: 16.5px;
        }
    </style>
</head>
<body>
    <h3>You and I</h3>
    <p>Your verification code:
    <h2>${code}</h2>
    </p>
    <p>this code expires in the next 24 hours</p>
    <p>If you did not request for verification you can ignore this message</p>
    <p>Thanks <br> The You and I Team</p>
</body>
</html>`);
}

function sendEmailCode(receiver, code) {
    const pass = process.env.GMAIL_PASS;
    const sender = process.env.GMAIL_CLIENT;
    if (!receiver || !verifyMessage || !code) {
        return;
    }
    let mailTransporter = mailer.createTransport({
        service: "gmail",
        auth: {
            user: sender,
            pass: pass,
        },
    });

    let mailDetails = {
        from: sender,
        to: receiver,
        subject: `Verification Code:${code} from You and I`,
        html: verifyMessage(code),
    };

    mailTransporter.sendMail(mailDetails, function (err, data) {
        return data;
    });
}
module.exports = {
    generateSixRandomNumbers,
    expiryDate,
    sendEmailCode,
};
