import nodemailer from "nodemailer";
import {Options} from "nodemailer/lib/mailer";

export const sendVerificationEmail = async (email:string, name:string, verifyCode:string) => {
    try{
        const transporter = nodemailer.createTransport({
            service:'gmail',
            auth:{
                user:process.env.GMAIL_USER,
                pass:process.env.GMAIL_USER_PASS
            }
        })

        const mailOptions = {
            from:process.env.GMAIL_USER,
            to:email,
            subject:'Verify yourself on Camly.',
            html:`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your OTP Code</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background-color: #e3f2fd; font-family: 'Montserrat', Arial, sans-serif; }
        table { border-collapse: collapse; width: 100%; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0px 10px 25px rgba(0, 0, 0, 0.2); position: relative; animation: fadeIn 1.5s ease-in-out; }
        .header { background: linear-gradient(135deg, #0077b6, #0096c7); padding: 40px; text-align: center; color: white; position: relative; }
        .header img { max-width: 150px; margin-bottom: 10px; animation: slideIn 1s ease-in-out; }
        .header h1 { font-size: 26px; margin: 10px 0; }
        .wave-animation {
            position: absolute;
            width: 100%;
            height: 20px;
            bottom: 0;
            left: 0;
            background: url('https://media.istockphoto.com/id/518957416/vector/round-lines-pattern-gray-light.jpg?s=1024x1024&w=is&k=20&c=pWjdV4TW-aSuJmFvlui58fbhnaWpbh0g14kL75NEXeU=') repeat-x;
            animation: waveMove 4s linear infinite;
        }
        .content { padding: 40px; text-align: center; animation: fadeInUp 1s ease-in-out; }
        .otp-box { background: #dff6ff; padding: 20px; border-radius: 12px; border: 3px solid #0096c7; display: inline-block; margin: 20px 0; font-size: 32px; font-weight: 700; color: #0077b6; letter-spacing: 3px; box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.1); animation: pulse 1.5s infinite alternate; }
        .button { display: inline-block; padding: 14px 30px; background: #0077b6; color: white; text-decoration: none; font-size: 18px; font-weight: 600; border-radius: 8px; margin-top: 20px; transition: 0.3s ease-in-out; box-shadow: 0px 5px 10px rgba(0, 0, 0, 0.2); animation: bounceIn 1s ease-in-out; }
        .button:hover { background: #005f99; transform: translateY(-3px); }
        .footer { background: #222; color: #fff; padding: 25px; text-align: center; font-size: 12px; border-radius: 0 0 12px 12px; }
        .footer a { color: #00bbf0; text-decoration: none; font-weight: 600; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0% { transform: scale(1); } 100% { transform: scale(1.05); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-50px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes bounceIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes waveMove { from { background-position: 0 0; } to { background-position: -200px 0; } }
        @media (max-width: 660px) {
            .content { padding: 20px; }
            .otp-box { font-size: 26px; padding: 15px; }
            .button { padding: 12px 24px; font-size: 16px; }
        }
    </style>
</head>
<body>
    <table class="container">
        <tr>
            <td class="header">
                <img src="https://via.placeholder.com/150x50?text=Logo" alt="Company Logo">
                <h1>Your One-Time Password</h1>
                <div class="wave-animation"></div>
            </td>
        </tr>
        <tr>
            <td class="content">
                <p>Hello, ${name}</p>
                <p>Use the following OTP to complete your login. This code is valid for <strong>10 minutes</strong>.</p>
                <div class="otp-box">${verifyCode}</div>
                <p>If you didn't request this, please ignore this email or contact support.</p>
                <a href="#" class="button">Verify Now</a>
            </td>
        </tr>
        <tr>
            <td class="footer">
                © 2025 Camly. All rights reserved. <br>
                <a href="#">Privacy Policy</a> | <a href="#">Contact Support</a>
            </td>
        </tr>
    </table>
</body>
</html>
`
        }

        await transporter.sendMail(mailOptions as Options);
        return {success:true, message:"Verification email has been sent"};
    }catch(err){
        return {success:false, message:"Error in sending verification email"};
    }
}